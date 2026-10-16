import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { db, closeDb, id } from '../src/server/db.ts';
import { createUser, credits, checkPassword, passwordHash } from '../src/server/auth.ts';
import { cancelJob, dashboard, getAnalysis, getBusiness, listLeads, listSearches, readJob, readSearch, requestAnalysis, saveLead, startSearch, workerTick } from '../src/server/service.ts';
import { parseCsv } from '../src/server/import.ts';
import { analyse, validPhone } from '../src/server/providers.ts';
import { sweepRealBusinesses } from '../src/server/real-businesses.ts';
import { PROVINCES } from '../src/lib/contracts.ts';

process.env.PROSPECTA_MODE='demo';
process.env.PROSPECTA_DB_PATH=path.join(mkdtempSync(path.join(process.cwd(),'data-test-')),'test.sqlite');
test('password storage uses salts and verifies without plaintext',()=>{
 const a=passwordHash('a very long password');const b=passwordHash('a very long password');assert.notEqual(a,b);assert.ok(checkPassword('a very long password',a));assert.ok(!checkPassword('wrong',a));
});
test('nationwide discovery, transactional credits, tenant isolation and persistence',async()=>{
 const owner=createUser('Primeiro teste','first-'+id()+'@test.invalid','a very long password');
 const other=createUser('Outro teste','other-'+id()+'@test.invalid','a very long password');
 assert.equal(credits(owner.workspaceId).available,20);
 const search=startSearch(owner,{province:'',locality:'',category:'',service:'Criação de websites',budget:11});
 assert.throws(()=>readSearch(other,search.id),/não encontrada/);
 await workerTick();
 const found=readSearch(owner,search.id);assert.equal(found.total,44);assert.equal(found.tasks.length,11);assert.equal(found.pages,6);assert.equal(new Set(found.tasks.map(t=>t.province)).size,11);
 assert.deepEqual(found.tasks.map(t=>t.province),[...PROVINCES]);
 const firstPage=found.results.map(b=>b.id);assert.deepEqual(readSearch(owner,search.id).results.map(b=>b.id),firstPage);
 assert.ok(!readSearch(owner,search.id,2).results.some(b=>firstPage.includes(b.id)));
 const company=found.results[0];const saved=saveLead(owner,company.id);assert.equal(saveLead(owner,company.id).id,saved.id);assert.equal(listLeads(owner).length,1);assert.equal(listLeads(other).length,0);
 assert.throws(()=>db().prepare('INSERT INTO activities VALUES(?,?,?,?,?,?)').run(id(),other.workspaceId,saved.id,'note','cross-tenant',new Date().toISOString()),/FOREIGN KEY/);
 const job=requestAnalysis(owner,company.id,'Profissional','Criação de websites','test-key');
 assert.equal(credits(owner.workspaceId).available,19);assert.equal(credits(owner.workspaceId).reserved,1);
 assert.equal(requestAnalysis(owner,company.id,'Profissional','Criação de websites','test-key').id,job.id);
 assert.throws(()=>requestAnalysis(owner,company.id,'Amigável','Criação de websites','test-key'),/diferentes/);
 assert.throws(()=>readJob(other,job.id),/não encontrada/);
 await workerTick();assert.equal(readJob(owner,job.id).status,'succeeded');assert.equal(credits(owner.workspaceId).spent,1);assert.equal(credits(owner.workspaceId).reserved,0);
 assert.ok(getAnalysis(owner,company.id)?.draftMessage.includes('Primeiro teste'));assert.equal(getAnalysis(other,company.id),null);
 const reused=requestAnalysis(owner,company.id,'Profissional','Criação de websites','another-key');assert.equal(reused.id,job.id);assert.equal(credits(owner.workspaceId).available,19);
 const cancelled=requestAnalysis(owner,company.id,'Amigável','Criação de websites','cancel-key');cancelJob(owner,cancelled.id);assert.equal(credits(owner.workspaceId).available,19);cancelJob(owner,cancelled.id);assert.equal(credits(owner.workspaceId).available,19);
 const recovered=requestAnalysis(owner,company.id,'Consultivo','Criação de websites','recover-key');db().prepare("UPDATE jobs SET status='running',lease_until='2000-01-01T00:00:00Z' WHERE id=?").run(recovered.id);await workerTick();assert.equal(readJob(owner,recovered.id).status,'succeeded');assert.equal(credits(owner.workspaceId).spent,2);
 const limited=startSearch(owner,{province:'',locality:'',category:'',service:'',budget:2});await workerTick();assert.equal(readSearch(owner,limited.id).status,'partial');assert.equal(readSearch(owner,limited.id).tasks.filter(t=>t.status==='limited').length,9);
 const isolated=startSearch(owner,{province:'Maputo Cidade',locality:'',category:'',service:''});await workerTick();assert.ok(readSearch(owner,isolated.id).results.every(b=>b.province==='Maputo Cidade'));
 const rural=startSearch(owner,{province:'Zambézia',locality:'Mocuba',category:'',service:''});await workerTick();assert.equal(readSearch(owner,rural.id).total,2);
 const absent=startSearch(owner,{province:'Niassa',locality:'Localidade não disponível',category:'',service:''});await workerTick();assert.equal(readSearch(owner,absent.id).total,0);
 const exhausted=createUser('Saldo teste','balance-'+id()+'@test.invalid','a very long password');
 const accepted=await Promise.allSettled(Array.from({length:25},(_,i)=>Promise.resolve().then(()=>requestAnalysis(exhausted,company.id,'Profissional','Criação de websites','parallel-'+i,true))));
 assert.equal(accepted.filter(r=>r.status==='fulfilled').length,20);assert.equal(credits(exhausted.workspaceId).available,0);assert.equal(credits(exhausted.workspaceId).reserved,20);
 assert.equal(dashboard(owner).leads,1);
 closeDb();assert.equal(listLeads(owner).length,1);assert.equal(credits(owner.workspaceId).spent,2);closeDb();
});
test('CSV import rejects invalid countries, provinces, phones, markup URLs and duplicate-shaped rows',()=>{
 const header='name,category,province,locality,sourceId,phone,website,countryCode\n';
 const imported=parseCsv(header+'"Empresa, Exemplo",Restauração,Sofala,Beira,one,,,MZ','Fonte autorizada');assert.equal(imported[0].name,'Empresa, Exemplo');
 assert.throws(()=>parseCsv(header+'Empresa,Retalho,Sofala,Beira,one,,,ZA','Fonte'),/país/);
 assert.throws(()=>parseCsv(header+'Empresa,Retalho,Atlantis,Beira,one,,,MZ','Fonte'),/província/);
 assert.throws(()=>parseCsv(header+'Empresa,Retalho,Sofala,Beira,one,,javascript:alert(1),MZ','Fonte'),/site inválido/);
 assert.throws(()=>parseCsv(header+'Empresa,Retalho,Sofala,Beira,one,12345,,MZ','Fonte'),/telefone/);
 assert.equal(validPhone('123'),null);
});
test('live provider failure releases reservation and never becomes simulated success',async()=>{
 closeDb();process.env.PROSPECTA_DB_PATH=path.join(mkdtempSync(path.join(process.cwd(),'data-test-')),'failure.sqlite');
 const owner=createUser('Falha teste','failure@test.invalid','a very long password');
 const b={...getBusiness('demo-0-0'),id:'test-live-failure',isDemo:false};
 db().prepare('INSERT INTO businesses VALUES(?,?,?,?)').run(b.id,JSON.stringify(b),'authorized-test',new Date().toISOString());
 process.env.PROSPECTA_MODE='live';delete process.env.GEMINI_API_KEY;
 try {
  const job=requestAnalysis(owner,b.id,'Profissional','Criação de websites','provider-failure');
  await workerTick();assert.equal(readJob(owner,job.id).status,'queued');
  db().prepare('UPDATE jobs SET next_run_at=? WHERE id=?').run('2000-01-01T00:00:00Z',job.id);
  await workerTick();assert.equal(readJob(owner,job.id).status,'failed');assert.match(readJob(owner,job.id).error||'',/não configurada/);
  assert.deepEqual(credits(owner.workspaceId),{available:20,reserved:0,spent:0});
 }finally{process.env.PROSPECTA_MODE='demo';closeDb();}
});
test('30 deterministic analysis cases preserve evidence references and introduce no contacts',async()=>{
 const ids=(db().prepare("SELECT id FROM businesses WHERE source_key='demo' ORDER BY id LIMIT 30").all() as {id:string}[]).map(r=>r.id);
 assert.equal(ids.length,30);
 for(const businessId of ids){const business=getBusiness(businessId);const result=await analyse(business,{service:'Criação de websites',pitch:'Serviços para empresas',province:'',phone:'',nationwide:true,onboarded:true},'Profissional','Profissional','Criação de websites');assert.equal(result.mode,'demo');assert.ok(result.facts.every(f=>f.evidenceIds.every(ref=>business.evidence.some(e=>e.id===ref))));assert.ok(!result.draftMessage.includes('+258'));assert.ok(!/\d+%/.test(result.draftMessage));}
 closeDb();
});
test('radar search interface: flexible matching by niche, cities, contacts and history',async()=>{
 const user=createUser('Radar teste','radar-'+id()+'@test.invalid','a very long password');
 const search1=startSearch(user,{niche:'restaurantes',cities:'Maputo, Matola',phone:'all',website:'all',instagram:'all',province:'',locality:'',category:'',service:'Criação de websites',budget:11});
 await workerTick();
 const res1=readSearch(user,search1.id);
 assert.ok(res1.total>0);
 assert.ok(res1.results.some(b=>b.category.toLowerCase().includes('restauração')||b.name.toLowerCase().includes('restaurante')));
 const past=listSearches(user);
 assert.ok(past.length>=1);
 assert.equal(past[0].id,search1.id);
 assert.equal(past[0].filters.niche,'restaurantes');
 closeDb();
});
test('live mode search seeds real businesses and returns results for real Mozambican niches',async()=>{
 closeDb();
 process.env.PROSPECTA_DB_PATH=path.join(mkdtempSync(path.join(process.cwd(),'data-test-')),'live-search.sqlite');
 process.env.PROSPECTA_MODE='live';
 try {
  const user=createUser('Live Teste','live-'+id()+'@test.invalid','a very long password');
  const search=startSearch(user,{niche:'clínicas odontológicas',cities:'Maputo, Matola',phone:'all',website:'all',instagram:'all',province:'',locality:'',category:'',service:'Criação de websites',budget:11});
  await workerTick();
  const res=readSearch(user,search.id);
  assert.ok(res.total>=2);
  assert.equal(res.mode,'live');
  assert.ok(res.results.some(b=>b.name.toLowerCase().includes('sorriso')||b.name.toLowerCase().includes('matola')||b.name.toLowerCase().includes('clínica')));
  assert.ok(res.results.some(b=>b.phone!==null));
 }finally{
  process.env.PROSPECTA_MODE='demo';
  closeDb();
 }
});
test('sweepRealBusinesses caches live discovered businesses with phone, address and website status',async()=>{
 closeDb();
 process.env.PROSPECTA_DB_PATH=path.join(mkdtempSync(path.join(process.cwd(),'data-test-')),'sweep-test.sqlite');
 try {
  const swept=await sweepRealBusinesses('Oficinas Mecânicas','Maputo, Matola');
  assert.ok(swept.length>=2);
  assert.ok(swept.some(b=>b.phone!==null && b.phone.startsWith('+258')));
  assert.ok(swept.some(b=>b.locality.includes('Maputo')||b.locality.includes('Matola')));
  const cached=db().prepare("SELECT * FROM businesses WHERE id=?").get(swept[0].id) as {id:string;data:string};
  assert.ok(cached);
  const parsed=JSON.parse(cached.data);
  assert.equal(parsed.name,swept[0].name);
 }finally{
  closeDb();
 }
});


