import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
const base=process.env.PROSPECTA_TEST_URL||'http://127.0.0.1:4317';
function client(){let cookie='';return async(path,method='GET',data,extra={})=>{const r=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',cookie,...extra},body:data===undefined?undefined:JSON.stringify(data)});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:r.status,data:await r.json()};};}
const a=client(),b=client(),checks=[];
function check(name,condition){assert.ok(condition,name);checks.push(name);}
let result=await a('auth/demo','POST',{});check('demo account',result.status===200);
result=await b('auth/register','POST',{name:'Teste Isolamento',email:`api-${Date.now()}@test.invalid`,password:'UmaPalavraPasse2026!',acceptedTerms:true});check('register',result.status===200);
let {data:search,status}=await a('searches','POST',{province:'',locality:'',category:'',service:'Criação de websites',budget:11});check('async search',status===202);
for(let i=0;i<60&&['queued','running'].includes(search.status);i++){await new Promise(r=>setTimeout(r,250));search=(await a('searches/'+search.id)).data;}
check('all province areas',search.total>=44&&search.tasks.length===11);
check('private search',(await b('searches/'+search.id)).status===404);
const business=search.results[0];const {data:{lead}}=await a('leads','POST',{businessId:business.id});
check('private lead',(await b('leads/'+lead.id,'PATCH',{stage:'Ganho'})).status===404);
let {data:job}=await a('analyses','POST',{businessId:business.id,tone:'Profissional',service:'Criação de websites'},{'Idempotency-Key':'test-'+Date.now()});
for(let i=0;i<60&&['queued','running'].includes(job.status);i++){await new Promise(r=>setTimeout(r,250));job=(await a('jobs/'+job.id)).data;}
check('analysis success',job.status==='succeeded');
const usage=(await a('usage')).data;check('single charge',usage.credits.available===19&&usage.credits.spent===1&&usage.credits.reserved===0);
check('save draft',(await a('drafts/'+job.result.id,'PATCH',{body:'Mensagem de teste persistente.'})).status===200);
check('draft persistence',(await a('businesses/'+business.id)).data.analysis.draftMessage==='Mensagem de teste persistente.');
check('update pipeline',(await a('leads/'+lead.id,'PATCH',{stage:'Proposta',amountMinor:1500000})).status===200);
check('dashboard totals',(await a('dashboard')).data.proposalsMinor===1500000);
check('cross-origin blocked',(await a('searches','POST',{}, {Origin:'https://example.org'})).status===403);
check('owner not admin',(await b('admin')).status===403);
const privacy=(await a('privacy','POST',{type:'export'})).data;
check('own export',(await a('privacy/'+privacy.request.id+'/export')).data.opportunities.length===1);
check('private export',(await b('privacy/'+privacy.request.id+'/export')).status===404);
await a('suppressions','POST',{businessId:business.id,reason:'Pedido de não contacto'});
check('suppression blocks',(await a('analyses','POST',{businessId:business.id,tone:'Profissional',service:''},{'Idempotency-Key':'blocked-'+Date.now()})).status===409);
mkdirSync('test-results',{recursive:true});const report={passed:checks.length,checks};writeFileSync('test-results/api-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
