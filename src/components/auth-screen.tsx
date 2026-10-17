'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, Globe2, LoaderCircle, Radar, ShieldCheck, Sparkles } from 'lucide-react';
import './auth-screen.css';

export type AuthMode = 'login' | 'register' | 'recover' | 'reset';
type Props = {
  kind: AuthMode; mode?: 'demo' | 'live'; busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitch: (mode: AuthMode) => void; onHome: () => void;
  onGoogle: (consent: { acceptedTerms: boolean; marketing: boolean }) => void;
};

export function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.23c1.9-1.75 2.99-4.33 2.99-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.23-2.51c-.9.6-2.04.97-3.38.97-2.61 0-4.82-1.77-5.61-4.15H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.9a6 6 0 0 1-.32-1.9c0-.66.12-1.3.32-1.9V7.51H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.49l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.78.51 3.82 1.51l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.51l3.34 2.59A5.95 5.95 0 0 1 12 5.95Z"/></svg>;
}

export default function AuthScreen({ kind, mode: _mode, busy, onSubmit, onSwitch, onHome, onGoogle }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [consentError, setConsentError] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const terms = useRef<HTMLInputElement>(null);
  const register = kind === 'register';
  const social = kind === 'login' || register;
  const text = {
    login: { eyebrow: 'BOM VOLTAR A VÊ-LO', title: 'Entre na sua conta', description: 'Continue de onde ficou. A próxima conversa espera por si.', button: 'Entrar na minha conta' },
    register: { eyebrow: 'COMECE AGORA', title: 'Crie a sua conta', description: 'Comece a encontrar novas oportunidades.', button: 'Criar conta' },
    recover: { eyebrow: 'VAMOS AJUDAR', title: 'Recupere o seu acesso', description: 'Indique o e-mail associado à sua conta.', button: 'Preparar recuperação' },
    reset: { eyebrow: 'UM NOVO COMEÇO', title: 'Defina uma nova palavra-passe', description: 'Escolha uma palavra-passe com pelo menos 10 caracteres.', button: 'Actualizar palavra-passe' },
  }[kind];

  useEffect(() => {
    const frame = requestAnimationFrame(() => title.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [kind]);

  function google() {
    if (register && !acceptedTerms) {
      setConsentError('Para criar a conta, aceite os termos e a política de privacidade.');
      terms.current?.focus();
      return;
    }
    setConsentError('');
    onGoogle({ acceptedTerms, marketing });
  }

  return <main className="auth-page">
    <div className="auth-page-pattern" aria-hidden="true" />
    <svg className="auth-constellation" viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M30 120 280 35 610 130 490 350 760 510M610 130 890 260 1130 190 1310 330M890 260 1000 520 1210 650M50 680 290 620 460 800"/><g>{[[30,120],[280,35],[610,130],[490,350],[760,510],[890,260],[1130,190],[1310,330],[1000,520],[1210,650],[50,680],[290,620],[460,800]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%3===0?4:3}/>)}</g></svg>
    <header className="auth-page-header"><button className="auth-page-brand" onClick={onHome} aria-label="Prospecta — início"><span><Radar size={26} strokeWidth={2.4}/></span>prospecta</button><button className="auth-home" onClick={onHome}><ArrowLeft size={15}/>Voltar para início</button></header>
    <div className="auth-page-grid">
      <aside className="auth-story" aria-label="O que a Prospecta faz">
        <span className="auth-story-symbol"><Radar size={48} strokeWidth={1.8}/></span>
        <span className="auth-story-kicker">O SEU TALENTO TEM ONDE CHEGAR</span>
        <h2>Encontre quem precisa<br/>do que <em>você vende.</em></h2>
        <p>Empresas em todo Moçambique. Mais contexto para apresentar o seu trabalho.</p>
        <ul>{['Empresas para descobrir','Oportunidades para compreender','Uma abordagem à sua medida'].map(item=><li key={item}><span><Check size={14}/></span>{item}</li>)}</ul>
        <div className="auth-example-frame"><div className="auth-example"><div className="auth-example-heading"><span><Building2 size={25}/></span><div><h3>Estúdio Horizonte</h3><p>Serviços profissionais · Beira</p></div></div><span className="auth-example-badge"><Sparkles size={12}/>Possibilidade a explorar</span><div className="auth-example-opportunity"><span>HIPÓTESE DE OPORTUNIDADE</span><b>Uma página para apresentar os serviços.</b><p>Confirme as necessidades antes de propor.</p></div><span className="auth-example-caption">OPORTUNIDADE COMERCIAL · MOÇAMBIQUE</span></div></div>
        <div className="auth-story-national"><Globe2 size={15}/><span>Do Rovuma ao Maputo. O próximo passo é seu.</span></div>
      </aside>

      <section className="auth-access" aria-labelledby="auth-page-title">
        <div className="auth-access-card">
          <div className="auth-access-heading"><span>{text.eyebrow}</span><h1 id="auth-page-title" ref={title} tabIndex={-1}>{text.title}</h1><p>{text.description}</p></div>
          <form className="auth-access-form" onSubmit={onSubmit}>
            {register && <div className="auth-consents"><label><input ref={terms} name="terms" type="checkbox" checked={acceptedTerms} onChange={event=>{setAcceptedTerms(event.target.checked);setConsentError('');}} required/><span>Li e aceito os <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span></label><label><input name="marketing" type="checkbox" checked={marketing} onChange={event=>setMarketing(event.target.checked)}/><span>Quero receber novidades da Prospecta por e-mail. <small>Opcional.</small></span></label></div>}
            {consentError && <p className="auth-inline-error" role="alert">{consentError}</p>}
            {social && <><button className="auth-google" type="button" onClick={google} disabled={busy}><GoogleMark/><span>Continuar com Google</span></button><div className="auth-divider"><span/>ou continue com e-mail<span/></div></>}
            {register && <><label className="auth-field" htmlFor="auth-name">O seu nome<input id="auth-name" name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Como devemos chamar-lhe?"/></label><label className="auth-field" htmlFor="auth-phone">Telefone <small>opcional</small><span className="auth-phone"><span>+258</span><input id="auth-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="84 123 4567" maxLength={25}/></span></label></>}
            {kind !== 'reset' && <label className="auth-field" htmlFor="auth-email">E-mail<input id="auth-email" name="email" type="email" required maxLength={180} autoComplete="email" placeholder="nome@exemplo.com"/></label>}
            {kind !== 'recover' && <label className="auth-field" htmlFor="auth-password">Palavra-passe{kind !== 'login' && <small className="auth-password-hint">Pelo menos 10 caracteres</small>}<span className="auth-password"><input id="auth-password" name="password" type={showPassword?'text':'password'} required minLength={kind==='login'?1:10} maxLength={128} autoComplete={kind==='login'?'current-password':'new-password'} placeholder={kind==='login'?'A sua palavra-passe':'Crie uma palavra-passe segura'}/><button type="button" aria-label={showPassword?'Ocultar palavra-passe':'Mostrar palavra-passe'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>}
            {kind === 'login' && <button type="button" className="auth-forgot" onClick={()=>onSwitch('recover')}>Esqueci a palavra-passe</button>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy?<LoaderCircle size={17} className="spin"/>:null}{text.button}{!busy&&<ArrowRight size={17}/>}</button>
          </form>
          <p className="auth-security"><ShieldCheck size={13}/>{register?'A sua conta. O seu trabalho. O seu controlo.':'Acesso ao seu espaço de oportunidades.'}</p>
        </div>
        <div className="auth-switch">{kind==='login'?<>Ainda não tem conta? <button onClick={()=>onSwitch('register')}>Criar conta</button></>:register?<>Já tem conta? <button onClick={()=>onSwitch('login')}>Entrar</button></>:<button onClick={()=>onSwitch('login')}><ArrowLeft size={13}/>Voltar para entrar</button>}</div>
      </section>
    </div>
    <footer className="auth-page-footer"><span>Prospecta · Feito para Moçambique</span><div><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a></div></footer>
  </main>;
}
