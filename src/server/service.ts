import type { Activity, Analysis, Business, Job, Lead, SearchFilters, SearchResult, SearchTask, User } from '../lib/contracts.ts';
import { PROVINCES, STAGES } from '../lib/contracts.ts';
import { db, id, now, transaction } from './db.ts';
import { analyse, fetchDataset, mode, normalize } from './providers.ts';
import { AppError, audit, credits, hash } from './auth.ts';

type Row=Record<string,string|number|null>;
export function getBusiness(businessId:string,user?:User):Business {
 const row=db().prepare('SELECT data,source_key FROM businesses WHERE id=?').get(businessId) as {data:string;source_key:string}|undefined;
 if(!row || (mode()==='live' && row.source_key==='demo')) throw new AppError('Empresa não encontrada.',404);
 const business=JSON.parse(row.data) as Business;
 if(user) {
  business.saved=!!db().prepare('SELECT id FROM leads WHERE workspace_id=? AND business_id=?').get(user.workspaceId,businessId);
  business.suppressed=!!db().prepare('SELECT business_id FROM suppressions WHERE workspace_id=? AND business_id=?').get(user.workspaceId,businessId);
 }
 return business;
}
export function activity(user:User,leadId:string,type:string,note:string) {
 if(!db().prepare('SELECT id FROM leads WHERE workspace_id=? AND id=?').get(user.workspaceId,leadId)) throw new AppError('Oportunidade não encontrada.',404);
 db().prepare('INSERT INTO activities VALUES(?,?,?,?,?,?)').run(id(),user.workspaceId,leadId,type,note,now());
}
export function listLeads(user:User):Lead[] {
 const rows=db().prepare('SELECT * FROM leads WHERE workspace_id=? ORDER BY created_at DESC').all(user.workspaceId) as Row[];
 return rows.map(row=>({id:String(row.id),businessId:String(row.business_id),business:getBusiness(String(row.business_id),user),stage:row.stage as Lead['stage'],note:String(row.note),nextAction:String(row.next_action),nextActionAt:row.next_action_at as string|null,amountMinor:row.amount_minor as number|null,createdAt:String(row.created_at),activities:db().prepare('SELECT id,type,note,created_at as createdAt FROM activities WHERE workspace_id=? AND lead_id=? ORDER BY created_at DESC').all(user.workspaceId,row.id) as unknown as Activity[]}));
}
export function saveLead(user:User,businessId:string) {
 getBusiness(businessId,user);
 return transaction(()=>{
  const existing=db().prepare('SELECT id FROM leads WHERE workspace_id=? AND business_id=?').get(user.workspaceId,businessId);
  if(!existing){const leadId=id();db().prepare('INSERT INTO leads(id,workspace_id,business_id,created_at) VALUES(?,?,?,?)').run(leadId,user.workspaceId,businessId,now());activity(user,leadId,'saved','Empresa guardada nas oportunidades.');}
  return listLeads(user).find(l=>l.businessId===businessId)!;
 });
}
export function startSearch(user:User,filters:SearchFilters):SearchResult {
 const tasks:SearchTask[]=(filters.province? [filters.province]:[...PROVINCES]).map(province=>({province,status:'queued',count:0}));
 const searchId=id();const timestamp=now();
 transaction(()=>{
  db().prepare('INSERT INTO searches VALUES(?,?,?,?,?,?,?,?,?)').run(searchId,user.workspaceId,JSON.stringify(filters),JSON.stringify(tasks),'[]','queued',mode(),timestamp,timestamp);
 });
 return readSearch(user,searchId);
}
export function readSearch(user:User,searchId:string,page=1):SearchResult {
 const row=db().prepare('SELECT * FROM searches WHERE workspace_id=? AND id=?').get(user.workspaceId,searchId) as Row|undefined;
 if(!row) throw new AppError('Pesquisa não encontrada.',404);
 const ids=JSON.parse(String(row.results)) as string[];const pages=Math.max(1,Math.ceil(ids.length/8));const safePage=Math.min(Math.max(1,page),pages);
 return {id:searchId,status:row.status as SearchResult['status'],filters:JSON.parse(String(row.filters)),tasks:JSON.parse(String(row.tasks)),results:ids.slice((safePage-1)*8,safePage*8).map(b=>getBusiness(b,user)),total:ids.length,page:safePage,pages,createdAt:String(row.created_at),mode:row.mode as SearchResult['mode']};
}
export function getAnalysis(user:User,businessId:string) {
 const row=db().prepare('SELECT * FROM analyses WHERE workspace_id=? AND business_id=? ORDER BY created_at DESC LIMIT 1').get(user.workspaceId,businessId) as Row|undefined;
 return row?{...JSON.parse(String(row.data)),id:row.id,businessId:row.business_id,draftMessage:row.draft,createdAt:row.created_at} as Analysis:null;
}
export function requestAnalysis(user:User,businessId:string,tone:string,service:string,key:string,fresh=false):Job {
 const business=getBusiness(businessId,user);if(business.suppressed) throw new AppError('Este contacto está marcado para não contactar.',409);
 const payload={businessId,tone,service:service||user.profile.service,name:user.name,profile:user.profile,evidence:business.evidence};
 const payloadHash=hash(JSON.stringify(payload));
 return transaction(()=>{
  const previous=db().prepare("SELECT * FROM jobs WHERE workspace_id=? AND kind='analysis' AND idempotency_key=?").get(user.workspaceId,key) as Row|undefined;
  if(previous){if(previous.payload_hash!==payloadHash) throw new AppError('Esta chave já foi usada com dados diferentes.',409);return readJob(user,String(previous.id));}
  if(!fresh) {
   const duplicate=db().prepare("SELECT id FROM jobs WHERE workspace_id=? AND kind='analysis' AND payload_hash=? AND status IN ('queued','running','succeeded') ORDER BY created_at DESC LIMIT 1").get(user.workspaceId,payloadHash) as {id:string}|undefined;
   if(duplicate) return readJob(user,duplicate.id);
  }
  if(credits(user.workspaceId).available<1) throw new AppError('Créditos insuficientes. Cada nova análise custa 1 crédito.',402);
  const jobId=id();const timestamp=now();
  db().prepare('INSERT INTO jobs(id,workspace_id,kind,payload,payload_hash,idempotency_key,status,next_run_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(jobId,user.workspaceId,'analysis',JSON.stringify(payload),payloadHash,key,'queued',timestamp,timestamp,timestamp);
  db().prepare('INSERT INTO credit_entries VALUES(?,?,?,?,?,?,?)').run(id(),user.workspaceId,jobId,'reserve',1,'Reserva para análise de oportunidade',timestamp);
  return {id:jobId,status:'queued'};
 });
}
export function readJob(user:User,jobId:string):Job {
 const row=db().prepare('SELECT * FROM jobs WHERE id=? AND workspace_id=?').get(jobId,user.workspaceId) as Row|undefined;
 if(!row) throw new AppError('Tarefa não encontrada.',404);
 return {id:jobId,status:row.status as Job['status'],result:row.result?JSON.parse(String(row.result)):undefined,error:row.error?String(row.error):undefined};
}
export function cancelJob(user:User,jobId:string) {
 return transaction(()=>{
  const job=readJob(user,jobId);if(job.status==='succeeded' || job.status==='failed') throw new AppError('Esta tarefa já terminou.',409);
  db().prepare("UPDATE jobs SET status='cancelled',updated_at=? WHERE id=? AND workspace_id=?").run(now(),jobId,user.workspaceId);
  db().prepare('INSERT OR IGNORE INTO credit_entries VALUES(?,?,?,?,?,?,?)').run(id(),user.workspaceId,jobId,'release',1,'Reserva libertada por cancelamento',now());
  return readJob(user,jobId);
 });
}
export async function workerTick() {
 const search=db().prepare("SELECT * FROM searches WHERE status IN ('queued','running') ORDER BY created_at LIMIT 1").get() as Row|undefined;
 if(search) await processSearch(search);
 const job=transaction(()=>{
  const timestamp=now();
  db().prepare("UPDATE jobs SET status='queued',lease_until=NULL WHERE status='running' AND lease_until<?").run(timestamp);
  const next=db().prepare("SELECT * FROM jobs WHERE status='queued' AND next_run_at<=? ORDER BY created_at LIMIT 1").get(timestamp) as Row|undefined;
  if(next) db().prepare("UPDATE jobs SET status='running',attempts=attempts+1,lease_until=?,updated_at=? WHERE id=?").run(new Date(Date.now()+60000).toISOString(),timestamp,next.id);
  return next;
 });
 if(job) await processAnalysis(job);
 return !!search || !!job;
}
async function processSearch(row:Row) {
 const filters=JSON.parse(String(row.filters)) as SearchFilters;const tasks=JSON.parse(String(row.tasks)) as SearchTask[];
 let businesses:Business[]=[];
 try {
  if(row.mode==='live' && process.env.APIFY_TOKEN) {
   const imported=await fetchDataset();
   transaction(()=>{for(const b of imported){if(!PROVINCES.includes(b.province as typeof PROVINCES[number]))continue;db().prepare('INSERT INTO businesses VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(b.id,JSON.stringify(b),'authorized-dataset',now());}});
  }
  const sourceRows=db().prepare(row.mode==='live'?"SELECT data FROM businesses WHERE source_key<>'demo'":"SELECT data FROM businesses WHERE source_key='demo'").all() as {data:string}[];
  businesses=sourceRows.map(b=>JSON.parse(b.data));
 } catch(error) {
  tasks.forEach(t=>{t.status='failed';t.error=error instanceof Error?error.message:'Falha da fonte';});
  db().prepare('UPDATE searches SET tasks=?,status=?,updated_at=? WHERE id=?').run(JSON.stringify(tasks),'failed',now(),row.id);return;
 }
 const matched:string[][]=[];let budget=filters.budget||11;
 for(const task of tasks) {
  if(budget--<=0){task.status='limited';matched.push([]);continue;}
  const results=businesses.filter(b=>b.province===task.province && (!filters.locality||normalize(b.locality).includes(normalize(filters.locality))) && (!filters.category||b.category===filters.category));
  task.status='succeeded';task.count=results.length;matched.push(results.map(b=>b.id));
 }
 const ordered:string[]=[];for(let i=0;i<Math.max(0,...matched.map(g=>g.length));i++)for(const group of matched)if(group[i])ordered.push(group[i]);
 const status=tasks.some(t=>t.status==='limited' || t.status==='failed')?'partial':'succeeded';
 db().prepare('UPDATE searches SET results=?,tasks=?,status=?,updated_at=? WHERE id=?').run(JSON.stringify([...new Set(ordered)]),JSON.stringify(tasks),status,now(),row.id);
}
async function processAnalysis(job:Row) {
 const payload=JSON.parse(String(job.payload));
 try {
  if(db().prepare('SELECT business_id FROM suppressions WHERE workspace_id=? AND business_id=?').get(job.workspace_id,payload.businessId))throw new Error('Contacto marcado para não contactar.');
  const result=await analyse(getBusiness(payload.businessId),payload.profile,payload.name,payload.tone,payload.service);
  transaction(()=>{
   const current=db().prepare('SELECT status,attempts FROM jobs WHERE id=?').get(job.id) as {status:string;attempts:number};
   if(current.status!=='running' || current.attempts!==Number(job.attempts)+1)return;
   const timestamp=now();const analysis={...result,id:id(),businessId:payload.businessId,createdAt:timestamp};
   db().prepare('INSERT INTO analyses VALUES(?,?,?,?,?,?,?,?)').run(analysis.id,job.workspace_id,payload.businessId,job.id,job.payload_hash,JSON.stringify(analysis),analysis.draftMessage,timestamp);
   db().prepare('INSERT OR IGNORE INTO credit_entries VALUES(?,?,?,?,?,?,?)').run(id(),job.workspace_id,job.id,'consume',1,'Análise de oportunidade concluída',timestamp);
   db().prepare("UPDATE jobs SET status='succeeded',result=?,lease_until=NULL,updated_at=? WHERE id=?").run(JSON.stringify(analysis),timestamp,job.id);
  });
 } catch(error) {
  transaction(()=>{
   const current=db().prepare('SELECT status,attempts FROM jobs WHERE id=?').get(job.id) as {status:string;attempts:number};if(current.status!=='running' || current.attempts!==Number(job.attempts)+1)return;
   const message=error instanceof Error?error.message:'Não foi possível analisar esta empresa.';
   if(current.attempts<2)db().prepare("UPDATE jobs SET status='queued',error=?,next_run_at=?,lease_until=NULL,updated_at=? WHERE id=?").run(message,new Date(Date.now()+1500).toISOString(),now(),job.id);
   else {db().prepare("UPDATE jobs SET status='failed',error=?,lease_until=NULL,updated_at=? WHERE id=?").run(message,now(),job.id);db().prepare('INSERT OR IGNORE INTO credit_entries VALUES(?,?,?,?,?,?,?)').run(id(),job.workspace_id,job.id,'release',1,'Reserva libertada após falha da análise',now());}
  });
 }
}
export function dashboard(user:User) {
 const leads=listLeads(user);const today=new Date();today.setUTCHours(23,59,59,999);
 const tasks=leads.filter(l=>l.nextActionAt && new Date(l.nextActionAt)<=today && !['Ganho','Perdido'].includes(l.stage));
 return {leads:leads.length,due:tasks.length,proposalsMinor:leads.filter(l=>l.stage==='Proposta').reduce((sum,l)=>sum+(l.amountMinor||0),0),stages:STAGES.map(stage=>({stage,count:leads.filter(l=>l.stage===stage).length})),tasks,recent:leads.flatMap(l=>l.activities.map(a=>({...a,note:`${l.business.name}: ${a.note}`}))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8),credits:credits(user.workspaceId)};
}
export function grant(user:User,workspaceId:string,units:number,reason:string) {
 if(user.role!=='admin')throw new AppError('Acesso reservado à administração.',403);
 if(!db().prepare('SELECT id FROM workspaces WHERE id=?').get(workspaceId))throw new AppError('Espaço de trabalho não encontrado.',404);
 transaction(()=>{db().prepare('INSERT INTO credit_entries VALUES(?,?,?,?,?,?,?)').run(id(),workspaceId,null,'grant',units,reason,now());audit(user,'credits.grant',workspaceId);});
}
