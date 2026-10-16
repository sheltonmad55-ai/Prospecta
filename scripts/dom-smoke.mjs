// Interaction check in a simulated DOM. This is deliberately not a visual browser test.
import { Window } from 'happy-dom';
import ts from 'typescript';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const window=new Window({url:'http://127.0.0.1:4317/'});
for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','Node','Event','MouseEvent','KeyboardEvent','FormData'])Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true,writable:true});
globalThis.requestAnimationFrame=window.requestAnimationFrame.bind(window);globalThis.cancelAnimationFrame=window.cancelAnimationFrame.bind(window);
window.scrollTo=()=>{};
const actualFetch=globalThis.fetch;let cookie='';
globalThis.fetch=async(url,options={})=>{const response=await actualFetch(new URL(url,'http://127.0.0.1:4317').href,{...options,headers:{...options.headers,cookie}});const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];return response;};
const {createElement}=await import('react');const {createRoot}=await import('react-dom/client');
mkdirSync('test-results',{recursive:true});
let landing=readFileSync('src/components/landing.tsx','utf8').replace("'@/lib/contracts'","'../src/lib/contracts.ts'").replace("import './landing.css';",'');
landing=ts.transpileModule(landing,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
writeFileSync('test-results/landing.mjs',landing);
let authScreen=readFileSync('src/components/auth-screen.tsx','utf8').replace("import './auth-screen.css';",'');
authScreen=ts.transpileModule(authScreen,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
writeFileSync('test-results/auth-screen.mjs',authScreen);
let source=readFileSync('src/components/prospecta.tsx','utf8').replace("'@/lib/contracts'","'../src/lib/contracts.ts'").replace("'./landing'","'./landing.mjs'").replace("'./auth-screen'","'./auth-screen.mjs'");
source=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
mkdirSync('test-results',{recursive:true});const filename=path.resolve('test-results/dom-component.mjs');writeFileSync(filename,source);
const {default:Prospecta}=await import(pathToFileURL(filename).href+'?t='+Date.now());
const container=document.createElement('div');document.body.append(container);const root=createRoot(container);root.render(createElement(Prospecta));
const checks=[];
async function waitFor(name,condition){for(let i=0;i<160;i++){const value=condition();if(value){checks.push(name);return value;}await new Promise(r=>setTimeout(r,125));}throw new Error('Timeout: '+name+'\n'+document.body.textContent.slice(-2200));}
function button(text){return [...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text&&!b.disabled);}
function heading(text){return [...document.querySelectorAll('h1,h2,h3')].find(h=>h.textContent.includes(text));}
try{
 (await waitFor('landing',()=>button('Explorar demonstração'))).click();
 await waitFor('authenticated search',()=>heading('O próximo cliente pode estar aqui.'));
 (await waitFor('search action',()=>button('Buscar negócios')||button('Pesquisar empresas'))).click();
 await waitFor('national result rendered',()=>heading('44 empresas encontradas'));
 (await waitFor('company action',()=>button('Ver empresa e possibilidades'))).click();
 await waitFor('business evidence view',()=>heading('Primeiro, os factos.'));
 (await waitFor('analysis action',()=>button('Analisar oportunidade · 1 crédito'))).click();
 await waitFor('analysis rendered',()=>button('Preparar a conversa'));
 (await waitFor('save action ready',()=>button('Guardar oportunidade'))).click();await waitFor('saved state',()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Guardada'));
 button('Preparar a conversa').click();
 const draft=await waitFor('outreach editor',()=>document.getElementById('draft'));
 if(!draft.value.includes('Bom dia!'))throw new Error('Draft not rendered');
 button('Guardar edição').click();await waitFor('save feedback',()=>document.querySelector('[role="status"]')?.textContent.includes('Mensagem guardada.'));
 button('Minhas oportunidades').click();const lead=await waitFor('crm list',()=>document.querySelector('.lead-row'));lead.click();
 await waitFor('opportunity dialog',()=>document.querySelector('.lead-drawer'));
 button('Guardar alterações').click();await waitFor('crm save feedback',()=>document.querySelector('[role="status"]')?.textContent.includes('Oportunidade actualizada.'));
 document.querySelector('[aria-label="Fechar oportunidade"]').click();button('Visão geral').click();
 await waitFor('dashboard rendered',()=>document.querySelectorAll('.stat-card').length===4);
 await waitFor('dashboard real count',()=>document.querySelector('.stat-card>strong')?.textContent==='1');
 button('Conta e utilização').click();await waitFor('account rendered',()=>heading('Perfil comercial'));
 button('Administração').click();await waitFor('admin rendered',()=>heading('Importar empresas por CSV'));
 button('Terminar sessão').click();await waitFor('logout returns to landing',()=>button('Criar conta'));
 button('Criar conta').click();await waitFor('registration dialog',()=>document.querySelector('input[name="name"]'));
 document.querySelector('input[name="name"]').value='Profissional Novo';
 document.querySelector('input[name="email"]').value=`dom-${Date.now()}@test.invalid`;
 document.querySelector('input[name="password"]').value='UmaPalavraPasse2026!';
 document.querySelector('input[type="checkbox"]').checked=true;
 document.querySelector('.auth-access-form button[type="submit"]').click();await waitFor('onboarding rendered',()=>heading('Primeiro, diga-nos o que faz.'));
 button('Guardar perfil').click();await waitFor('onboarding completes',()=>heading('Bom trabalho, Profissional'));
 const report={passed:checks.length,checks,environment:'Happy DOM + real HTTP API; not a visual browser test'};
 writeFileSync('test-results/dom-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{root.unmount();await window.happyDOM.close();}
