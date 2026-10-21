'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, ArrowUpRight, AtSign, Bookmark, Building2, CalendarDays, Check, ChevronDown, Compass, Copy, Database, FileText, Globe2, LoaderCircle, MapPin, Menu, MessageCircle, Radar, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { PROVINCES, PLANS, PLAN_DEADLINE_DISPLAY } from '@/lib/contracts';
import './landing.css';

export const ROTATING_SERVICES = [
  'tráfego pago.',
  'criação de sites.',
  'gestão de redes sociais.',
  'anúncios online.',
  'identidade visual.',
  'automação no WhatsApp.',
] as const;
export const LANDING_GOAL = { amount: 100000, kind: 'goal', label: 'IMPACTO GERADO' } as const;

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
function motionSnapshot() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function useReducedMotion() { return useSyncExternalStore(subscribeMotion, motionSnapshot, () => true); }

function useScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('happyDOM' in window) {
      document.querySelectorAll('.lp-reveal').forEach(el => el.classList.add('is-revealed'));
      return;
    }
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.lp-reveal').forEach(el => el.classList.add('is-revealed'));
      return;
    }
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

    const elements = document.querySelectorAll('.lp-reveal');
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function RotatingServices() {
  const reduced = useReducedMotion();
  const [rotation, setRotation] = useState({ index: 0, cycle: 0 });
  useEffect(() => {
    if (reduced) return;
    const interval = window.setInterval(() => setRotation(previous => ({ index: (previous.index + 1) % ROTATING_SERVICES.length, cycle: previous.cycle + 1 })), 2000);
    return () => window.clearInterval(interval);
  }, [reduced]);
  return <span className="lp-rotator">
    <span className="sr-only">tráfego pago, criação de sites, gestão de redes sociais, anúncios online, identidade visual e automação no WhatsApp.</span>
    <span className="lp-rotator-visual" aria-hidden="true" data-service-index={rotation.index}>
      {!reduced && rotation.cycle > 0 && <span key={`out-${rotation.cycle}`} className="lp-word lp-word-out">{ROTATING_SERVICES[(rotation.index + ROTATING_SERVICES.length - 1) % ROTATING_SERVICES.length]}</span>}
      <span key={`in-${rotation.cycle}`} className={reduced ? 'lp-word' : 'lp-word lp-word-in'}>{ROTATING_SERVICES[reduced ? 0 : rotation.index]}</span>
    </span>
  </span>;
}

function GoalCounter() {
  const target = useRef<HTMLElement>(null);
  const [count, setCount] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    let frame = 0, started = false, completed = false;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => { completed = true; window.cancelAnimationFrame(frame); setCount(LANDING_GOAL.amount); };
    const start = () => {
      if (started || completed) return;
      started = true;
      if (media.matches) { frame = window.requestAnimationFrame(finish); return; }
      const beginning = performance.now();
      const tick = (time: number) => {
        const progress = Math.min(1, (time - beginning) / 1800);
        setCount(Math.round(LANDING_GOAL.amount * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = window.requestAnimationFrame(tick); else completed = true;
      };
      frame = window.requestAnimationFrame(tick);
    };
    const onPreference = () => { if (media.matches && !completed) finish(); };
    media.addEventListener('change', onPreference);
    let observer: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      observer = new window.IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { start(); observer?.disconnect(); } }, { threshold: 0.35 });
      if (target.current) observer.observe(target.current);
    } else start();
    return () => { observer?.disconnect(); window.cancelAnimationFrame(frame); media.removeEventListener('change', onPreference); };
  }, []);
  const value = reduced ? LANDING_GOAL.amount : count;
  const formatted = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return <section className="lp-goal" ref={target} aria-labelledby="goal-heading">
    <span className="lp-section-kicker" id="goal-heading"><span />{LANDING_GOAL.label}</span>
    <p className="lp-goal-value" aria-label="Impacto gerado: mais de 100 mil meticais"><span aria-hidden="true">+{formatted}<small> MT</small></span></p>
    <h2>+100.000 MT em oportunidades comerciais geradas</h2>
    <p>Valor médio em negócios mapeados e propostas abertas pelos utilizadores da Prospecta em Moçambique.</p>
  </section>;
}

function LandingBrand({ light = false }: { light?: boolean }) {
  return <a href="#inicio" className={`lp-brand ${light ? 'lp-brand-light' : ''}`} aria-label="Prospecta — início"><span><Radar size={23} strokeWidth={2.25} /></span>prospecta<span className="lp-brand-country">MZ</span></a>;
}

const faqs = [
  { question: 'O que é a Prospecta?', answer: 'É uma plataforma para encontrar empresas, explorar possíveis oportunidades para os seus serviços, preparar mensagens e acompanhar conversas comerciais num só lugar.' },
  { question: 'Posso pesquisar em todo Moçambique?', answer: 'Sim. Pode pesquisar por província, localidade ou seleccionar Todo Moçambique. A quantidade e a qualidade da informação dependem da fonte e da zona consultada; não se trata de um inventário completo de todas as empresas.' },
  { question: 'A Prospecta envia mensagens por mim?', answer: 'Não. É você quem revê o texto e decide copiar a mensagem ou abrir o WhatsApp. Abrir a aplicação não confirma que a mensagem foi enviada, entregue ou lida.' },
  { question: 'Um telefone listado significa que a empresa tem WhatsApp?', answer: 'Não. Um número de telefone disponível não confirma uma conta WhatsApp activa. Verifique sempre o canal antes de abordar a empresa.' },
  { question: 'A análise garante que a empresa precisa do meu serviço?', answer: 'Não. As sugestões são hipóteses baseadas na informação disponível. Confirme as necessidades e o interesse directamente com a empresa antes de apresentar uma proposta.' },
  { question: 'Como funcionam os créditos do piloto?', answer: 'Cada espaço começa com 20 créditos. Uma análise concluída com a primeira mensagem custa 1 crédito. Editar e reabrir resultados existentes são gratuitos. Uma falha definitiva liberta o crédito reservado.' },
  { question: 'Posso experimentar antes de começar?', answer: 'Sim. Cada nova conta recebe 20 créditos gratuitos para explorar pesquisas em todo Moçambique, aceder a dados verificados de contacto e preparar propostas comerciais inteligentes com IA.' },
];

type LandingProps = { mode?: string; busy: boolean; onRegister: () => void; onLogin: () => void; onDemo?: () => void };
export default function Landing({ busy, onRegister, onLogin }: LandingProps) {
  useScrollReveal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const closeMenu = () => setMenuOpen(false);
  useEffect(() => {
    if (!menuOpen) return;
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [menuOpen]);

  return <div className="lp" id="inicio">
    <a className="skip-link" href="#lp-main">Saltar para o conteúdo</a>
    <div className="lp-dark-opening">
      <div className="lp-stars" aria-hidden="true">{Array.from({ length: 33 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 8) % 99}%`, top: `${(i * 23 + 9) % 94}%`, opacity: 0.2 + (i % 4) * 0.13, width: i % 5 === 0 ? 3 : 2, height: i % 5 === 0 ? 3 : 2 }} />)}</div>
      <header className="lp-header"><nav className="lp-nav" aria-label="Navegação da página inicial">
        <LandingBrand />
        <div className="lp-nav-links"><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#planos">Planos</a><a href="#perguntas">Perguntas frequentes</a></div>
        <div className="lp-nav-actions"><button className="lp-login" onClick={onLogin}>Entrar</button><button className="lp-button lp-nav-cta" onClick={onRegister}>Ir para o Prospecta</button><button className="lp-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="lp-mobile-nav" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
        {menuOpen && <div className="lp-mobile-nav" id="lp-mobile-nav"><a href="#como-funciona" onClick={closeMenu}>Como funciona</a><a href="#recursos" onClick={closeMenu}>Recursos</a><a href="#planos" onClick={closeMenu}>Planos</a><a href="#perguntas" onClick={closeMenu}>Perguntas frequentes</a><button className="lp-mobile-login" onClick={() => { closeMenu(); onLogin(); }}>Entrar</button><button className="lp-mobile-cta" onClick={() => { closeMenu(); onRegister(); }}>Ir para o Prospecta <ArrowRight size={16} /></button></div>}
      </nav></header>

      <section className="lp-hero" aria-labelledby="lp-title">
        <div className="lp-hero-badge"><span className="lp-badge-dot" />+100 mil MT em oportunidades geradas para clientes</div>
        <h1 id="lp-title">Encontre empresas<br />que precisam de<RotatingServices /></h1>
        <p className="lp-hero-description">O Prospecta busca negócios reais na sua cidade, mostra o que falta em cada um e escreve a mensagem pra você mandar no WhatsApp.</p>
        <div className="lp-hero-actions"><button className="lp-button lp-primary" onClick={onRegister}>Encontrar clientes <ArrowRight size={19} /></button><a href="#como-funciona" className="lp-button lp-secondary">Ver como funciona</a></div>
        <div className="lp-benefits"><span><Check size={16} />20 créditos grátis</span><span><Check size={16} />Sem cartão de crédito</span><span><Check size={16} />Empresas reais de Moçambique</span></div>
        <a className="lp-scroll-hint" href="#lp-main" aria-label="Descobrir como a Prospecta funciona"><span />DESÇA PARA DESCOBRIR</a>
      </section>
    </div>

    <main id="lp-main">
      <GoalCounter />

      <section className="lp-section lp-how lp-reveal" id="como-funciona">
        <div className="lp-section-heading lp-how-heading">
          <span className="lp-section-kicker">O QUE A EMPRESA PRECISA</span>
          <h2>Como funciona o Prospecta</h2>
          <p>Encontre negócios na sua cidade, entenda o que falta e aborde com uma mensagem pronta no WhatsApp.</p>
        </div>
        <div className="lp-steps lp-clivra-steps">
          {/* Step 1 */}
          <article className="lp-clivra-step lp-reveal lp-reveal-delay-1">
            <div className="lp-step-label">
              <span>1</span>
              <div>
                <h3>Encontre empresas</h3>
                <p>Por nicho e região, perto de você.</p>
              </div>
            </div>
            <div className="lp-step-card lp-card-map" aria-label="Mapa demonstrativo de empresas locais">
              <div className="lp-card-map-pills">
                <span className="lp-pill-service">Sites</span>
                <span className="lp-pill-location"><MapPin size={11} /> Maputo, MZ</span>
              </div>
              <div className="lp-map-canvas">
                <svg className="lp-map-roads" viewBox="0 0 320 200" fill="none" preserveAspectRatio="none">
                  <path d="M-10 60 C80 60, 130 40, 330 40" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" />
                  <path d="M85 -10 C90 70, 110 135, 130 210" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" />
                  <path d="M225 -10 C215 80, 235 145, 250 210" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" />
                  <path d="M-10 150 C100 150, 180 160, 330 170" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" />
                  <rect x="235" y="130" width="70" height="65" rx="10" fill="#dcfce7" />
                </svg>
                <span className="lp-map-bubble-pin p1"><MapPin size={12} /></span>
                <span className="lp-map-bubble-pin p2"><MapPin size={12} /></span>
                <span className="lp-map-bubble-pin p3"><MapPin size={12} /></span>
                <span className="lp-map-bubble-pin p4"><MapPin size={12} /></span>
                <div className="lp-map-center-target">
                  <div className="lp-target-card">
                    <span className="lp-target-name">Barbearia Central</span>
                    <span className="lp-target-tag">Sem site</span>
                  </div>
                  <div className="lp-target-beacon">
                    <span className="lp-beacon-pulse" />
                    <span className="lp-beacon-dot"><MapPin size={16} /></span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Step 2 */}
          <article className="lp-clivra-step lp-reveal lp-reveal-delay-2">
            <div className="lp-step-label">
              <span>2</span>
              <div>
                <h3>Entenda cada empresa</h3>
                <p>O que falta e o que oferecer.</p>
              </div>
            </div>
            <div className="lp-step-card lp-card-diagnosis" aria-label="Diagnóstico da oportunidade comercial">
              <div className="lp-diagnosis-top">
                <h4>Barbearia Central</h4>
                <span className="lp-badge-opportunity">Forte oportunidade</span>
              </div>
              <div className="lp-diagnosis-grid">
                <div className="lp-diag-tile is-missing">
                  <div className="lp-diag-icon-wrap">
                    <Globe2 size={20} />
                    <span className="lp-diag-badge-missing"><X size={10} strokeWidth={3} /></span>
                  </div>
                  <span>Site</span>
                </div>
                <div className="lp-diag-tile is-active">
                  <div className="lp-diag-icon-wrap">
                    <MapPin size={20} />
                    <span className="lp-diag-badge-active"><Check size={10} strokeWidth={3} /></span>
                  </div>
                  <span>Maps</span>
                </div>
                <div className="lp-diag-tile is-active">
                  <div className="lp-diag-icon-wrap">
                    <AtSign size={20} />
                    <span className="lp-diag-badge-active"><Check size={10} strokeWidth={3} /></span>
                  </div>
                  <span>Instagram</span>
                </div>
              </div>
              <div className="lp-diagnosis-suggestion">
                <Sparkles size={13} />
                <span>Site com agendamento</span>
              </div>
              <div className="lp-diagnosis-value">
                <small>Valor sugerido</small>
                <strong>15.000 – 30.000 MT</strong>
              </div>
            </div>
          </article>

          {/* Step 3 */}
          <article className="lp-clivra-step lp-reveal lp-reveal-delay-3">
            <div className="lp-step-label">
              <span>3</span>
              <div>
                <h3>Aborde e venda</h3>
                <p>Mensagem pronta e ajuda até fechar.</p>
              </div>
            </div>
            <div className="lp-step-card lp-card-whatsapp" aria-label="Conversa do WhatsApp com cliente">
              <div className="lp-wa-header">
                <div className="lp-wa-avatar">C</div>
                <div className="lp-wa-contact">
                  <strong>Carlos</strong>
                  <span>Barbearia Central</span>
                </div>
              </div>
              <div className="lp-wa-body">
                <div className="lp-wa-msg is-out">
                  <p>Oi, Carlos! Vi que a barbearia ainda não tem site. Posso te mostrar uma ideia?</p>
                  <span className="lp-wa-meta">10:42 <span className="lp-wa-checks">✓✓</span></span>
                </div>
                <div className="lp-wa-msg is-in">
                  <p>Pode sim! Me manda 😊</p>
                  <span className="lp-wa-meta">10:42</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="lp-context-section lp-reveal"><div className="lp-context-inner"><div className="lp-context-product"><div className="lp-app-mini-top"><Radar size={15} /><b>prospecta</b><span>FICHA DA EMPRESA</span></div><div className="lp-context-company"><span className="lp-preview-business-icon"><Building2 size={23} /></span><div><b>Restaurante Horizonte</b><span>Beira · Sofala</span></div><span className="lp-example-label">Exemplo</span></div><div className="lp-observed-box"><span><ShieldCheck size={13} />INFORMAÇÃO DA FONTE</span><p>Site não identificado<br />na fonte consultada.</p><small>Directório Empresarial MZ</small></div><div className="lp-recommendation-box"><span><Sparkles size={13} />ANTES DE PROPOR</span><p>Confirme com a empresa se já existe um site e quais são as suas prioridades.</p></div><div className="lp-context-product-footer"><Bookmark size={13} />Uma oportunidade para compreender melhor.</div></div><div className="lp-context-copy"><span className="lp-section-kicker">MAIS CLAREZA. MELHORES PERGUNTAS.</span><h2>Mais do que contactos.<br /><em>Contexto para agir.</em></h2><p>Saiba de onde vem a informação, o que ainda precisa de confirmar e como o seu serviço pode ser relevante.</p><div className="lp-context-points"><div><span><Database size={18} /></span><div><h3>Informação com origem</h3><p>Consulte a fonte e a data dos dados disponíveis.</p></div></div><div><span><Sparkles size={18} /></span><div><h3>Possíveis oportunidades</h3><p>Hipóteses explícitas, para validar numa conversa.</p></div></div><div><span><MessageCircle size={18} /></span><div><h3>Abordagem personalizada</h3><p>O seu serviço, a sua voz e uma mensagem editável.</p></div></div></div></div></div></section>

      <section className="lp-outreach-section lp-reveal"><div className="lp-outreach-inner"><div><span className="lp-section-kicker">A CONVERSA COMEÇA CONSIGO</span><h2>Saiba como se apresentar.<br /><em>E o que perguntar.</em></h2><p>Transforme o contexto numa mensagem natural. Reveja o texto, dê-lhe a sua voz e escolha o momento de contactar.</p><button className="lp-button lp-secondary" onClick={onRegister}>Preparar a minha abordagem <ArrowRight size={17} /></button><span className="lp-outreach-note"><ShieldCheck size={13} />O envio é sempre decidido por si.</span></div><div className="lp-outreach-example"><div className="lp-outreach-example-title"><Sparkles size={17} /><b>Uma boa primeira conversa</b><span>Rascunho</span></div><p className="lp-outreach-intro">Bom dia! Trabalho com criação de sites para pequenos negócios.</p><p className="lp-outreach-question">Gostaria de perceber se este serviço pode ser útil para a vossa empresa.</p><p className="lp-outreach-invite">Se fizer sentido, posso partilhar uma ideia sem compromisso.</p><div><Check size={13} />Sem presumir necessidades. Sem prometer resultados.</div></div></div></section>

      <section className="lp-section lp-features lp-reveal" id="recursos"><div className="lp-features-heading"><span className="lp-section-kicker">UM ESPAÇO PARA AVANÇAR</span><h2>Da pesquisa ao próximo<br />contacto, num só lugar.</h2><p>Ferramentas práticas para organizar a procura de novos clientes.</p><div className="lp-tiny-pipeline"><div><span />Novo<b>01</b></div><i /><div><span />Em conversa<b>02</b></div><i /><div><span />Próximo passo<CalendarDays size={14} /></div></div></div><div className="lp-feature-list">{[
        { icon: Search, title: 'Encontrar empresas', text: 'Pesquisa por zona e actividade, em todo Moçambique.' },
        { icon: Sparkles, title: 'Analisar oportunidades', text: 'Sugestões baseadas na informação disponível.' },
        { icon: MessageCircle, title: 'Preparar mensagens', text: 'Texto editável para apresentar os seus serviços.' },
        { icon: Bookmark, title: 'Guardar oportunidades', text: 'Empresas organizadas no seu espaço.' },
        { icon: FileText, title: 'Acompanhar conversas', text: 'Etapas, notas e próximos passos num só lugar.' },
        { icon: CalendarDays, title: 'Agendar seguimentos', text: 'Datas e tarefas para retomar os contactos.' },
      ].map((feature, idx) => <article key={feature.title} className={`lp-reveal lp-reveal-delay-${(idx % 4) + 1}`}><span><feature.icon size={19} /></span><div><h3>{feature.title}</h3><p>{feature.text}</p></div><ArrowUpRight size={15} /></article>)}</div></section>

      <section className="lp-audience lp-reveal"><span className="lp-section-kicker">O SEU SERVIÇO TEM LUGAR AQUI</span><h2>Feito para quem vende<br />serviços a empresas.</h2><p>Freelancers, consultores e pequenas agências podem usar a Prospecta para organizar a procura de novos clientes.</p><div>{['Criação de sites', 'Redes sociais', 'Design', 'Marketing', 'Fotografia', 'Vídeo', 'Consultoria', 'Menus digitais'].map(item => <span key={item}>{item}</span>)}</div></section>

      <section className="lp-country-section lp-reveal"><div><Globe2 size={24} /><div><h3>Do Rovuma ao Maputo.</h3><p>Escolha onde quer encontrar oportunidades. A disponibilidade de informação varia por fonte e localidade.</p></div></div><div className="lp-provinces">{PROVINCES.map(province => <span key={province}><MapPin size={11} />{province}</span>)}</div></section>

      <section className="lp-section lp-pricing lp-reveal" id="planos">
        <div className="lp-section-heading lp-pricing-heading">
          <span className="lp-section-kicker">PLANOS ACESSÍVEIS E SEM COMPLICAÇÕES</span>
          <h2>Invista no seu motor de prospecção</h2>
          <p>Encontre mais empresas, envie abordagens em simultâneo no WhatsApp e feche contratos de alto valor.</p>
          <div className="lp-deadline-notice">
            <span className="lp-deadline-dot" />
            <div>
              <strong>Aviso aos utilizadores:</strong> Todos os utilizadores devem ativar o seu plano até ao dia <b>{PLAN_DEADLINE_DISPLAY}</b> para garantir a continuidade dos serviços e acesso às novas funcionalidades.
            </div>
          </div>
        </div>

        <div className="lp-pricing-grid">
          {/* Plano Essencial */}
          <article className="lp-plan-card">
            <div className="lp-plan-top">
              <span className="lp-plan-tag">Pra começar</span>
              <h3>{PLANS.essential.name}</h3>
              <p className="lp-plan-tagline">{PLANS.essential.tagline}</p>
              <div className="lp-plan-price-wrap">
                <span className="lp-plan-val">{PLANS.essential.priceMt} MT</span>
                <span className="lp-plan-period">{PLANS.essential.period}</span>
              </div>
              <div className="lp-plan-methods">M-Pesa · e-Mola · Cartão · Lojou Pay</div>
              <a href={PLANS.essential.lojouCheckoutUrl} target="_blank" rel="noopener noreferrer" className="lp-button lp-plan-button">
                Assinar Essential <ArrowRight size={16} />
              </a>
            </div>
            <div className="lp-plan-features-wrap">
              <span className="lp-plan-feature-header">O QUE ESTÁ INCLUÍDO:</span>
              <ul className="lp-plan-features">
                {PLANS.essential.features.map(f => (
                  <li key={f}><Check size={16} /><span>{f}</span></li>
                ))}
              </ul>
            </div>
          </article>

          {/* Plano Pro */}
          <article className="lp-plan-card is-popular">
            <div className="lp-plan-badge-top">MAIS POPULAR · ALTA ESCALA</div>
            <div className="lp-plan-top">
              <span className="lp-plan-tag is-pro-tag">Para agências & prestadores</span>
              <h3>{PLANS.pro.name}</h3>
              <p className="lp-plan-tagline">{PLANS.pro.tagline}</p>
              <div className="lp-plan-price-wrap">
                {PLANS.pro.originalPriceMt && (
                  <span className="lp-plan-strikethrough">{PLANS.pro.originalPriceMt} MT</span>
                )}
                <span className="lp-plan-val lp-pro-val">{PLANS.pro.priceMt} MT</span>
                <span className="lp-plan-period">{PLANS.pro.period}</span>
              </div>
              <div className="lp-plan-methods">M-Pesa · e-Mola · Cartão · Lojou Pay</div>
              <a href={PLANS.pro.lojouCheckoutUrl} target="_blank" rel="noopener noreferrer" className="lp-button lp-primary lp-plan-button">
                Assinar Pro <ArrowRight size={16} />
              </a>
            </div>
            <div className="lp-plan-features-wrap">
              <span className="lp-plan-feature-header">TUDO DO ESSENCIAL E MAIS:</span>
              <ul className="lp-plan-features">
                {PLANS.pro.features.map(f => (
                  <li key={f}><Check size={16} /><span>{f}</span></li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="lp-section lp-faq" id="perguntas">
        <div className="lp-section-heading">
          <span className="lp-section-kicker">ANTES DA PRIMEIRA CONVERSA</span>
          <h2>Perguntas frequentes</h2>
          <p>O essencial para começar com clareza.</p>
        </div>
        <div className="lp-faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <article key={faq.question} className={`lp-faq-card ${isOpen ? 'is-open' : ''}`}>
                <h3>
                  <button
                    id={`lp-faq-question-${index}`}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`lp-faq-answer-${index}`}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={19} />
                  </button>
                </h3>
                {isOpen && (
                  <div
                    id={`lp-faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`lp-faq-question-${index}`}
                    className="lp-faq-answer"
                  >
                    <p>{faq.answer}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="lp-final lp-reveal"><div className="lp-final-orbits" aria-hidden="true" /><span className="lp-section-kicker">O PRÓXIMO PASSO É SEU</span><h2>O seu próximo cliente pode começar<br />com uma boa conversa.</h2><p>Encontre empresas em Moçambique, prepare a sua abordagem e acompanhe cada oportunidade.</p><div><button className="lp-button lp-final-primary" onClick={onRegister}>Começar agora <ArrowRight size={18} /></button><button className="lp-button lp-final-secondary" onClick={onLogin}>Entrar na minha conta</button></div></section>
    </main>
    <footer className="lp-footer lp-reveal"><div><LandingBrand /><p>Encontre empresas. Prepare a sua próxima venda.</p></div><nav aria-label="Navegação do rodapé"><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#perguntas">Perguntas frequentes</a></nav><div className="lp-footer-bottom"><span>Prospecta · Feito para Moçambique</span><div><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a></div></div></footer>
  </div>;
}
