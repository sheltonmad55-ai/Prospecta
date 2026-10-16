// Authentication-page interactions in a simulated DOM, without opening external accounts.
import { Window } from 'happy-dom';
import ts from 'typescript';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const window=new Window({url:'http://127.0.0.1:4317/cadastro'});
for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','Node','Event','MouseEvent','KeyboardEvent','FormData'])Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true,writable:true});
globalThis.requestAnimationFrame=window.requestAnimationFrame.bind(window);globalThis.cancelAnimationFrame=window.cancelAnimationFrame.bind(window);
const {createElement}=await import('react');const {createRoot}=await import('react-dom/client');
const source=readFileSync('src/components/auth-screen.tsx','utf8').replace("import './auth-screen.css';",'');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
mkdirSync('test-results',{recursive:true});const filename=path.resolve('test-results/auth-standalone.mjs');writeFileSync(filename,compiled);
const {default:AuthScreen}=await import(pathToFileURL(filename).href+'?t='+Date.now());
const element=document.createElement('div');document.body.append(element);const root=createRoot(element);
const checks=[],google=[],submitted=[],switched=[];let homes=0;
function check(name,condition){assert.ok(condition,name);checks.push(name);}
async function waitFor(name,condition){for(let i=0;i<140;i++){const result=condition();if(result){checks.push(name);return result;}await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Timeout: '+name);}
function render(kind,busy=false){root.render(createElement(AuthScreen,{key:kind,kind,mode:'demo',busy,onSubmit:event=>{event.preventDefault();submitted.push(Object.fromEntries(new window.FormData(event.currentTarget)));},onGoogle:value=>google.push(value),onSwitch:value=>switched.push(value),onHome:()=>homes++}));}
try{
 render('register');await waitFor('registration page heading',()=>document.querySelector('h1')?.textContent==='Crie a sua conta');
 check('full page instead of modal',!document.querySelector('[role="dialog"]')&&!!document.querySelector('.auth-story'));
 check('Google button present',document.querySelector('.auth-google')?.textContent==='Continuar com Google');
 check('terms required, marketing optional',document.querySelector('[name="terms"]').required&&!document.querySelector('[name="marketing"]').required&&!document.querySelector('[name="marketing"]').checked);
 document.querySelector('.auth-google').click();await waitFor('Google signup requires terms',()=>document.querySelector('[role="alert"]')?.textContent.includes('aceite os termos'));
 check('no OAuth callback without consent',google.length===0);
 document.querySelector('[name="terms"]').click();await new Promise(resolve=>setTimeout(resolve,50));document.querySelector('.auth-google').click();
 await waitFor('Google callback after consent',()=>google.length===1);assert.deepEqual(google[0],{acceptedTerms:true,marketing:false});
 const password=document.querySelector('[name="password"]');password.value='UmaPalavraPasse2026!';
 document.querySelector('[aria-label="Mostrar palavra-passe"]').click();await waitFor('password can be shown',()=>password.type==='text');
 check('show password preserves input',password.value==='UmaPalavraPasse2026!');
 document.querySelector('[aria-label="Ocultar palavra-passe"]').click();await waitFor('password can be hidden',()=>password.type==='password');
 document.querySelector('[name="name"]').value='Profissional UI';document.querySelector('[name="email"]').value='ui@test.invalid';document.querySelector('[name="phone"]').value='84 123 4567';
 document.querySelector('.auth-submit').click();await waitFor('email form submits',()=>submitted.length===1);
 check('form includes terms and optional phone',submitted[0].terms==='on'&&submitted[0].phone==='84 123 4567');
 check('phone country prefix visible',document.querySelector('.auth-phone>span').textContent==='+258');
 check('secure password minimum',password.minLength===10);
 document.querySelector('.auth-switch button').click();check('switch to login callback',switched.at(-1)==='login');
 render('login');await waitFor('login heading',()=>document.querySelector('h1')?.textContent==='Entre na sua conta');
 check('login has no registration-only fields',!document.querySelector('[name="name"]')&&!document.querySelector('[name="terms"]'));
 document.querySelector('.auth-google').click();await waitFor('Google login action',()=>google.length===2);assert.deepEqual(google[1],{acceptedTerms:false,marketing:false});
 document.querySelector('.auth-forgot').click();check('recovery action',switched.at(-1)==='recover');
 render('recover');await waitFor('recovery page heading',()=>document.querySelector('h1')?.textContent==='Recupere o seu acesso');
 check('recovery only requests email',!!document.querySelector('[name="email"]')&&!document.querySelector('[name="password"]')&&!document.querySelector('.auth-google'));
 document.querySelector('.auth-home').click();check('home action',homes===1);
 render('reset');await waitFor('reset page heading',()=>document.querySelector('h1')?.textContent==='Defina uma nova palavra-passe');
 check('reset hides email',!document.querySelector('[name="email"]')&&!!document.querySelector('[name="password"]'));
 render('login',true);await waitFor('busy controls disabled',()=>document.querySelector('.auth-google')?.disabled&&document.querySelector('.auth-submit')?.disabled);
 const report={passed:checks.length,checks,environment:'Happy DOM; not a real browser or live Google sign-in'};writeFileSync('test-results/auth-screen-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{root.unmount();await window.happyDOM.close();}
