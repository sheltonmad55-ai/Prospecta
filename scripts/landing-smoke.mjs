// Behavioral checks for animation, disclosure and actions. No visual rendering is claimed.
import { Window } from 'happy-dom';
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const window = new Window({ url: 'http://127.0.0.1:4317/' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true });
}
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
const listeners = new Set();
const media = { matches: false, addEventListener: (_type, callback) => listeners.add(callback), removeEventListener: (_type, callback) => listeners.delete(callback) };
window.matchMedia = () => media;
let observer;
class Observer {
  // eslint-disable-next-line @typescript-eslint/no-this-alias -- Capture the test observer so viewport entry can be triggered explicitly.
  constructor(callback) { this.callback = callback; this.disconnected = false; observer = this; }
  observe(target) { this.target = target; }
  disconnect() { this.disconnected = true; }
  enter() { this.callback([{ target: this.target, isIntersecting: true }]); }
}
window.IntersectionObserver = Observer;
const { createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
mkdirSync('test-results', { recursive: true });
const source = readFileSync('src/components/landing.tsx', 'utf8').replace("'@/lib/contracts'", "'../src/lib/contracts.ts'").replace("import './landing.css';", '');
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const filename = path.resolve('test-results/landing-standalone.mjs');
writeFileSync(filename, compiled);
const { default: Landing, ROTATING_SERVICES } = await import(pathToFileURL(filename).href + '?t=' + Date.now());
const element = document.createElement('div'); document.body.append(element);
const root = createRoot(element);
const calls = { register: 0, login: 0, demo: 0 }, checks = [];
async function waitFor(name, condition) {
  for (let attempt = 0; attempt < 180; attempt++) { const result = condition(); if (result) { checks.push(name); return result; } await new Promise(resolve => setTimeout(resolve, 40)); }
  throw new Error('Timeout: ' + name);
}
const button = name => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === name);
try {
  root.render(createElement(Landing, { mode: 'demo', busy: false, onRegister: () => calls.register++, onLogin: () => calls.login++, onDemo: () => calls.demo++ }));
  await waitFor('explicit hero renders', () => document.querySelector('h1')?.textContent.includes('Encontre empresas'));
  assert.equal(document.querySelector('.lp-rotator-visual').getAttribute('aria-hidden'), 'true'); checks.push('rotating copy does not flood screen readers');
  await waitFor('counter observer ready', () => observer?.target);
  assert.ok(document.querySelector('.lp-goal-value').textContent.includes('+0')); checks.push('counter waits for viewport entry');
  assert.ok(document.querySelector('#goal-heading').textContent.includes('A NOSSA META')); checks.push('amount clearly labeled as a target');
  observer.enter();
  await waitFor('counter reaches 100000 MT', () => document.querySelector('.lp-goal-value').textContent.includes('+100.000'));
  assert.ok(observer.disconnected); checks.push('counter observer disconnects after starting');
  for (let index = 1; index <= ROTATING_SERVICES.length; index++) {
    await waitFor('service rotation ' + index, () => document.querySelector('.lp-rotator-visual').getAttribute('data-service-index') === String(index % ROTATING_SERVICES.length));
    assert.equal(document.querySelector('.lp-word-in').textContent, ROTATING_SERVICES[index % ROTATING_SERVICES.length]);
  }
  for (const link of document.querySelectorAll('a[href^="#"]')) assert.ok(document.getElementById(link.getAttribute('href').slice(1)), link.getAttribute('href'));
  checks.push('all internal navigation targets exist');
  assert.equal(document.querySelectorAll('.lp-faq-list article').length, 7); checks.push('seven FAQ entries');
  const faq = document.querySelector('#lp-faq-question-1'); faq.click();
  await waitFor('FAQ opens accessibly', () => faq.getAttribute('aria-expanded') === 'true' && !document.querySelector('#lp-faq-answer-1').hidden);
  faq.click(); await waitFor('FAQ closes accessibly', () => faq.getAttribute('aria-expanded') === 'false' && document.querySelector('#lp-faq-answer-1').hidden);
  button('Encontrar os meus clientes').click(); button('Entrar').click(); button('Explorar demonstração').click();
  assert.deepEqual(calls, { register: 1, login: 1, demo: 1 }); checks.push('existing auth and demo actions wired');
  assert.ok(![...document.querySelectorAll('.lp-nav a,.lp-nav button')].some(node => /preços|planos/i.test(node.textContent))); checks.push('no pricing navigation');
  assert.ok(!document.querySelector('[id="precos"],[id="planos"]')); checks.push('no pricing section');
  const menu = document.querySelector('.lp-menu'); menu.click(); await waitFor('mobile menu expands', () => menu.getAttribute('aria-expanded') === 'true');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })); await waitFor('Escape closes mobile menu', () => menu.getAttribute('aria-expanded') === 'false');
  media.matches = true; for (const listener of listeners) listener();
  await waitFor('reduced motion shows static text', () => document.querySelector('.lp-rotator-visual .lp-word').textContent === ROTATING_SERVICES[0] && !document.querySelector('.lp-word-in'));
  const snapshot = document.querySelector('.lp-rotator-visual').textContent;
  await new Promise(resolve => setTimeout(resolve, 2200)); assert.equal(document.querySelector('.lp-rotator-visual').textContent, snapshot); checks.push('reduced motion stops rotation');
  root.unmount(); assert.equal(listeners.size, 0); checks.push('media listeners cleaned on unmount');
  const report = { passed: checks.length, checks, environment: 'Happy DOM; behavior only, not visual browser verification' };
  writeFileSync('test-results/landing-validation.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} finally { await window.happyDOM.close(); }
