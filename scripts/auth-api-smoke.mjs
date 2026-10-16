import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
const base=process.env.PROSPECTA_TEST_URL||'http://127.0.0.1:4317';const checks=[];
async function request(route,method='GET',body,headers={}){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});let data;try{data=await response.clone().json();}catch{data=null;}return {response,data};}
function check(name,value){assert.ok(value,name);checks.push(name);}
for(const route of ['/login','/cadastro']){const {response}=await request(route);check(route+' available',response.status===200);}
let result=await request('/api/auth/google','POST',{intent:'login'});check('Google is not simulated when unconfigured',result.response.status===503&&result.data.error.includes('ainda não está activado'));
result=await request('/api/auth/google','POST',{intent:'register',acceptedTerms:false});check('terms required for Google registration',result.response.status===400);
result=await request('/api/auth/google','POST',{intent:'login'}, {Origin:'https://example.org'});check('cross-site Google initiation blocked',result.response.status===403);
result=await request('/api/auth/callback?code=invalid');check('invalid callback returns safely to login',result.response.status===303&&result.response.headers.get('location').endsWith('/login?auth_error=google_failed'));
check('failed callback grants no application session',!result.response.headers.get('set-cookie')?.includes('prospecta_session='));
result=await request('/api/auth/callback?error=access_denied');check('cancelled provider response handled',result.response.status===303&&result.response.headers.get('location').endsWith('google_cancelled'));
const signup={name:'Teste telefone',email:`auth-${Date.now()}@test.invalid`,password:'UmaPalavraPasse2026!',acceptedTerms:true,phone:'841234567'};
result=await request('/api/auth/register','POST',{...signup,acceptedTerms:false});check('email signup terms validated on server',result.response.status===422);
result=await request('/api/auth/register','POST',{...signup,phone:'1234'});check('invalid optional phone rejected',result.response.status===400);
result=await request('/api/auth/register','POST',signup);check('optional phone normalized and persisted',result.response.status===200&&result.data.user.profile.phone==='+258841234567');
check('ordinary registration never grants admin',result.data.user.role==='owner');
mkdirSync('test-results',{recursive:true});const report={passed:checks.length,checks,environment:'local demo HTTP; no external Google authorization'};writeFileSync('test-results/auth-api-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
