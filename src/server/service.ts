import { createHash } from 'node:crypto';
import type { Activity, Analysis, Business, Evidence, Job, Lead, SearchFilters, SearchResult, SearchTask, User } from '../lib/contracts.ts';
import { PROVINCES, STAGES, getCountryByCode, isLikelyWhatsApp, getPlanMaxLeads } from '../lib/contracts.ts';
import { db, id, now, transaction } from './db.ts';
import { analyse, fetchDataset, mode, normalize, validPhone } from './providers.ts';
import { AppError, audit, credits, hash, supabaseConfigured, supabaseAdmin } from './auth.ts';
import { CURATED_BUSINESSES, dynamicGatherBusinesses, ensureRealBusinessesSeeded, sweepRealBusinesses } from './real-businesses.ts';

type Row=Record<string,string|number|null>;

export function matchTextFlexible(target: string, query: string): boolean {
 if (!query || !query.trim()) return true;
 const targetNorm = normalize(target);
 const queryNorm = normalize(query.trim());
 if (targetNorm.includes(queryNorm)) return true;

 const queryWords = queryNorm.split(/[\s,]+/).filter(w => w.length >= 2);
 if (queryWords.length === 0) return true;

 return queryWords.some(word => {
  if (targetNorm.includes(word)) return true;
  if (word.endsWith('s') && word.length > 3 && targetNorm.includes(word.slice(0, -1))) return true;
  const stem = word.length > 5 ? word.slice(0, word.length - 2) : word.slice(0, word.length - 1);
  if (stem.length >= 3 && targetNorm.includes(stem)) return true;
  return false;
 });
}

export function businessMatchesFilter(b: Business, filters: SearchFilters): boolean {
 if (filters.phone === 'with_phone' && !b.phone) return false;
 if (filters.phone === 'without_phone' && b.phone) return false;
 if (filters.phone === 'with_whatsapp' && (!b.phone || !isLikelyWhatsApp(b.phone, filters.country || b.country || 'MZ'))) return false;
 if (filters.phone === 'without_whatsapp' && (b.phone && isLikelyWhatsApp(b.phone, filters.country || b.country || 'MZ'))) return false;
 if (filters.website === 'without_website' && b.website) return false;
 if (filters.website === 'with_website' && !b.website) return false;
 if (filters.instagram === 'with_instagram' && !b.instagram) return false;
 if (filters.instagram === 'without_instagram' && b.instagram) return false;

 if (filters.country && b.country && b.country !== filters.country) return false;
 if (filters.province && normalize(b.province) !== normalize(filters.province)) return false;
 if (filters.category && b.category !== filters.category) return false;
 if (filters.locality && !normalize(b.locality).includes(normalize(filters.locality))) return false;

 if (filters.cities && filters.cities.trim()) {
  const cityTokens = filters.cities.split(',').map(c => normalize(c.trim())).filter(Boolean);
  if (cityTokens.length > 0) {
   const locationText = normalize(`${b.locality} ${b.province}`);
   const matchesAnyCity = cityTokens.some(city => locationText.includes(city) || city.includes(normalize(b.locality)));
   if (!matchesAnyCity) return false;
  }
 }

 if (filters.niche && filters.niche.trim()) {
  const searchable = `${b.name} ${b.category} ${b.description || ''} ${b.locality} ${b.province}`;
  if (!matchTextFlexible(searchable, filters.niche)) return false;
 }

 return true;
}

export function getBusiness(businessId:string,user?:User):Business {
 let row=db().prepare('SELECT data,source_key FROM businesses WHERE id=?').get(businessId) as {data:string;source_key:string}|undefined;
 if(!row) {
  ensureRealBusinessesSeeded();
  row=db().prepare('SELECT data,source_key FROM businesses WHERE id=?').get(businessId) as {data:string;source_key:string}|undefined;
 }
 if(!row) throw new AppError('Empresa não encontrada.',404);
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
export async function syncLeadsFromSupabase(user: User): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    const localCount = db().prepare('SELECT count(*) as c FROM leads WHERE workspace_id=?').get(user.workspaceId) as { c: number } | undefined;
    if (localCount && localCount.c > 0) return;

    const client = supabaseAdmin();
    if (!client) return;
    const { data, error } = await client.from('leads').select('*, businesses(*)').eq('workspace_id', user.workspaceId);
    if (error || !data || !Array.isArray(data)) return;

    for (const item of data) {
      if (item.businesses && item.businesses.data) {
        const bizData = item.businesses.data;
        const bizId = item.businesses.source_id || item.businesses.id;
        db().prepare('INSERT OR IGNORE INTO businesses VALUES(?,?,?,?)').run(bizId, JSON.stringify(bizData), 'live', now());
        db().prepare('INSERT OR IGNORE INTO leads(id,workspace_id,business_id,stage,note,next_action,next_action_at,amount_minor,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
          .run(item.id, user.workspaceId, bizId, item.stage || 'Novo', item.note || '', item.next_action || '', item.next_action_at || null, item.amount_minor || null, item.created_at || now());
      }
    }
  } catch (err) {
    console.warn('[syncLeadsFromSupabase error]:', err);
  }
}

export function saveLead(user:User,businessId:string) {
  const biz = getBusiness(businessId,user);
  const saved = transaction(()=>{
    const existing=db().prepare('SELECT id FROM leads WHERE workspace_id=? AND business_id=?').get(user.workspaceId,businessId);
    if(!existing){const leadId=id();db().prepare('INSERT INTO leads(id,workspace_id,business_id,created_at) VALUES(?,?,?,?)').run(leadId,user.workspaceId,businessId,now());activity(user,leadId,'saved','Empresa guardada nas oportunidades.');}
    return listLeads(user).find(l=>l.businessId===businessId)!;
  });

  // Sync to Supabase in background
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        const bHash = createHash('md5').update(businessId).digest('hex');
        const bUuid = `${bHash.slice(0,8)}-${bHash.slice(8,12)}-4${bHash.slice(13,16)}-a${bHash.slice(17,20)}-${bHash.slice(20,32)}`;
        const lHash = createHash('md5').update(saved.id).digest('hex');
        const lUuid = `${lHash.slice(0,8)}-${lHash.slice(8,12)}-4${lHash.slice(13,16)}-a${lHash.slice(17,20)}-${lHash.slice(20,32)}`;

        Promise.resolve(client.from('businesses').upsert({
          id: bUuid,
          source_key: biz.source || 'prospecta',
          source_id: businessId,
          data: biz,
          observed_at: biz.observedAt || new Date().toISOString()
        }, { onConflict: 'id' })).then(() => {
          return Promise.resolve(client.from('leads').upsert({
            id: lUuid,
            workspace_id: user.workspaceId,
            business_id: bUuid,
            stage: saved.stage || 'Novo',
            note: saved.note || '',
            next_action: saved.nextAction || '',
            currency: 'MZN'
          }, { onConflict: 'id' }));
        }).catch((err: unknown) => console.warn('[Supabase lead sync warning]:', err));
      }
    } catch {}
  }

  return saved;
}
export function startSearch(user:User,filters:SearchFilters):SearchResult {
 const country = filters.country || 'MZ';
 const provincesList = filters.province ? [filters.province] : (country === 'MZ' ? [...PROVINCES] : getCountryByCode(country).provinces.slice(0, 8));
 const tasks:SearchTask[]=provincesList.map(province=>({province,status:'queued',count:0}));
 const searchId=id();const timestamp=now();
 transaction(()=>{
  db().prepare('INSERT INTO searches VALUES(?,?,?,?,?,?,?,?,?)').run(searchId,user.workspaceId,JSON.stringify(filters),JSON.stringify(tasks),'[]','queued',mode(),timestamp,timestamp);
 });
 setTimeout(()=>{
  const r=db().prepare("SELECT * FROM searches WHERE id=?").get(searchId) as Row|undefined;
  if(r && ['queued','running'].includes(String(r.status))) {
   processSearch(r).catch(()=>{});
  }
 }, 10);
 return readSearch(user,searchId);
}
export async function startSearchAsync(user:User,filters:SearchFilters):Promise<SearchResult> {
 const country = filters.country || 'MZ';
 const provincesList = filters.province ? [filters.province] : (country === 'MZ' ? [...PROVINCES] : getCountryByCode(country).provinces.slice(0, 8));
 const tasks:SearchTask[]=provincesList.map(province=>({province,status:'queued',count:0}));
 const searchId=id();const timestamp=now();
 transaction(()=>{
  db().prepare('INSERT INTO searches VALUES(?,?,?,?,?,?,?,?,?)').run(searchId,user.workspaceId,JSON.stringify(filters),JSON.stringify(tasks),'[]','queued',mode(),timestamp,timestamp);
 });
 const r=db().prepare("SELECT * FROM searches WHERE id=?").get(searchId) as Row|undefined;
 if(r && ['queued','running'].includes(String(r.status))) {
  try {
   await processSearch(r);
  } catch (err) {
   console.error('[startSearchAsync] processSearch failed:', err);
  }
 }
 return readSearch(user,searchId);
}
export function readSearch(user:User,searchId:string,page=1):SearchResult {
 const row=db().prepare('SELECT * FROM searches WHERE workspace_id=? AND id=?').get(user.workspaceId,searchId) as Row|undefined;
 if(!row) throw new AppError('Pesquisa não encontrada.',404);
 const ids=JSON.parse(String(row.results)) as string[];
 const allBiz: Business[] = [];
 const seenBizNames = new Set<string>();
 for (const b of ids) {
  try {
   const biz = getBusiness(b, user);
   if (!biz || !biz.name) continue;
   const key = normalize(biz.name).toLowerCase().replace(/[^a-z0-9]/g, '');
   if (seenBizNames.has(key)) continue;
   seenBizNames.add(key);
   allBiz.push(biz);
  } catch {}
 }
 const maxAllowed = getPlanMaxLeads(user);
 const boundedBiz = allBiz.slice(0, maxAllowed);
 const pages=Math.max(1,Math.ceil(boundedBiz.length/8));
 const safePage=Math.min(Math.max(1,page),pages);
 const results = boundedBiz.slice((safePage-1)*8, safePage*8);
 return {
  id:searchId,
  status:row.status as SearchResult['status'],
  filters:JSON.parse(String(row.filters)),
  tasks:JSON.parse(String(row.tasks)),
  results,
  allResults: boundedBiz,
  total:boundedBiz.length,
  page:safePage,
  pages,
  createdAt:String(row.created_at),
  mode:row.mode as SearchResult['mode']
 };
}
export function listSearches(user:User):SearchResult[] {
 const rows=db().prepare('SELECT * FROM searches WHERE workspace_id=? ORDER BY created_at DESC LIMIT 12').all(user.workspaceId) as Row[];
 return rows.map(row=>{
  const ids=JSON.parse(String(row.results||'[]')) as string[];
  const sampleBiz: Business[] = [];
  for (const b of ids.slice(0, 8)) {
    try {
      const biz = getBusiness(b, user);
      if (biz && biz.name) sampleBiz.push(biz);
    } catch {}
  }
  const pages=Math.max(1,Math.ceil(ids.length/8));
  return {
   id:String(row.id),
   status:row.status as SearchResult['status'],
   filters:JSON.parse(String(row.filters)),
   tasks:JSON.parse(String(row.tasks||'[]')),
   results:sampleBiz,
   total:ids.length,
   page:1,
   pages,
   createdAt:String(row.created_at),
   mode:row.mode as SearchResult['mode']
  };
 });
}
export async function syncSearchesFromSupabase(user: User): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    const localCount = db().prepare('SELECT count(*) as c FROM searches WHERE workspace_id=?').get(user.workspaceId) as { c: number } | undefined;
    if (localCount && localCount.c > 0) return;

    const client = supabaseAdmin();
    if (!client) return;
    const { data, error } = await client.from('searches').select('*').eq('workspace_id', user.workspaceId).order('created_at', { ascending: false }).limit(10);
    if (error || !data || !Array.isArray(data)) return;

    for (const item of data) {
      const filters = item.filters || {};
      const results = filters._cached_biz_ids || [];
      db().prepare('INSERT OR IGNORE INTO searches(id,workspace_id,filters,tasks,results,status,mode,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
        .run(item.id, user.workspaceId, JSON.stringify(filters), JSON.stringify(item.tasks || []), JSON.stringify(results), item.status || 'succeeded', 'live', item.created_at || now(), item.created_at || now());
    }
  } catch (err) {
    console.warn('[syncSearchesFromSupabase error]:', err);
  }
}
export function getAnalysis(user:User,businessId:string) {
 const row=db().prepare('SELECT * FROM analyses WHERE workspace_id=? AND business_id=? ORDER BY created_at DESC LIMIT 1').get(user.workspaceId,businessId) as Row|undefined;
 return row?{...JSON.parse(String(row.data)),id:row.id,businessId:row.business_id,draftMessage:row.draft,createdAt:row.created_at} as Analysis:null;
}
export function requestAnalysis(user:User,businessId:string,tone:string,service:string,key:string,fresh=false,businessData?:Business,length:'curta'|'media'|'longa'='media',customInstructions=''):Job {
 if (businessData && businessData.id) {
  try {
   db().prepare('INSERT OR REPLACE INTO businesses VALUES(?,?,?,?)').run(businessData.id, JSON.stringify(businessData), 'live', now());
  } catch {}
 }
 const business=getBusiness(businessId,user);if(business.suppressed) throw new AppError('Este contacto está marcado para não contactar.',409);
 const payload={businessId,tone,service:service||user.profile.service,name:user.name,profile:user.profile,evidence:business.evidence,length,customInstructions};
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
export async function requestAnalysisAsync(user:User,businessId:string,tone:string,service:string,key:string,fresh=false,businessData?:Business,length:'curta'|'media'|'longa'='media',customInstructions=''):Promise<Job> {
 const initial = requestAnalysis(user, businessId, tone, service, key, fresh, businessData, length, customInstructions);
 if (initial.status === 'succeeded' || initial.status === 'failed') {
   return initial;
 }
 const claimed = transaction(() => {
   const timestamp = now();
   const next = db().prepare("SELECT * FROM jobs WHERE id=?").get(initial.id) as Row | undefined;
   if (next && ['queued', 'running'].includes(String(next.status))) {
     db().prepare("UPDATE jobs SET status='running',attempts=attempts+1,lease_until=?,updated_at=? WHERE id=?")
       .run(new Date(Date.now() + 60000).toISOString(), timestamp, initial.id);
     return db().prepare("SELECT * FROM jobs WHERE id=?").get(initial.id) as Row | undefined;
   }
   return next;
 });
 if (claimed && claimed.status === 'running') {
   try {
     await processAnalysis(claimed);
   } catch (err) {
     console.error('[requestAnalysisAsync error]:', err);
   }
   const check = db().prepare("SELECT * FROM jobs WHERE id=?").get(initial.id) as Row | undefined;
   if (check && check.status === 'queued') {
     const retryClaim = transaction(() => {
       db().prepare("UPDATE jobs SET status='running',attempts=attempts+1,lease_until=?,updated_at=? WHERE id=?")
         .run(new Date(Date.now() + 60000).toISOString(), now(), initial.id);
       return db().prepare("SELECT * FROM jobs WHERE id=?").get(initial.id) as Row | undefined;
     });
     if (retryClaim) {
       try { await processAnalysis(retryClaim); } catch {}
     }
   }
 }
 return readJob(user, initial.id);
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
  if(row.mode==='live') {
   ensureRealBusinessesSeeded();
  }
  if(row.mode==='live' && process.env.APIFY_TOKEN) {
   const imported=await fetchDataset();
   transaction(()=>{for(const b of imported){if(!PROVINCES.includes(b.province as typeof PROVINCES[number]))continue;db().prepare('INSERT INTO businesses VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(b.id,JSON.stringify(b),'authorized-dataset',now());}});
  }
  const deduplicateBiz = (list: Business[]): Business[] => {
    const seen = new Set<string>();
    const out: Business[] = [];
    for (const b of list) {
      if (!b || !b.name) continue;
      const k = normalize(b.name).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(b);
    }
    return out;
  };

  let sourceRows=db().prepare(row.mode==='live'?"SELECT data FROM businesses WHERE source_key='live'":"SELECT data FROM businesses WHERE source_key='demo'").all() as {data:string}[];
  businesses = deduplicateBiz(sourceRows.map(b=>JSON.parse(b.data)));

  if(row.mode==='live') {
   if(filters.niche || filters.cities || (filters.country && filters.country !== 'MZ')) {
    try {
     await sweepRealBusinesses(filters.niche || '', filters.cities || '', filters.country || 'MZ', filters.province || '');
     const liveRows=db().prepare("SELECT data FROM businesses WHERE source_key<>'demo' AND id NOT LIKE 'b-%'").all() as {data:string}[];
     if (liveRows.length > 0) {
      sourceRows = liveRows;
      businesses = deduplicateBiz(sourceRows.map(b=>JSON.parse(b.data)));
     }
    } catch {
     // Gracefully keep existing businesses
    }
   }
  } else {
   if(filters.niche || filters.cities || (filters.country && filters.country !== 'MZ')) {
    const matches=businesses.filter(b=>businessMatchesFilter(b,filters));
    if(matches.length<2) {
     try {
      await sweepRealBusinesses(filters.niche || '', filters.cities || '', filters.country || 'MZ', filters.province || '');
      sourceRows=db().prepare("SELECT data FROM businesses").all() as {data:string}[];
      businesses = deduplicateBiz(sourceRows.map(b=>JSON.parse(b.data)));
     } catch {}
    }
   }
  }
 } catch(error) {
  tasks.forEach(t=>{t.status='failed';t.error=error instanceof Error?error.message:'Falha da fonte';});
  db().prepare('UPDATE searches SET tasks=?,status=?,updated_at=? WHERE id=?').run(JSON.stringify(tasks),'failed',now(),row.id);return;
 }
 const matched:string[][]=[];let budget=filters.budget||11;
 for(const task of tasks) {
  if(budget--<=0){task.status='limited';matched.push([]);continue;}
  const results=businesses.filter(b=>(!task.province || task.province === 'Todos' || b.province===task.province) && businessMatchesFilter(b,filters));
  task.status='succeeded';task.count=results.length;matched.push(results.map(b=>b.id));
 }
 const seenOrderNames = new Set<string>();
 const ordered:string[]=[];
 for(let i=0;i<Math.max(0,...matched.map(g=>g.length));i++) {
   for(const group of matched) {
     const id = group[i];
     if (!id) continue;
     const b = businesses.find(x => x.id === id);
     if (!b) continue;
     const k = normalize(b.name).toLowerCase().replace(/[^a-z0-9]/g, '');
     if (seenOrderNames.has(k)) continue;
     seenOrderNames.add(k);
     ordered.push(id);
   }
 }
 const status=tasks.some(t=>t.status==='limited' || t.status==='failed')?'partial':'succeeded';
 const finalIds = [...new Set(ordered)];
 db().prepare('UPDATE searches SET results=?,tasks=?,status=?,updated_at=? WHERE id=?').run(JSON.stringify(finalIds),JSON.stringify(tasks),status,now(),row.id);

 if (supabaseConfigured()) {
   try {
     const client = supabaseAdmin();
     if (client && row.workspace_id) {
       const sHash = createHash('md5').update(String(row.id)).digest('hex');
       const sUuid = `${sHash.slice(0, 8)}-${sHash.slice(8, 12)}-4${sHash.slice(13, 16)}-a${sHash.slice(17, 20)}-${sHash.slice(20, 32)}`;
       const filters = JSON.parse(String(row.filters || '{}'));
       filters._cached_biz_ids = finalIds;
       Promise.resolve(client.from('searches').upsert({
         id: sUuid,
         workspace_id: row.workspace_id,
         filters,
         tasks,
         status
       }, { onConflict: 'id' })).catch(() => {});
     }
   } catch {}
 }
}
async function processAnalysis(job:Row) {
 const payload=JSON.parse(String(job.payload));
 try {
  if(db().prepare('SELECT business_id FROM suppressions WHERE workspace_id=? AND business_id=?').get(job.workspace_id,payload.businessId))throw new Error('Contacto marcado para não contactar.');
  const result=await analyse(getBusiness(payload.businessId),payload.profile,payload.name,payload.tone,payload.service,payload.length||'media',payload.customInstructions||'');
  transaction(()=>{
   const current=db().prepare('SELECT status,attempts FROM jobs WHERE id=?').get(job.id) as {status:string;attempts:number};
   if(!current || current.status!=='running')return;
   const timestamp=now();const analysis={...result,id:id(),businessId:payload.businessId,createdAt:timestamp};
   db().prepare('INSERT INTO analyses VALUES(?,?,?,?,?,?,?,?)').run(analysis.id,job.workspace_id,payload.businessId,job.id,job.payload_hash,JSON.stringify(analysis),analysis.draftMessage,timestamp);
   db().prepare('INSERT OR IGNORE INTO credit_entries VALUES(?,?,?,?,?,?,?)').run(id(),job.workspace_id,job.id,'consume',1,'Análise de oportunidade concluída',timestamp);
   db().prepare("UPDATE jobs SET status='succeeded',result=?,lease_until=NULL,updated_at=? WHERE id=?").run(JSON.stringify(analysis),timestamp,job.id);
  });
 } catch(error) {
  transaction(()=>{
   const current=db().prepare('SELECT status,attempts FROM jobs WHERE id=?').get(job.id) as {status:string;attempts:number}|undefined;if(!current || current.status!=='running')return;
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
