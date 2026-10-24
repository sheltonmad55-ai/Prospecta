'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, Bookmark, Building2, CalendarDays,
  Check, CheckCheck, ChevronLeft, ChevronRight, CircleCheck, Clock3,
  Compass, Copy, Database, Download, ExternalLink, FileText, Flame, Globe2,
  LoaderCircle, LogOut, Mail, MapPin, Menu, MessageCircle, Phone, Play, Plus,
  Radar, RefreshCw, Search, Send, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Star, Target, TrendingUp,
  Users, Wallet, X
} from 'lucide-react';
import Landing from './landing';
import AuthScreen, { type AuthMode } from './auth-screen';
import {
  PROVINCES, SERVICES, STAGES, COUNTRIES, getCountryByCode, isLikelyWhatsApp,
  isMozambiqueMobile, isMozambiqueLandline,
  getMetaAdLibraryUrl, getRecommendedPricing,
  PLANS, hasActivePaidPlan, getPlanMaxLeads,
  type Analysis, type Business, type Dashboard, type Job, type Lead,
  type LedgerEntry, type Profile, type SearchFilters, type SearchResult, type User,
  type VaultScript, type CountryOption, type PlanType, type SubscriptionStatus
} from '@/lib/contracts';

type View = 'opportunities' | 'today' | 'search' | 'saved-searches' | 'leads' | 'integrations' | 'portfolio' | 'vault' | 'business' | 'outreach' | 'account' | 'admin';

type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  workspaceId: string;
  credits: { available: number; reserved: number; spent: number };
  subscription: {
    plan: PlanType;
    status: SubscriptionStatus;
    expiresAt: string | null;
    months?: number;
  };
  activity?: {
    searchesCount: number;
    leadsCount: number;
    analysesCount: number;
  };
};

type AdminMetrics = {
  totalUsers: number;
  paidUsers: number;
  essentialUsers?: number;
  proUsers?: number;
  freeUsers: number;
  totalCredits: number;
};

type AdminData = {
  metrics?: AdminMetrics;
  users?: AdminUserItem[];
  workspaces: { id: string; name: string; email: string }[];
  jobs: { id: string; status: string; attempts: number; error: string | null }[];
  requests: PrivacyRequest[];
  corrections: { id: string; note: string; status: string }[];
};
type PrivacyRequest = { id: string; type: string; status: string; created_at?: string };

function getGoogleMapsUrl(name: string, locality: string, province?: string, countryName = 'Moçambique'): string {
  const query = [name, locality, province, countryName].filter(Boolean).join(', ');
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

const money = (minor: number) => new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 0 }).format(minor / 100) + ' MT';
const date = (value: string) => new Intl.DateTimeFormat('pt-MZ', { day: 'numeric', month: 'short', timeZone: 'Africa/Maputo' }).format(new Date(value));
const cls = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('prospecta_session_token') : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch('/api/' + path, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir o pedido.');
  return data;
}
const post = <T,>(path: string, data: unknown = {}) => api<T>(path, { method: 'POST', body: JSON.stringify(data) });


function getCoherentVaultScript(
  type: 'primeiro-contato' | 'sem-site' | 'esta-caro' | 'fechamento-mpesa' | 'followup',
  serviceName: string,
  biz: Business,
  userName: string,
  length: 'curta' | 'media' | 'longa' = 'curta'
): string {
  const normS = (serviceName || '').toLowerCase();
  const isSiteOrLanding = normS.includes('website') || normS.includes('site') || normS.includes('landing');
  const isAds = normS.includes('tráfego') || normS.includes('anúncio') || normS.includes('ads');
  const isSocial = normS.includes('rede') || normS.includes('social') || normS.includes('instagram');
  const isBot = normS.includes('whatsapp') || normS.includes('automação') || normS.includes('bot');

  const bizName = biz.name || 'a vossa empresa';
  const loc = biz.locality || 'a vossa zona';
  const cat = biz.category ? biz.category.toLowerCase() : 'negócios locais';
  const sender = userName || 'Chelton Madime';

  if (type === 'primeiro-contato') {
    if (isSiteOrLanding) {
      if (length === 'curta') {
        return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender}, sou especialista em criação de ${normS.includes('landing') ? 'landing pages' : 'websites'} aqui em Moçambique.

Reparei que têm um óptimo trabalho em ${loc}, mas estão sem uma página rápida para converter quem vos pesquisa no Google directo para o vosso WhatsApp.

Faz sentido conversarmos 2 minutinhos sobre uma proposta visual sem compromisso?

Um abraço,
${sender}`;
      }
      return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender}, sou especialista em ${normS.includes('landing') ? 'landing pages de alta conversão' : 'websites profissionais'} e presença digital aqui em Moçambique.

Estive a analisar empresas de ${cat} na zona de ${loc} e reparei que o vosso negócio tem um excelente trabalho, mas uma página web própria e rápida pode converter muito mais potenciais clientes directamente ao vosso WhatsApp.

Preparei uma proposta rápida mostrando exactamente como podemos estruturar uma página moderna e rápida, com adesão simples (inclusive com pagamentos práticos via M-Pesa / e-Mola).

Faz sentido apresentar-vos uma demonstração visual de 5 minutos, sem qualquer compromisso?

Um abraço,
${sender}`;
    }

    if (isAds) {
      if (length === 'curta') {
        return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender}, ajudo empresas de ${cat} em ${loc} a atraírem clientes qualificados todos os dias pelo Instagram e Google.

Preparei uma estratégia rápida para trazer mais orçamentos directos ao vosso WhatsApp.

Podemos conversar 2 minutinhos sobre isto hoje? Prometo ser breve!

Cumprimentos,
${sender}`;
      }
      return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender}, especialista em tráfego pago e captação de clientes em ${biz.province || 'Moçambique'}.

Notei a óptima reputação do vosso negócio em ${loc} e reparei que os concorrentes da zona estão a captar quem pesquisa por ${cat} na internet. Desenvolvi um plano de anúncios para colocar o vosso WhatsApp a receber pedidos diários de orçamento.

Podemos conversar 5 minutos sobre como aplicar isto ao vosso negócio este mês?

Com os melhores cumprimentos,
${sender}`;
    }

    if (isSocial) {
      if (length === 'curta') {
        return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender}, actuo com gestão de redes sociais e autoridade visual para negócios em ${loc}.

Notei o potencial de ${bizName} e separei 2 ideias visuais práticas para aumentarem o engajamento e atraírem mais orçamentos pelo WhatsApp.

Posso enviar-vos estas ideias em 2 minutinhos sem compromisso?

Um abraço,
${sender}`;
      }
      return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender}, actuo com posicionamento e gestão de redes sociais para ${cat} em ${biz.province || 'Moçambique'}.

Identifiquei oportunidades para modernizar a imagem visual e a consistência das vossas publicações em ${loc}, transformando seguidores em clientes pagantes no WhatsApp.

Faz sentido agendarmos uma conversa de 5 minutos para vos mostrar exemplos de resultados práticos?

Cumprimentos,
${sender}`;
    }

    if (isBot) {
      if (length === 'curta') {
        return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender} e ajudo empresas de ${cat} em ${loc} a automatizarem o WhatsApp para responderem orçamentos 24h sem demora e nunca perderem clientes.

Faz sentido conversarmos 2 minutinhos sobre como funciona para o vosso caso?

Um abraço,
${sender}`;
      }
      return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender} e ajudo empresas em ${loc} a modernizarem o atendimento no WhatsApp para nunca mais perderem clientes por demora em horários de pico ou fins de semana.

Desenvolvemos um assistente inteligente que atende, tira dúvidas e encaminha para pagamento de forma automática e humanizada.

Podemos agendar uma demonstração rápida de 5 minutos?

Cumprimentos,
${sender}`;
    }

    if (length === 'curta') {
      return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender}, trabalho com ${serviceName.toLowerCase()} em Moçambique.

Identifiquei 2 melhorias práticas para aumentarem as vendas de ${cat} em ${loc}.

Posso enviar-vos uma proposta rápida de 2 minutos sem compromisso?

Um abraço,
${sender}`;
    }
    return `Olá, equipa do(a) ${bizName}! Tudo bem?

O meu nome é ${sender}, actuo com ${serviceName.toLowerCase()} em Moçambique.

Estive a analisar a presença de empresas de ${cat} em ${loc} e notei oportunidades claras para o(a) ${bizName} captar mais clientes qualificados.

Faz sentido conversarmos 5 minutos esta semana para vos mostrar essa proposta sem compromisso?

Um abraço,
${sender}`;
  }

  if (type === 'sem-site') {
    const pageKind = isSiteOrLanding ? (normS.includes('landing') ? 'landing page' : 'página web moderna') : 'página oficial com catálogo e botão de WhatsApp';
    return `Olá, equipa do(a) ${bizName}! Como estão?

Estava a pesquisar empresas de ${cat} em ${loc} e encontrei o vosso perfil no Google. O trabalho de vocês é excelente, mas reparei que ainda não têm uma ${pageKind}, o que faz potenciais clientes hesitarem antes de chamar no WhatsApp.

Em menos de 48h consigo estruturar uma página rápida e responsiva para o(a) ${bizName} que multiplica os cliques directamente para o vosso atendimento.

Gostariam de ver uma demonstração visual sem compromisso?

Com os melhores cumprimentos,
${sender}`;
  }

  if (type === 'esta-caro') {
    return `Entendo perfeitamente, equipa do(a) ${bizName}. O valor pode parecer um investimento num primeiro momento.

Mas vamos analisar juntos: para um negócio de ${cat}, quanto custa perder apenas 1 ou 2 clientes por mês por falta de ${serviceName.toLowerCase()} e presença digital profissional?

Se esta solução vos trouxer apenas 2 novos clientes neste mês, o investimento já não se pagou e gerou lucro contínuo?

Além disso, facilitamos o pagamento em 2 parcelas práticas via M-Pesa / e-Mola para começarmos hoje mesmo sem pesar no caixa. O que vos parece?`;
  }

  if (type === 'fechamento-mpesa') {
    return `Perfeito, equipa do(a) ${bizName}! Fico muito contente por darmos este passo juntos.

Para darmos início imediato ao projeto de ${serviceName.toLowerCase()} do(a) ${bizName}:

📱 Pagamento prático via M-Pesa / e-Mola:
• Titular: ${sender}
• Serviço: ${serviceName}
• Referência: ${bizName}

Assim que enviarem o comprovativo por aqui, dou início imediato ao desenvolvimento e entrego a primeira prévia em 48h!`;
  }

  if (type === 'followup') {
    return `Olá, equipa do(a) ${bizName}, bom dia! Tudo bem?

Conseguiram analisar a proposta de ${serviceName.toLowerCase()} que vos enviei ontem? Sei que a rotina do negócio é sempre corrida!

Se preferirem, posso mandar um áudio de 1 minuto a resumir os principais ganhos para vocês, ou tirar qualquer dúvida rápida. Como está a vossa disponibilidade hoje?`;
  }

  return '';
}

function adaptScriptTemplate(
  template: string,
  company: string,
  niche: string,
  serviceName: string,
  locality: string,
  userName: string
): string {
  let result = template
    .replace(/{{empresa}}/g, company || '[Nome da Empresa]')
    .replace(/{{categoria}}/g, niche || '[Nicho do Negócio]')
    .replace(/{{setor}}/g, niche || '[Setor]')
    .replace(/{{servico}}/g, serviceName || '[Serviço]')
    .replace(/{{localidade}}/g, locality || '[Localidade]')
    .replace(/{{nome}}/g, userName || '[Seu Nome]');

  const sLower = (serviceName || '').toLowerCase();
  if (sLower.includes('website') || sLower.includes('site') || sLower.includes('landing')) {
    if (result.includes('automatizarem o atendimento no WhatsApp')) {
      result = result
        .replace('automatizarem o atendimento no WhatsApp para nunca mais deixarem clientes esperando (e perderem vendas por demora)', `estruturarem uma ${sLower.includes('landing') ? 'Landing Page rápida' : 'página web moderna'} para converterem quem pesquisa no Google directo para o vosso WhatsApp`)
        .replace('automatizarem o atendimento no WhatsApp para nunca mais deixarem clientes esperando', `estruturarem uma ${sLower.includes('landing') ? 'Landing Page rápida' : 'página web moderna'} para converterem quem vos pesquisa no Google`)
        .replace('inteligência artificial para responder orçamentos 24h por dia', 'uma página de alta conversão ligada directamente ao vosso WhatsApp');
    }
  } else if (sLower.includes('tráfego') || sLower.includes('anúncio')) {
    if (result.includes('automatizarem o atendimento no WhatsApp')) {
      result = result.replace('automatizarem o atendimento no WhatsApp para nunca mais deixarem clientes esperando (e perderem vendas por demora)', 'anúncios online no Instagram e Google para atraírem clientes qualificados todos os dias');
    }
  }

  return result;
}

function parseSpintaxClient(text: string): string {
  if (!text) return '';
  const spintaxRegex = /\{([^{}]+)\}/;
  let matches;
  let result = text;
  while ((matches = spintaxRegex.exec(result)) !== null) {
    const rawContent = matches[1];
    if (rawContent.includes('|')) {
      const choices = rawContent.split('|');
      const chosen = choices[Math.floor(Math.random() * choices.length)].trim();
      result = result.replace(matches[0], chosen);
    } else {
      result = result.replace(matches[0], `__VAR_${rawContent}__`);
    }
  }
  return result.replace(/__VAR_([a-zA-Z0-9_-]+)__/g, '{$1}');
}

function interpolateMessage(
  template: string,
  biz: Business,
  userName = '',
  serviceName = ''
): string {
  const bizName = biz.name || 'Empresa';
  const niche = biz.category || biz.activity || 'negócio';
  const city = biz.city || biz.locality || 'região';
  const province = biz.province || '';
  const country = biz.country || 'MZ';
  const countryObj = getCountryByCode(country);
  const countryName = countryObj ? countryObj.name : 'Moçambique';
  const score = biz.opportunityScore != null ? String(biz.opportunityScore) : '85';
  const phone = biz.phone || '';

  const withSpintax = parseSpintaxClient(template);

  return withSpintax
    .replace(/\{nome_empresa\}|\{\{empresa\}\}|\{empresa\}/gi, bizName)
    .replace(/\{cidade\}|\{\{cidade\}\}/gi, city)
    .replace(/\{provincia\}|\{\{provincia\}\}|\{província\}|\{\{província\}\}/gi, province)
    .replace(/\{pais\}|\{\{pais\}\}|\{país\}|\{\{país\}\}/gi, countryName)
    .replace(/\{nicho\}|\{\{nicho\}\}|\{categoria\}|\{\{categoria\}\}/gi, niche)
    .replace(/\{servico\}|\{\{servico\}\}|\{serviço\}|\{\{serviço\}\}/gi, serviceName || 'presença digital e captação de clientes')
    .replace(/\{responsavel\}|\{\{responsavel\}\}|\{responsável\}|\{\{responsável\}\}|\{nome\}|\{\{nome\}\}/gi, userName || 'Chelton')
    .replace(/\{telefone\}|\{\{telefone\}\}/gi, phone)
    .replace(/\{score\}|\{\{score\}\}/gi, score);
}

function exportCampaignCsv(campaign: any, recipientsList: any[]) {
  const rows = [
    ['Destinatário / Telefone', 'Empresa / Nome', 'Estado', 'Erro / Motivo', 'Data de Envio'],
    ...(recipientsList || []).map(r => [
      `"${r.phone}"`,
      `"${(r.vars?.nome_empresa || r.vars?.nome || r.vars?.empresa || 'Contacto').replace(/"/g, '""')}"`,
      `"${r.status === 'sent' ? 'Enviada' : r.status === 'failed' ? 'Falha' : r.status === 'ignored' ? 'Sem WhatsApp' : r.status === 'optout' ? 'Opt-Out (SAIR)' : 'Pendente'}"`,
      `"${(r.error || '').replace(/"/g, '""')}"`,
      `"${r.sent_at ? new Date(r.sent_at).toLocaleString('pt-MZ') : ''}"`
    ])
  ];
  const csvContent = '\uFEFF' + rows.map(r => r.join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Relatorio_Campanha_WhatsApp_${(campaign?.name || 'Campanha').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportBusinessesToCsv(businesses: Business[], filename = 'empresas_sem_whatsapp.csv') {
  if (!businesses || businesses.length === 0) return;
  const headers = ['Nome', 'Telefone', 'WhatsApp Provável', 'Nicho/Categoria', 'Cidade', 'Província', 'País', 'Score', 'Website', 'Endereço'];
  const rows = businesses.map(b => {
    const isWa = isLikelyWhatsApp(b.phone, b.country || 'MZ');
    const country = getCountryByCode(b.country || 'MZ')?.name || b.country || 'Moçambique';
    return [
      `"${(b.name || '').replace(/"/g, '""')}"`,
      `"${(b.phone || '').replace(/"/g, '""')}"`,
      isWa ? 'Sim' : 'Não',
      `"${(b.category || b.activity || '').replace(/"/g, '""')}"`,
      `"${(b.city || b.locality || '').replace(/"/g, '""')}"`,
      `"${(b.province || '').replace(/"/g, '""')}"`,
      `"${country.replace(/"/g, '""')}"`,
      b.opportunityScore || 0,
      `"${(b.website || '').replace(/"/g, '""')}"`,
      `"${(b.address || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportLeadsToCsv(leadsToExport: Lead[], filename = 'prospecta_leads.csv') {
  if (!leadsToExport || leadsToExport.length === 0) return;
  const headers = ['Empresa', 'Telefone', 'WhatsApp Provável', 'Etapa', 'Próximo Passo', 'Data Agendada', 'Valor Proposto (MT)', 'Notas', 'Nicho/Categoria', 'Cidade', 'Província', 'País', 'Website'];
  const rows = leadsToExport.map(l => {
    const b = l.business;
    const isWa = isLikelyWhatsApp(b?.phone, b?.country || 'MZ');
    const country = getCountryByCode(b?.country || 'MZ')?.name || b?.country || 'Moçambique';
    return [
      `"${(b?.name || '').replace(/"/g, '""')}"`,
      `"${(b?.phone || '').replace(/"/g, '""')}"`,
      isWa ? 'Sim' : 'Não',
      `"${(l.stage || 'Novo').replace(/"/g, '""')}"`,
      `"${(l.nextAction || '').replace(/"/g, '""')}"`,
      l.nextActionAt ? l.nextActionAt.slice(0, 10) : '',
      l.amountMinor !== null && l.amountMinor !== undefined ? (l.amountMinor / 100).toFixed(2) : '',
      `"${(l.note || '').replace(/"/g, '""')}"`,
      `"${(b?.category || b?.activity || '').replace(/"/g, '""')}"`,
      `"${(b?.locality || b?.city || '').replace(/"/g, '""')}"`,
      `"${(b?.province || '').replace(/"/g, '""')}"`,
      `"${country.replace(/"/g, '""')}"`,
      `"${(b?.website || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}
function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={'pill ' + tone}>{children}</span>;
}
function Empty({ icon = <Compass size={28} />, title, description, children }: { icon?: ReactNode; title: string; description: string; children?: ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{children}</div>;
}
function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={cls('brand', light && 'light')}>
      <span className="brand-mark"><Radar size={24} strokeWidth={2.4} /></span>
      <div>prospecta<span>INTELIGÊNCIA COMERCIAL · CPLP</span></div>
    </div>
  );
}

function CircleScore({ value, max = 100, size = 68, color = '#1877f2' }: { value: number; max?: number; size?: number; color?: string }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / max) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(37, 99, 235, 0.2)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="700">{value}</text>
    </svg>
  );
}

const DEFAULT_OPPORTUNITIES: Array<Business & { stars?: number; initial?: string; color?: string }> = [
  {
    id: 'biz-bellanapoli',
    name: 'Pizzaria Bella Napoli',
    category: 'Pizzaria e Restauração',
    province: 'Maputo Cidade',
    locality: 'Sommerschield, Maputo',
    phone: '+258 21 492 010',
    website: null,
    instagram: '@bellanapoli_mz',
    description: 'Pizzaria tradicional e forno a lenha no coração de Sommerschield, Maputo.',
    source: 'Google Maps Moçambique',
    observedAt: '2026-10-20T00:00:00.000Z',
    isDemo: false,
    stars: 5,
    initial: 'B',
    color: '#34D399',
    evidence: [
      { id: 'b-name', field: 'name', value: 'Pizzaria Bella Napoli', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'b-loc', field: 'location', value: 'Sommerschield, Maputo Cidade', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'b-cat', field: 'category', value: 'Pizzaria e Restauração', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'b-tel', field: 'phone', value: '+258 21 492 010', source: 'Google Maps Contacto', observedAt: '2026-10-20' }
    ]
  },
  {
    id: 'biz-zambi',
    name: 'Restaurante Zambi Waterfront',
    category: 'Restauração e Gastronomia',
    province: 'Maputo Cidade',
    locality: 'Baixa, Maputo',
    phone: '+258 84 220 5000',
    website: null,
    instagram: '@restaurantezambi',
    description: 'Referência gastronómica com vista para a baía de Maputo na marginal da Baixa.',
    source: 'Google Maps Moçambique',
    observedAt: '2026-10-20T00:00:00.000Z',
    isDemo: false,
    stars: 5,
    initial: 'Z',
    color: '#60A5FA',
    evidence: [
      { id: 'z-name', field: 'name', value: 'Restaurante Zambi Waterfront', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'z-loc', field: 'location', value: 'Baixa, Maputo Cidade', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'z-cat', field: 'category', value: 'Restauração e Gastronomia', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'z-tel', field: 'phone', value: '+258 84 220 5000', source: 'Google Maps Contacto', observedAt: '2026-10-20' }
    ]
  },
  {
    id: 'biz-sommerschield',
    name: 'Clínica da Sommerschield',
    category: 'Saúde e Clínica Médica',
    province: 'Maputo Cidade',
    locality: 'Sommerschield, Maputo',
    phone: '+258 21 493 515',
    website: null,
    instagram: null,
    description: 'Consultas especializadas, análises clínicas e atendimento médico de excelência em Maputo.',
    source: 'Google Maps Moçambique',
    observedAt: '2026-10-20T00:00:00.000Z',
    isDemo: false,
    stars: 5,
    initial: 'S',
    color: '#FBBF24',
    evidence: [
      { id: 's-name', field: 'name', value: 'Clínica da Sommerschield', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 's-loc', field: 'location', value: 'Sommerschield, Maputo Cidade', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 's-cat', field: 'category', value: 'Saúde e Clínica Médica', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 's-tel', field: 'phone', value: '+258 21 493 515', source: 'Google Maps Contacto', observedAt: '2026-10-20' }
    ]
  }
];

export default function Prospecta({ initialAuth = null }: { initialAuth?: AuthMode | null } = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'demo' | 'live'>('live');
  const [view, setView] = useState<View>('opportunities');
  const [auth, setAuth] = useState<AuthMode | null>(initialAuth);
  const [busy, setBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({ niche: '', cities: '', province: '', country: 'MZ', phone: 'all', website: 'all', instagram: 'all', locality: '', category: '', service: SERVICES[0], budget: 11 });
  const [pastSearches, setPastSearches] = useState<SearchResult[]>([]);
  const [selectedBizIds, setSelectedBizIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTemplate, setBulkTemplate] = useState('Olá, equipa do(a) {nome_empresa}! Tudo bem?\n\nO meu nome é {responsavel}, sou especialista em {servico} em {cidade}.\n\nEstive a analisar empresas de {nicho} na vossa zona e notei o vosso trabalho de excelência.\n\nFaz sentido enviar-vos uma proposta rápida e sem compromisso para trazer novos clientes para o vosso WhatsApp este mês?\n\nUm abraço,\n{responsavel}');
  const [bulkPreviewIndex, setBulkPreviewIndex] = useState(0);
  const [bulkDispatchStatus, setBulkDispatchStatus] = useState<string | null>(null);
  const [resultsSubTab, setResultsSubTab] = useState<'all' | 'with_whatsapp' | 'no_whatsapp'>('all');
  const [inlinePhoneBizId, setInlinePhoneBizId] = useState<string | null>(null);
  const [inlinePhoneVal, setInlinePhoneVal] = useState('');
  const [waServiceStatus, setWaServiceStatus] = useState<{
    connected: boolean;
    user?: string | null;
    status?: string;
    qrDataUrl?: string;
    wakingUp?: boolean;
    warmup?: {
      connectedAt: string | null;
      dayNumber: number;
      recommendedLimit: number;
      phaseDescription: string;
      todaySent: number;
      todayRemaining: number;
      effectiveLimit: number;
      isOverWarmupRecommended: boolean;
    };
  } | null>(null);
  const [waQrLoading, setWaQrLoading] = useState(false);
  const [waWakingUp, setWaWakingUp] = useState(false);
  const [confirmWarmupOverride, setConfirmWarmupOverride] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('847404158');
  const [waTestMessage, setWaTestMessage] = useState('Olá! Teste de integração do WhatsApp com a Prospecta SaaS concluído com sucesso 🚀');
  const [waTestSending, setWaTestSending] = useState(false);
  const [integrationSource, setIntegrationSource] = useState<'search' | 'leads'>('search');
  const [integrationFilter, setIntegrationFilter] = useState<'all' | 'with_wa' | 'no_wa'>('all');
  const [safeIntervalSec, setSafeIntervalSec] = useState<number>(20);
  const [waMinDelaySec, setWaMinDelaySec] = useState<number>(20);
  const [waMaxDelaySec, setWaMaxDelaySec] = useState<number>(60);
  const [waDailyLimit, setWaDailyLimit] = useState<number>(15);
  const [waStartHour, setWaStartHour] = useState<number>(8);
  const [waEndHour, setWaEndHour] = useState<number>(19);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBestPractices, setShowBestPractices] = useState(true);
  const qrGeneratedAtRef = useRef<number>(0);

  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);

  const checkWhatsAppStatus = useCallback(async () => {
    try {
      const res = await api<{ ok: boolean; connected: boolean; user?: string | null; status?: string; state?: string; qrDataUrl?: string; wakingUp?: boolean; warmup?: any }>('wa/status');
      setWaWakingUp(!!res.wakingUp);
      setWaServiceStatus({
        connected: !!res.connected,
        user: res.user,
        status: res.status || (res.connected ? 'connected' : 'disconnected'),
        qrDataUrl: res.qrDataUrl,
        wakingUp: !!res.wakingUp,
        warmup: res.warmup
      });
      // Se houver limite recomendado de aquecimento e o usuário ainda não tiver alterado manualmente para valor superior
      if (res.warmup?.recommendedLimit) {
        setWaDailyLimit(prev => Math.min(prev, res.warmup.recommendedLimit));
      }
      return res;
    } catch (err: any) {
      const isWaking = err?.message && (err.message.includes('acordar') || err.message.includes('arranque'));
      setWaWakingUp(!!isWaking);
      setWaServiceStatus(prev => ({
        connected: false,
        status: 'offline',
        qrDataUrl: prev?.qrDataUrl,
        wakingUp: !!isWaking,
        warmup: prev?.warmup
      }));
      return { connected: false, status: 'offline', wakingUp: !!isWaking };
    }
  }, []);

  const fetchWhatsAppQr = useCallback(async () => {
    setWaQrLoading(true);
    qrGeneratedAtRef.current = Date.now();
    try {
      const res = await api<{ ok: boolean; connected?: boolean; user?: string | null; status?: string; qrDataUrl?: string; wakingUp?: boolean; warmup?: any }>('wa/connect');
      setWaWakingUp(!!res.wakingUp);
      if (res.connected) {
        setWaServiceStatus({ connected: true, user: res.user, status: 'connected', qrDataUrl: undefined, warmup: res.warmup });
        notify('WhatsApp conectado com sucesso!');
      } else if (res.qrDataUrl) {
        setWaServiceStatus({ connected: false, qrDataUrl: res.qrDataUrl, status: 'waiting_qr', user: undefined });
      } else {
        setWaServiceStatus(prev => ({
          connected: !!prev?.connected,
          user: prev?.user,
          status: res.status || 'connecting',
          qrDataUrl: prev?.qrDataUrl,
          wakingUp: !!res.wakingUp
        }));
      }
    } catch (err: any) {
      console.warn('[WhatsApp QR error]:', err);
    } finally {
      setWaQrLoading(false);
    }
  }, [notify]);

  // Verificação inicial e periódica em segundo plano para manter alerta de status atualizado em todas as telas
  useEffect(() => {
    if (!user?.id) return;
    checkWhatsAppStatus();
    const bgInterval = setInterval(() => {
      if (view !== 'integrations' && !isBulkModalOpen) {
        checkWhatsAppStatus();
      }
    }, 20000);
    return () => clearInterval(bgInterval);
  }, [user?.id, view, isBulkModalOpen, checkWhatsAppStatus]);

  useEffect(() => {
    if (view === 'integrations' || isBulkModalOpen) {
      checkWhatsAppStatus().then(res => {
        if (!res?.connected && !('qrDataUrl' in res && res.qrDataUrl)) {
          fetchWhatsAppQr();
        }
      });
      // Polling a cada 3 segundos conforme requisito
      const interval = setInterval(() => {
        checkWhatsAppStatus().then(res => {
          // Se o QR estiver exibido há mais de 50 segundos sem leitura, gera novo automaticamente
          if (res?.status === 'waiting_qr' && Date.now() - qrGeneratedAtRef.current > 50000) {
            fetchWhatsAppQr();
          }
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [view, isBulkModalOpen, checkWhatsAppStatus, fetchWhatsAppQr]);

  // Polling em tempo real da campanha ativa (a cada 3s)
  useEffect(() => {
    if (!activeCampaignId) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await api<{ ok: boolean; campaign: any; recipients: any[] }>(`wa/campaigns/${activeCampaignId}`);
        if (active && res.ok && res.campaign) {
          setCampaignData({
            ...res.campaign,
            recipients: res.recipients || []
          });
          if (res.campaign.status === 'completed') {
            notify(`🎉 Campanha "${res.campaign.name}" concluída! Enviadas: ${res.campaign.stats.sent}`);
          }
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeCampaignId, notify]);

  const [business, setBusiness] = useState<Business | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draft, setDraft] = useState('');
  const [tone, setTone] = useState('Profissional');
  const [service, setService] = useState<string>(SERVICES[0]);
  const [messageLength, setMessageLength] = useState<'curta' | 'media' | 'longa'>('curta');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [customizingVaultId, setCustomizingVaultId] = useState<string | null>(null);
  const [vaultCustomNiche, setVaultCustomNiche] = useState('');
  const [vaultCustomService, setVaultCustomService] = useState('');
  const [vaultCustomCompany, setVaultCustomCompany] = useState('');
  const [vaultCustomLocality, setVaultCustomLocality] = useState('');
  const [vaultCustomText, setVaultCustomText] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [usage, setUsage] = useState<LedgerEntry[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [outbox, setOutbox] = useState<{ id: string; kind: string; link: string }[]>([]);
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [stageFilter, setStageFilter] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trialDay, setTrialDay] = useState(0);
  const [dailyOpps, setDailyOpps] = useState<Array<Business & { stars?: number; initial?: string; color?: string }>>(DEFAULT_OPPORTUNITIES);
  const [vaultScripts, setVaultScripts] = useState<VaultScript[]>([]);
  const [vaultCategory, setVaultCategory] = useState<string>('all');
  const [vaultSearch, setVaultSearch] = useState<string>('');
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string>('');
  const [adminUserSearch, setAdminUserSearch] = useState<string>('');
  const activeBusiness = useRef<string | null>(null);

  useEffect(() => { activeBusiness.current = business?.id || null; }, [business?.id]);

  const resetWorkspace = useCallback(() => {
    setDashboard(null); setSearchResult(null); setPastSearches([]); setBusiness(null);
    setAnalysis(null); setLeads([]); setSelectedLead(null); setDraft(''); setJob(null);
    setUsage([]); setRequests([]); setOutbox([]); setAdmin(null); setProfile(null);
    setVaultScripts([]);
  }, []);

  const loadDailyOpportunities = useCallback(async (day = 0) => {
    try {
      const res = await api<{ opportunities: Array<Business & { stars?: number; initial?: string; color?: string }> }>('opportunities?day=' + day);
      if (res.opportunities && res.opportunities.length > 0) {
        setDailyOpps(res.opportunities);
      }
    } catch {}
  }, []);

  const handleUpdateBusinessPhone = useCallback(async (bizId: string, phoneInput: string) => {
    try {
      const res = await api<{ business: Business }>(`businesses/${bizId}/phone`, { method: 'POST', body: JSON.stringify({ phone: phoneInput }) });
      setSearchResult(prev => prev ? {
        ...prev,
        results: prev.results.map(item => item.id === bizId ? { ...item, phone: res.business.phone } : item),
        allResults: prev.allResults ? prev.allResults.map(item => item.id === bizId ? { ...item, phone: res.business.phone } : item) : prev.allResults
      } : prev);
      setDailyOpps(prev => prev.map(item => item.id === bizId ? { ...item, phone: res.business.phone } : item));
      setLeads(prev => prev.map(l => l.business.id === bizId ? { ...l, business: { ...l.business, phone: res.business.phone } } : l));
      if (business && business.id === bizId) {
        setBusiness(res.business);
      }
      notify('Contacto guardado com sucesso!');
    } catch (err: any) {
      notify(err.message, true);
    }
  }, [business, notify]);

  const handleSendTestMessage = useCallback(async () => {
    if (!waTestPhone || waTestPhone.trim().length < 8) {
      notify('Indique um número de telemóvel válido para o teste.', true);
      return;
    }
    if (!waServiceStatus?.connected) {
      notify('Conecte o seu WhatsApp através do QR Code antes de enviar mensagens de teste.', true);
      return;
    }
    setWaTestSending(true);
    try {
      let phoneClean = waTestPhone.replace(/\D/g, '').replace(/^0+/, '');
      if (phoneClean.length === 9 && /^8[2-7]/.test(phoneClean)) {
        phoneClean = '258' + phoneClean;
      }
      await post('wa/send', { phone: phoneClean, message: waTestMessage.trim() });
      notify(`✅ Mensagem de teste enviada com sucesso para +${phoneClean}!`);
    } catch (err: any) {
      notify(err.message || 'Falha ao enviar mensagem de teste.', true);
    } finally {
      setWaTestSending(false);
    }
  }, [waTestPhone, waTestMessage, waServiceStatus, notify]);

  const handleResetWhatsApp = useCallback(async () => {
    if (!window.confirm('Pretende desconectar o WhatsApp e gerar um novo QR Code?')) return;
    try {
      await post('wa/logout');
      notify('Sessão desconectada. A gerar novo QR Code...');
      setWaServiceStatus({ connected: false, status: 'connecting', qrDataUrl: undefined, user: undefined });
      setTimeout(fetchWhatsAppQr, 1000);
    } catch (err: any) {
      notify(err.message || 'Falha ao desconectar sessão WhatsApp.', true);
    }
  }, [fetchWhatsAppQr, notify]);

  const handleCreateAndStartCampaign = useCallback(async (targets: Business[]) => {
    if (targets.length === 0) {
      notify('Selecione pelo menos um lead com WhatsApp para iniciar a campanha.', true);
      return;
    }
    if (!waServiceStatus?.connected) {
      notify('Conecte o seu WhatsApp através do QR Code antes de iniciar os disparos.', true);
      return;
    }
    setCampaignLoading(true);
    try {
      const currentCountryCode = filters.country || 'MZ';
      const withWaList = targets.filter(b => isLikelyWhatsApp(b.phone, b.country || currentCountryCode));
      if (withWaList.length === 0) {
        notify('Nenhum dos leads selecionados possui um número de WhatsApp válido.', true);
        setCampaignLoading(false);
        return;
      }

      const recipients = withWaList.map(b => ({
        phone: b.phone,
        vars: {
          nome_empresa: b.name,
          empresa: b.name,
          nome: b.name,
          cidade: b.locality || b.city || '',
          localidade: b.locality || b.city || '',
          nicho: b.category || b.activity || '',
          servico: filters.service || user?.profile?.service || '',
          responsavel: user?.name || 'Chelton'
        }
      }));

      const res = await post<{ ok: boolean; campaign: any }>('wa/campaigns', {
        name: `Campanha ${new Date().toLocaleDateString('pt-MZ')} (${withWaList.length} leads)`,
        messageTemplate: bulkTemplate,
        recipients,
        settings: {
          minDelaySec: waMinDelaySec,
          maxDelaySec: waMaxDelaySec,
          dailyLimit: waDailyLimit,
          startHour: waStartHour,
          endHour: waEndHour,
          pauseEvery: 20,
          pauseDurationMinutes: 7,
          confirmWarmupOverride
        }
      });

      if (res.ok && res.campaign) {
        setActiveCampaignId(res.campaign.id);
        setCampaignData(res.campaign);
        setShowConfirmModal(false);
        setIsBulkModalOpen(false);
        notify(`🚀 Campanha criada com sucesso! ${withWaList.length} leads em processamento na fila segura.`);
        if (view !== 'integrations') {
          setView('integrations');
        }
      }
    } catch (err: any) {
      notify(err.message || 'Falha ao iniciar campanha de WhatsApp.', true);
    } finally {
      setCampaignLoading(false);
    }
  }, [filters, user, bulkTemplate, waMinDelaySec, waMaxDelaySec, waDailyLimit, waStartHour, waEndHour, confirmWarmupOverride, waServiceStatus, view, notify]);

  const handlePauseCampaign = useCallback(async () => {
    if (!activeCampaignId) return;
    try {
      await post(`wa/campaigns/${activeCampaignId}/pause`);
      notify('Campanha pausada.');
      setCampaignData((prev: any) => prev ? { ...prev, status: 'paused' } : null);
    } catch (err: any) {
      notify(err.message || 'Falha ao pausar campanha.', true);
    }
  }, [activeCampaignId, notify]);

  const handleResumeCampaign = useCallback(async () => {
    if (!activeCampaignId) return;
    try {
      await post(`wa/campaigns/${activeCampaignId}/resume`);
      notify('Campanha retomada.');
      setCampaignData((prev: any) => prev ? { ...prev, status: 'running' } : null);
    } catch (err: any) {
      notify(err.message || 'Falha ao retomar campanha.', true);
    }
  }, [activeCampaignId, notify]);

  const handleCancelCampaign = useCallback(async () => {
    if (!activeCampaignId) return;
    if (!window.confirm('Tem a certeza de que deseja cancelar esta campanha? Os envios pendentes serão interrompidos.')) return;
    try {
      await post(`wa/campaigns/${activeCampaignId}/cancel`);
      notify('Campanha cancelada.');
      setCampaignData((prev: any) => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err: any) {
      notify(err.message || 'Falha ao cancelar campanha.', true);
    }
  }, [activeCampaignId, notify]);

  const exportNoWhatsAppCsv = useCallback((list: Business[]) => {
    if (list.length === 0) {
      notify('Nenhuma empresa sem WhatsApp para exportar.', true);
      return;
    }
    const rows = [
      ['Nome da Empresa', 'Categoria / Ramo', 'Localidade', 'Provincia / Regiao', 'Pais', 'Telefone Fixo / Actual', 'Website', 'Instagram', 'Fonte'],
      ...list.map(b => [
        `"${(b.name || '').replace(/"/g, '""')}"`,
        `"${(b.category || '').replace(/"/g, '""')}"`,
        `"${(b.locality || '').replace(/"/g, '""')}"`,
        `"${(b.province || '').replace(/"/g, '""')}"`,
        `"${(b.country || 'MZ').replace(/"/g, '""')}"`,
        `"${(b.phone || 'Sem telefone').replace(/"/g, '""')}"`,
        `"${(b.website || 'Sem website').replace(/"/g, '""')}"`,
        `"${(b.instagram || '').replace(/"/g, '""')}"`,
        `"${(b.source || '').replace(/"/g, '""')}"`
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `empresas_sem_whatsapp_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Ficheiro CSV exportado com sucesso (${list.length} empresas)!`);
  }, [notify]);

  const loadPastSearches = useCallback(async () => {
    let localList: SearchResult[] = [];
    if (typeof window !== 'undefined' && user?.id) {
      const cached = localStorage.getItem('prospecta_past_searches_' + user.id);
      if (cached) {
        try {
          localList = JSON.parse(cached) || [];
          if (localList.length > 0) setPastSearches(localList);
        } catch {}
      }
    }
    try {
      const res = await api<{ searches: SearchResult[] }>('searches');
      const serverList = res.searches || [];
      if (serverList.length > 0) {
        const mergedMap = new Map<string, SearchResult>();
        for (const item of localList) mergedMap.set(item.id, item);
        for (const item of serverList) {
          const existing = mergedMap.get(item.id);
          if (existing && existing.results && existing.results.length > 0 && (!item.results || item.results.length === 0)) {
            mergedMap.set(item.id, { ...item, results: existing.results, allResults: existing.allResults || existing.results });
          } else {
            mergedMap.set(item.id, item);
          }
        }
        const finalList = Array.from(mergedMap.values()).slice(0, 20);
        setPastSearches(finalList);
        if (typeof window !== 'undefined' && user?.id) {
          localStorage.setItem('prospecta_past_searches_' + user.id, JSON.stringify(finalList));
        }
      } else if (localList.length > 0) {
        setPastSearches(localList);
      }
    } catch {
      // Keep localList on error
    }
  }, [user?.id]);
  const refreshUser = useCallback(async () => {
    const result = await api<{ user: User | null; mode: 'demo' | 'live' }>('me');
    let u = result.user;
    if (u && (!u.name || u.name.toLowerCase() === 'droop store')) {
      u = { ...u, name: 'Chelton Madime' };
    }
    if (u && typeof window !== 'undefined') {
      const stored = localStorage.getItem('prospecta_onboarded_' + u.id);
      if (stored === 'true' && u.profile) {
        u = { ...u, profile: { ...u.profile, onboarded: true } };
      }
    }
    setUser(u); setMode(result.mode); return u;
  }, []);

  const navigate = useCallback((next: View, b?: Business) => {
    setView(next); setMobileMenu(false);
    if (next === 'leads') setSelectedLead(null);
    if (b) setBusiness(b);
    const url = new URL(window.location.href);
    url.pathname = '/'; url.searchParams.delete('auth_error'); url.searchParams.set('view', next);
    if (b) url.searchParams.set('business', b.id);
    else if (!['business', 'outreach'].includes(next)) url.searchParams.delete('business');
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const loadBusiness = useCallback(async (businessId: string, next: View = 'business', fallbackBusiness?: Business) => {
    if (fallbackBusiness) {
      setBusiness(fallbackBusiness);
      navigate(next, fallbackBusiness);
    }
    try {
      let query = '';
      if (fallbackBusiness) {
        try {
          query = '?b=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(fallbackBusiness)))));
        } catch {}
      }
      const result = await api<{ business: Business; analysis: Analysis | null; lead: Lead | null }>('businesses/' + businessId + query);
      setBusiness(result.business); setAnalysis(result.analysis);
      setDraft(result.analysis?.draftMessage || ''); setSelectedLead(result.lead);
      if (!fallbackBusiness) {
        navigate(next, result.business);
      }
    } catch (err) {
      if (!fallbackBusiness) throw err;
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    api<{ user: User | null; mode: 'demo' | 'live'; token?: string }>('me').then(result => {
      if (!active) return;
      if (typeof window !== 'undefined' && result.token) {
        localStorage.setItem('prospecta_session_token', result.token);
      }
      let currentUser = result.user;
      if (currentUser && (!currentUser.name || currentUser.name.toLowerCase() === 'droop store')) {
        currentUser = { ...currentUser, name: 'Chelton Madime' };
      }
      if (currentUser && typeof window !== 'undefined') {
        const storedOnboarded = localStorage.getItem('prospecta_onboarded_' + currentUser.id);
        if (storedOnboarded === 'true' && currentUser.profile) {
          currentUser = {
            ...currentUser,
            profile: {
              ...currentUser.profile,
              onboarded: true
            }
          };
        }
        const cachedSearch = localStorage.getItem('prospecta_active_search_' + currentUser.id);
        const cachedFilters = localStorage.getItem('prospecta_search_filters_' + currentUser.id);
        if (cachedSearch) {
          try {
            const parsed = JSON.parse(cachedSearch) as SearchResult;
            setSearchResult(parsed);
          } catch {}
        }
        if (cachedFilters) {
          try {
            const parsedF = JSON.parse(cachedFilters) as SearchFilters;
            setFilters(parsedF);
          } catch {}
        }
        const cachedPast = localStorage.getItem('prospecta_past_searches_' + currentUser.id);
        if (cachedPast) {
          try {
            setPastSearches(JSON.parse(cachedPast));
          } catch {}
        }
      }
      loadPastSearches();
      loadDailyOpportunities(0);
      setUser(currentUser); setMode(result.mode);
      if (currentUser?.profile) {
        setProfile(currentUser.profile);
        if (currentUser.profile.service) setService(currentUser.profile.service);
      }
      const isSheltonAdmin = currentUser && (currentUser.role === 'admin' || (currentUser.email && (currentUser.email.toLowerCase() === 'sheltonmad55@gmail.com' || currentUser.email.toLowerCase() === 'sheltonmad5@gmail.com')));
      if (currentUser && !query.get('reset')) {
        setAuth(null);
        if (isSheltonAdmin) {
          navigate('admin');
        } else if (!hasActivePaidPlan(currentUser)) {
          if (typeof window !== 'undefined' && !window.location.hash.includes('planos')) {
            window.location.href = '/#planos';
          }
        } else if (initialAuth) {
          navigate('opportunities');
        }
      }
      if (query.get('auth') === 'recover') setAuth('recover');
      const oauthError = query.get('auth_error');
      if (oauthError && !currentUser) notify(
        oauthError === 'google_cancelled' ? 'O acesso com Google foi cancelado. Pode tentar novamente.'
          : oauthError === 'google_terms' ? 'Para continuar com Google, crie a conta e aceite os termos.'
            : 'Não foi possível concluir o acesso com Google. Tente novamente.', true
      );
      const initial = query.get('view') as View | null;
      const validViews: View[] = ['opportunities', 'today', 'search', 'saved-searches', 'leads', 'integrations', 'portfolio', 'vault', 'account', 'admin', 'business', 'outreach'];
      if (isSheltonAdmin && (!initial || initial === 'opportunities' || initial === 'search')) {
        setView('admin');
      } else if (initial && validViews.includes(initial)) {
        setView(initial);
      } else if (query.get('view') === 'radar') {
        setView('search');
      } else if (isSheltonAdmin) {
        setView('admin');
      }
      if (currentUser && (query.get('error') || query.get('error_code') || query.get('error_description') || query.get('auth_error'))) {
        const targetView = (initial && validViews.includes(initial)) ? initial : (isSheltonAdmin ? 'admin' : 'opportunities');
        window.history.replaceState({}, '', window.location.pathname + '?view=' + targetView);
      }
      if (currentUser && query.get('business')) loadBusiness(query.get('business')!, initial === 'outreach' ? 'outreach' : 'business').catch(e => notify(e.message, true));
      if (query.get('reset') || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery') setAuth('reset');
      if (query.get('confirm')) post('auth/confirm', { token: query.get('confirm') }).then(() => notify('E-mail confirmado.')).catch(e => notify(e.message, true));
    }).catch(e => notify(e.message, true)).finally(() => setLoading(false));
    return () => { active = false; };
  }, [loadBusiness, notify, initialAuth, navigate]);

  useEffect(() => {
    const sync = () => {
      const path = window.location.pathname;
      if (path === '/cadastro') setAuth('register');
      else if (path === '/login') setAuth(new URLSearchParams(window.location.search).get('auth') === 'recover' ? 'recover' : 'login');
      else setAuth(null);
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 6500); return () => clearTimeout(timer); }, [toast]);

  useEffect(() => {
    if (!(view === 'leads' && selectedLead)) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => { const dialog = document.querySelector<HTMLElement>('[role="dialog"]'); dialog?.querySelector<HTMLElement>('input,button,select,textarea,a[href]')?.focus(); });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelectedLead(null); }
      if (event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        const items = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,textarea,a[href]') || []);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [view, selectedLead]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      if (view === 'today') { const r = await api<Dashboard>('dashboard'); if (active) setDashboard(r); }
      if (view === 'search' || view === 'saved-searches') { loadPastSearches(); }
      if (view === 'leads') { const r = await api<{ leads: Lead[] }>('leads'); if (active) setLeads(r.leads); }
      if (view === 'vault' || view === 'outreach') { const r = await api<{ scripts: VaultScript[] }>('vault'); if (active) setVaultScripts(r.scripts || []); }
      if (view === 'account') {
        const [u, p, o] = await Promise.all([api<{ entries: LedgerEntry[] }>('usage'), api<{ requests: PrivacyRequest[] }>('privacy'), api<{ messages: typeof outbox }>('outbox')]);
        if (active) { setUsage(u.entries); setRequests(p.requests); setOutbox(o.messages); setProfile(user!.profile); }
      }
      if (view === 'admin') { const r = await api<AdminData>('admin'); if (active) setAdmin(r); }
    }
    load().catch(e => notify(e.message, true));
    return () => { active = false; };
  }, [view, user, notify]);

  function openAuth(next: AuthMode | null) {
    setAuth(next);
    const url = new URL(window.location.href);
    url.pathname = next === 'register' ? '/cadastro' : next ? '/login' : '/';
    url.search = ''; url.hash = '';
    if (next === 'recover') url.searchParams.set('auth', 'recover');
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function startGoogle(consent: { acceptedTerms: boolean; marketing: boolean }) {
    await run(async () => {
      const redirectTo = `${window.location.origin}/api/auth/callback`;
      const result = await post<{ redirectUrl: string }>('auth/google', { intent: auth === 'register' ? 'register' : 'login', redirectTo, ...consent });
      window.location.assign(result.redirectUrl);
    });
  }

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    try { await operation(); } catch (error) { notify(error instanceof Error ? error.message : 'Ocorreu um erro.', true); } finally { setBusy(false); }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      if (auth === 'recover') { const r = await post<{ message: string }>('auth/recover', { email: form.get('email') }); notify(r.message); openAuth('login'); return; }
      if (auth === 'reset') {
        const recovery = new URLSearchParams(window.location.hash.slice(1));
        await post('auth/reset', { token: new URLSearchParams(window.location.search).get('reset'), accessToken: recovery.get('access_token'), refreshToken: recovery.get('refresh_token'), password: form.get('password') });
        window.history.replaceState({}, '', window.location.pathname); resetWorkspace(); setUser(null); openAuth('login'); notify('Palavra-passe actualizada. Entre novamente.'); return;
      }
      const result = await post<{ user?: User; token?: string; confirmationRequired?: boolean; message?: string }>('auth/' + auth, { name: form.get('name'), email: form.get('email'), password: form.get('password'), phone: form.get('phone') || '', acceptedTerms: form.get('terms') === 'on', consent: form.get('marketing') === 'on' });
      if (result.confirmationRequired) { notify(result.message || 'Confirme o seu e-mail.'); openAuth('login'); return; }
      if (result.user) {
        if (result.token && typeof window !== 'undefined') {
          localStorage.setItem('prospecta_session_token', result.token);
        }
        resetWorkspace();
        const isAdmin = result.user.role === 'admin' || (result.user.email && (result.user.email.toLowerCase() === 'sheltonmad55@gmail.com' || result.user.email.toLowerCase() === 'sheltonmad5@gmail.com'));
        const userToSet = isAdmin ? { ...result.user, role: 'admin' as const } : result.user;
        setUser(userToSet);
        setProfile(userToSet.profile);
        setAuth(null);
        if (isAdmin) {
          navigate('admin');
        } else if (hasActivePaidPlan(userToSet)) {
          navigate('opportunities');
        } else {
          notify('Bem-vindo! Ative o seu plano para desbloquear o acesso completo à sua conta.');
          if (typeof window !== 'undefined') {
            window.location.href = '/#planos';
          }
        }
      }
    });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>, onboarded = true) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const payload = {
        name: String(form.get('name') || user?.name || ''),
        service: String(form.get('service') || 'Criação de websites'),
        pitch: String(form.get('pitch') || ''),
        province: String(form.get('province') || ''),
        phone: String(form.get('phone') || ''),
        nationwide: form.get('nationwide') === 'on',
        onboarded: true
      };
      const result = await api<{ success?: boolean; user?: User }>('profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const updatedUser = result?.user || (result as unknown as User);
      if (updatedUser && updatedUser.profile) {
        const enforcedUser: User = {
          ...updatedUser,
          profile: {
            ...updatedUser.profile,
            onboarded: true
          }
        };
        setUser(enforcedUser);
        setProfile(enforcedUser.profile);
        setService(enforcedUser.profile.service || 'Criação de websites');
        if (typeof window !== 'undefined' && enforcedUser.id) {
          localStorage.setItem('prospecta_onboarded_' + enforcedUser.id, 'true');
        }
        notify('Perfil guardado com sucesso.');
      } else if (user) {
        const safeProfile: Profile = {
          service: payload.service,
          pitch: payload.pitch,
          province: payload.province,
          phone: payload.phone,
          nationwide: payload.nationwide,
          onboarded: true
        };
        const safeUser: User = { ...user, name: payload.name || user.name, profile: safeProfile };
        setUser(safeUser);
        setProfile(safeProfile);
        setService(safeProfile.service);
        if (typeof window !== 'undefined' && user.id) {
          localStorage.setItem('prospecta_onboarded_' + user.id, 'true');
        }
        notify('Perfil guardado com sucesso.');
      }
    });
  }

  async function doSearch(page?: number, customFilters?: SearchFilters) {
    await run(async () => {
      const searchParams = customFilters || filters;
      if (page && searchResult?.allResults && searchResult.allResults.length > 0) {
        const pageSize = 8;
        const total = searchResult.allResults.length;
        const pages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(Math.max(1, page), pages);
        const results = searchResult.allResults.slice((safePage - 1) * pageSize, safePage * pageSize);
        const updated = {
          ...searchResult,
          page: safePage,
          pages,
          results
        };
        setSearchResult(updated);
        if (typeof window !== 'undefined' && user?.id) {
          try {
            localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(updated));
          } catch {}
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      let result: SearchResult;
      if (page && searchResult) {
        try {
          result = await api<SearchResult>(`searches/${searchResult.id}?page=${page}`);
        } catch {
          result = await post<SearchResult>('searches', searchParams);
        }
      } else {
        result = await post<SearchResult>('searches', searchParams);
      }
      setSearchResult(result);
      if (typeof window !== 'undefined' && user?.id) {
        try {
          localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(result));
          localStorage.setItem('prospecta_search_filters_' + user.id, JSON.stringify(searchParams));
        } catch {}
      }
      setPastSearches(prev => {
        const next = [result, ...prev.filter(p => p.id !== result.id)].slice(0, 20);
        if (typeof window !== 'undefined' && user?.id) {
          try { localStorage.setItem('prospecta_past_searches_' + user.id, JSON.stringify(next)); } catch {}
        }
        return next;
      });
      for (let i = 0; ['queued', 'running'].includes(result.status) && i < 80; i++) {
        await new Promise(r => setTimeout(r, 650));
        try {
          result = await api<SearchResult>('searches/' + result.id);
          setSearchResult(result);
          if (typeof window !== 'undefined' && user?.id) {
            try {
              localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(result));
            } catch {}
          }
        } catch {
          break;
        }
      }
      if (['queued', 'running'].includes(result.status)) notify('A pesquisa continua em curso. Verifique o processador de tarefas.', true);
      else {
        setPastSearches(prev => {
          const next = [result, ...prev.filter(p => p.id !== result.id)].slice(0, 20);
          if (typeof window !== 'undefined' && user?.id) {
            try { localStorage.setItem('prospecta_past_searches_' + user.id, JSON.stringify(next)); } catch {}
          }
          return next;
        });
      }
    });
  }

  async function resumeSearch(item: SearchResult) {
    setFilters(item.filters);
    // Instant restoration from local memory/cache without network delay
    if (item.results && item.results.length > 0) {
      setSearchResult(item);
      if (typeof window !== 'undefined' && user?.id) {
        try {
          localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(item));
          localStorage.setItem('prospecta_search_filters_' + user.id, JSON.stringify(item.filters));
        } catch {}
      }
      return;
    }
    await run(async () => {
      try {
        const full = await api<SearchResult>(`searches/${item.id}`);
        setSearchResult(full);
        if (typeof window !== 'undefined' && user?.id) {
          try {
            localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(full));
            localStorage.setItem('prospecta_search_filters_' + user.id, JSON.stringify(item.filters));
          } catch {}
        }
      }
      catch {
        notify('Filtros da pesquisa retomados.');
      }
    });
  }

  async function saveBusiness(b: Business) {
    await run(async () => {
      const result = await post<{ lead: Lead }>('leads', { businessId: b.id });
      setSelectedLead(result.lead);
      if (business?.id === b.id) setBusiness({ ...b, saved: true });
      setSearchResult(prev => prev ? { ...prev, results: prev.results.map(item => item.id === b.id ? { ...item, saved: true } : item) } : prev);
      notify('Empresa guardada nas suas oportunidades.');
    });
  }

  async function generate(fresh = false) {
    if (!business) return;
    await run(async () => {
      let result = await api<Job>('analyses', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ businessId: business.id, tone, service, fresh, businessData: business, length: messageLength, customInstructions: customPrompt })
      });
      setJob(result);
      if (result.status === 'succeeded' && result.result) {
        if (!activeBusiness.current || activeBusiness.current === result.result.businessId || business.id === result.result.businessId) { setAnalysis(result.result); setDraft(result.result.draftMessage); }
        await refreshUser(); notify('Análise e mensagem preparadas.');
        return;
      }
      for (let i = 0; ['queued', 'running'].includes(result.status) && i < 20; i++) {
        await new Promise(r => setTimeout(r, 600));
        result = await api<Job>('jobs/' + result.id); setJob(result);
      }
      if (result.status === 'succeeded' && result.result) {
        if (!activeBusiness.current || activeBusiness.current === result.result.businessId || business.id === result.result.businessId) { setAnalysis(result.result); setDraft(result.result.draftMessage); }
        await refreshUser(); notify('Análise e mensagem preparadas.');
      } else if (result.status === 'failed') { await refreshUser(); throw new Error(result.error || 'A análise falhou; a reserva foi libertada.'); }
      else if (result.status === 'cancelled') { await refreshUser(); notify('Análise cancelada.'); }
      else notify('A tarefa continua em curso. Pode consultar o resultado mais tarde.', true);
    });
  }

  async function saveDraft() {
    if (!analysis) return;
    await run(async () => {
      const result = await api<{ analysis: Analysis }>('drafts/' + analysis.id, { method: 'PATCH', body: JSON.stringify({ body: draft }) });
      setAnalysis(result.analysis); notify('Mensagem guardada.');
    });
  }

  async function copyDraft() {
    try { await navigator.clipboard.writeText(draft); notify('Mensagem copiada. Reveja antes de enviar.'); }
    catch { notify('Não foi possível copiar. Seleccione o texto manualmente.', true); }
  }

  async function updateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead) return;
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const amount = String(form.get('amount') || '');
      const due = String(form.get('due') || '');
      const result = await api<{ lead: Lead }>('leads/' + selectedLead.id, { method: 'PATCH', body: JSON.stringify({ stage: form.get('stage'), note: form.get('note'), nextAction: form.get('nextAction'), nextActionAt: due ? new Date(due).toISOString() : null, amountMinor: amount ? Math.round(Number(amount) * 100) : null }) });
      setSelectedLead(result.lead); setLeads(prev => prev.map(l => l.id === result.lead.id ? result.lead : l)); notify('Oportunidade actualizada.');
    });
  }

  async function requestPrivacy(type: 'export' | 'delete') {
    if (type === 'delete' && !window.confirm('Pretende pedir a eliminação da sua conta e dados privados? O pedido será revisto pela administração.')) return;
    await run(async () => {
      const result = await post<{ request: PrivacyRequest }>('privacy', { type });
      setRequests(prev => [result.request, ...prev]);
      notify(type === 'export' ? 'Exportação pronta para descarregar.' : 'Pedido de eliminação registado.');
    });
  }

  // ─── Navigation (Clivra structure) ──────────────────
  const navMain = [
    { view: 'opportunities' as View, label: 'Oportunidades grátis', icon: Sparkles },
    { view: 'today' as View, label: 'Hoje', icon: CalendarDays },
    { view: 'search' as View, label: 'Encontrar clientes', icon: Compass },
    { view: 'saved-searches' as View, label: 'Buscas salvas', icon: Search },
    { view: 'leads' as View, label: 'Leads salvos', icon: Bookmark },
    { view: 'integrations' as View, label: 'Integrações', icon: MessageCircle, badge: waServiceStatus?.connected ? '🟢 Online' : waServiceStatus?.status === 'waiting_qr' ? '🟡 Ler QR' : undefined },
    { view: 'portfolio' as View, label: 'Portfólio', icon: FileText, beta: true },
    { view: 'vault' as View, label: 'Cofre', icon: ShieldCheck },
  ];

  // ─── Render ──────────────────────────────────────────
  if (loading) return <div className="boot"><Brand /><LoaderCircle className="spin" /><p>A preparar o seu espaço…</p></div>;

  const toastUi = toast && (
    <div role={toast.error ? 'alert' : 'status'} className={cls('toast', toast.error && 'error')}>
      {toast.error ? <ShieldCheck size={19} /> : <CircleCheck size={19} />}
      <span>{toast.message}</span>
      <IconButton label="Fechar mensagem" onClick={() => setToast(null)}><X size={16} /></IconButton>
    </div>
  );

  if (!user || auth === 'reset') return (
    <div className="public-page">{toastUi}
      {auth
        ? <AuthScreen key={auth} kind={auth} busy={busy} onSubmit={authenticate} onSwitch={openAuth} onHome={() => openAuth(null)} onGoogle={startGoogle} />
        : <Landing busy={busy} onRegister={() => openAuth('register')} onLogin={() => openAuth('login')} />}
    </div>
  );

  return (
    <div className="app">
      {toastUi}
      <a className="skip-link" href="#main">Saltar para o conteúdo</a>
      {mobileMenu && <div className="sidebar-backdrop" onClick={() => setMobileMenu(false)} />}

      {/* ══ SIDEBAR ══════════════════════════════════════ */}
      <aside className={cls('sidebar', mobileMenu && 'open')}>
        <Brand />

        {user.role === 'admin' ? (
          <>
            <span className="nav-label">CONTROLE EXECUTIVO SAAS</span>
            <nav aria-label="Painel de Administração">
              <button className={cls('nav-item', view === 'admin' && 'active')} onClick={() => navigate('admin')}>
                <ShieldCheck size={19} /><span>Painel do Administrador</span>
              </button>
            </nav>

            <span className="nav-label" style={{ marginTop: 20 }}>VISUALIZAR COMO CLIENTE</span>
            <nav aria-label="Navegação da plataforma">
              {navMain.map(item => (
                <button key={item.view} className={cls('nav-item', view === item.view && 'active')} onClick={() => navigate(item.view)}>
                  <item.icon size={19} />
                  <span>{item.label}</span>
                  {item.beta && <span className="nav-beta">BETA</span>}
                  {item.badge && <span className="nav-beta" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700 }}>{item.badge}</span>}
                </button>
              ))}
            </nav>
          </>
        ) : (
          <>
            <span className="nav-label">MENU</span>
            <nav aria-label="Navegação principal">
              {navMain.map(item => (
                <button key={item.view} className={cls('nav-item', view === item.view && 'active')} onClick={() => navigate(item.view)}>
                  <item.icon size={19} />
                  <span>{item.label}</span>
                  {item.beta && <span className="nav-beta">BETA</span>}
                  {item.badge && <span className="nav-beta" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700 }}>{item.badge}</span>}
                </button>
              ))}
            </nav>
          </>
        )}

        <div className="sidebar-bottom">
          {/* Credits pill */}
          <div className="sidebar-credits">
            <Sparkles size={14} />
            <span>{user.credits.available} créditos</span>
            <button className="text-button" style={{ marginLeft: 'auto' }} onClick={() => navigate('account')}><ArrowRight size={13} /></button>
          </div>

          {/* Configurações */}
          <button className="nav-item" onClick={() => navigate('account')}>
            <Settings2 size={19} /><span>Configurações</span>
          </button>

          {/* User card */}
          <button className="user-card" onClick={() => navigate('account')}>
            <span className="avatar">{((user.name && user.name.toLowerCase() !== 'droop store') ? user.name : 'Chelton Madime').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')}</span>
            <span><strong>{(user.name && user.name.toLowerCase() !== 'droop store') ? user.name : 'Chelton Madime'}</strong><small>{user.profile.province || 'Moçambique'}</small></span>
            <Settings2 size={17} />
          </button>

          <button className="logout" disabled={busy} onClick={() => run(async () => {
            if (typeof window !== 'undefined') localStorage.removeItem('prospecta_session_token');
            await post('auth/logout'); resetWorkspace(); setUser(null); setAuth(null);
          })}>
            <LogOut size={15} /> Terminar sessão
          </button>
        </div>
      </aside>

      {/* ══ MAIN ════════════════════════════════════════ */}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton label="Abrir menu" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></IconButton>
            <span className="breadcrumb">
              O meu espaço <ChevronRight size={13} /> <b>
                {view === 'business' ? 'Ficha da empresa'
                  : view === 'outreach' ? 'Preparar abordagem'
                  : view === 'admin' ? 'Administração'
                  : view === 'integrations' ? 'Integrações & WhatsApp'
                  : navMain.find(n => n.view === view)?.label || 'Configurações'}
              </b>
            </span>
          </div>
          <div className="topbar-right">
            <span className="country" title="Cobertura completa em toda a CPLP & PALOP"><span className="country-dot" /> CPLP & PALOP ({getCountryByCode(filters.country).flag} {getCountryByCode(filters.country).name})</span>
            {user.role === 'admin' ? (
              <span className="balance" style={{ background: 'rgba(245, 158, 11, 0.18)', borderColor: 'rgba(245, 158, 11, 0.45)', color: '#FBBF24', fontWeight: 800 }}>
                <ShieldCheck size={14} /> Super Administrador
              </span>
            ) : (
              <button
                className="balance"
                onClick={() => setShowPlansModal(true)}
                style={{
                  background: user.subscription && user.subscription.plan !== 'free' && user.subscription.status === 'active'
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
                  borderColor: user.subscription && user.subscription.plan !== 'free' && user.subscription.status === 'active'
                    ? 'rgba(16, 185, 129, 0.45)'
                    : 'rgba(245, 158, 11, 0.45)',
                  color: user.subscription && user.subscription.plan !== 'free' && user.subscription.status === 'active'
                    ? '#34D399'
                    : '#FCD34D',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={13} style={{ color: user.subscription && user.subscription.plan !== 'free' && user.subscription.status === 'active' ? '#34D399' : '#FBBF24' }} />
                {user.subscription && user.subscription.plan !== 'free' && user.subscription.status === 'active'
                  ? (user.subscription.plan === 'pro' ? '👑 Plano Pro Ativo' : '✨ Plano Essencial Ativo')
                  : 'Ativar Plano'}
              </button>
            )}
            <button className="balance" onClick={() => navigate('account')}><Sparkles size={14} />{user.credits.available} créditos</button>
            <span className="avatar small">{user.name.slice(0, 1)}</span>
          </div>
        </header>

        <main id="main" className="workspace">

          {/* ══ ALERTAS GLOBAIS DE WHATSAPP & RETOMA ══ */}
          {user.profile.onboarded && view !== 'admin' && (
            <>
              {waWakingUp ? (
                <div style={{
                  margin: '0 0 18px',
                  padding: '12px 18px',
                  borderRadius: 12,
                  background: 'rgba(37, 99, 235, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  color: '#93C5FD',
                  fontSize: 13
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LoaderCircle size={18} className="spin" color="#60A5FA" />
                    <span><b>A ligar ao servidor de WhatsApp, aguarde cerca de um minuto...</b> Os serviços dedicados estão em arranque a frio.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => checkWhatsAppStatus()}
                    style={{ background: 'transparent', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#FFFFFF', padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                  >
                    Verificar Estado
                  </button>
                </div>
              ) : waServiceStatus && !waServiceStatus.connected && view !== 'integrations' ? (
                <div style={{
                  margin: '0 0 18px',
                  padding: '12px 18px',
                  borderRadius: 12,
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  color: '#FDE047',
                  fontSize: 13
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={18} color="#FACC15" />
                    <span><b>WhatsApp Desconectado:</b> O seu número de WhatsApp não está ativo. As mensagens e campanhas estão pausadas.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('integrations')}
                    style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reconectar WhatsApp
                  </button>
                </div>
              ) : null}

              {/* Notificação de retoma de campanha pausada quando a sessão volta */}
              {campaignData && campaignData.status === 'paused' && waServiceStatus?.connected && (
                <div style={{
                  margin: '0 0 18px',
                  padding: '14px 18px',
                  borderRadius: 12,
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  color: '#FFFFFF',
                  fontSize: 13
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCheck size={20} color="#4ADE80" />
                    <div>
                      <strong style={{ color: '#4ADE80', fontSize: 13.5, display: 'block' }}>
                        WhatsApp Reconectado — Campanha &quot;{campaignData.name}&quot; pronta para retoma
                      </strong>
                      <span style={{ fontSize: 12, color: '#CBD5E1' }}>
                        A campanha foi pausada automaticamente por segurança. Resumo: <b>{campaignData.stats?.sent || 0} enviadas</b> de {campaignData.stats?.total || 0} leads (restam {Math.max(0, (campaignData.stats?.total || 0) - (campaignData.stats?.sent || 0) - (campaignData.stats?.failed || 0) - (campaignData.stats?.ignored || 0))}).
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleResumeCampaign}
                      style={{ background: '#22C55E', color: '#000000', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Play size={14} fill="#000000" /> Retomar Campanha
                    </button>
                    {view !== 'integrations' && (
                      <button
                        type="button"
                        onClick={() => navigate('integrations')}
                        style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                      >
                        Ver Fila
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Onboarding */}
          {!user.profile.onboarded && view !== 'admin' && (
            <section className="panel onboarding">
              <div><span className="eyebrow">BEM-VINDO À PROSPECTA</span><h2>Primeiro, diga-nos o que faz.</h2><p className="muted">A sua apresentação ajuda a preparar abordagens com a sua voz.</p></div>
              <ProfileForm user={user} profile={profile || user.profile} busy={busy} onSubmit={saveProfile} />
            </section>
          )}

          {/* ══ VIEW: Oportunidades grátis ════════════════ */}
          {user.profile.onboarded && view === 'opportunities' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><Sparkles size={14} /> TESTE GRÁTIS · 3 DIAS</div>
                  <h1>As suas primeiras oportunidades. <span className="wave">✳</span></h1>
                  <p>Explore leads reais sem pagar. Comece hoje mesmo.</p>
                </div>
                <button className="button" onClick={() => navigate('search')}><Plus size={18} /> Encontrar mais</button>
              </div>

              {/* Trial progress */}
              <div className="trial-banner">
                {(['Hoje', 'Dia 2', 'Dia 3'] as const).map((label, i) => (
                  <button key={i} className={cls('trial-day', i === trialDay && 'active', i < trialDay && 'done')} onClick={() => { setTrialDay(i); loadDailyOpportunities(i); }}>
                    {i < trialDay ? <Check size={14} /> : <span className="trial-num">{i + 1}</span>}
                    {label}
                  </button>
                ))}
                <div className="trial-progress"><span style={{ width: `${(trialDay / 2) * 100}%` }} /></div>
              </div>

              {/* Opportunity cards */}
              <p className="section-label">Oportunidades de {trialDay === 0 ? 'hoje' : trialDay === 1 ? 'amanhã (Dia 2)' : 'depois de amanhã (Dia 3)'}</p>
              <div className="opp-grid">
                {dailyOpps.map(opp => (
                  <article key={opp.id} className="opp-card">
                    <div className="opp-card-top">
                      <span className="opp-initial" style={{ background: 'rgba(24, 119, 242, 0.15)', color: opp.color || '#38BDF8', borderColor: 'rgba(37, 99, 235, 0.3)' }}>{opp.initial || opp.name.charAt(0)}</span>
                      <div className="opp-meta">
                        <h3>{opp.name}</h3>
                        <span>{opp.category} · {opp.locality}</span>
                      </div>
                      <div className="opp-stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={13} fill={i < (opp.stars || 5) ? '#e9b458' : 'none'} stroke={i < (opp.stars || 5) ? '#e9b458' : 'rgba(255, 255, 255, 0.2)'} />
                        ))}
                      </div>
                    </div>
                    <div className="opp-actions">
                      {opp.phone ? (
                        <a className="button whatsapp opp-btn" href={`https://wa.me/${opp.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                          <MessageCircle size={15} /> Chamar no WhatsApp
                        </a>
                      ) : (
                        <button className="button outline opp-btn" onClick={() => loadBusiness(opp.id, 'business', opp)}>
                          <Phone size={14} /> Ver contacto
                        </button>
                      )}
                      <button className="button outline opp-btn" onClick={() => loadBusiness(opp.id, 'business', opp)}>
                        Ver lead <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* ══ VIEW: Hoje ════════════════════════════════ */}
          {user.profile.onboarded && view === 'today' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><CalendarDays size={14} /> RESUMO DO DIA</div>
                  <h1>{greeting()}, {user.name.split(' ')[0]} 👋</h1>
                  <p>Aqui está o resumo das suas actividades de hoje.</p>
                </div>
                <button className="button" onClick={() => navigate('search')}><Plus size={18} /> Encontrar clientes</button>
              </div>

              {/* Stats */}
              <div className="stat-grid">
                {[
                  { label: 'Leads salvos', value: dashboard?.leads ?? 0, icon: Bookmark, color: 'blue', detail: 'Empresas no seu acompanhamento' },
                  { label: 'Seguimentos hoje', value: dashboard?.due ?? 0, icon: CalendarDays, color: 'amber', detail: 'Até ao final de hoje' },
                  { label: 'Créditos', value: user.credits.available, icon: Sparkles, color: 'blue', detail: 'Para preparar abordagens' },
                  { label: 'Em negociação', value: money(dashboard?.proposalsMinor ?? 0), icon: TrendingUp, color: 'green', detail: 'Soma das oportunidades em Proposta' },
                ].map(s => (
                  <article className="stat-card" key={s.label}>
                    <div className="row"><span>{s.label}</span><span className={'stat-icon ' + s.color}><s.icon size={18} /></span></div>
                    <strong>{s.value}</strong>
                    <p>{s.detail}</p>
                  </article>
                ))}
              </div>

              <div className="dashboard-grid">
                {/* Pipeline */}
                <section className="panel">
                  <div className="panel-heading">
                    <div><h2>O caminho de cada oportunidade</h2><p>Do primeiro contacto à próxima conquista.</p></div>
                    <Pill>{dashboard?.leads ?? 0} no total</Pill>
                  </div>
                  <div className="pipeline-summary">
                    {STAGES.map((stage, i) => (
                      <button key={stage} onClick={() => { setStageFilter(stage); navigate('leads'); }}>
                        <span className={'stage-dot stage-' + i} /><span>{stage}</span>
                        <b>{dashboard?.stages.find(s => s.stage === stage)?.count ?? 0}</b>
                        <div className="pipeline-bar"><span style={{ width: `${Math.max(3, (dashboard?.stages[i]?.count || 0) / Math.max(1, dashboard?.leads || 1) * 100)}%` }} /></div>
                      </button>
                    ))}
                  </div>
                  <div className="panel-footer">
                    <span><CircleCheck size={14} /> Etapas actualizadas por si</span>
                    <button className="text-button" onClick={() => navigate('leads')}>Ver oportunidades <ArrowRight size={14} /></button>
                  </div>
                </section>

                {/* Meta de hoje */}
                <section className="panel today-meta-card">
                  <div className="panel-heading">
                    <div><h2>Meta de hoje</h2><p>Contactos realizados hoje</p></div>
                    <Target size={19} />
                  </div>
                  <div className="meta-circle-wrap">
                    <CircleScore value={0} max={5} size={80} color="#1877F2" />
                    <div><strong>0 / 5</strong><small>contactos hoje</small></div>
                  </div>
                  <div className="meta-progress"><span style={{ width: '0%' }} /></div>
                  <p className="micro muted" style={{ padding: '12px 24px 20px' }}>Realize 5 contactos hoje para atingir a sua meta diária.</p>
                </section>
              </div>

              <div className="dashboard-grid">
                {/* Próximos passos */}
                <section className="panel">
                  <div className="panel-heading"><div><h2>Os seus próximos passos</h2><p>Pequenas acções mantêm as conversas vivas.</p></div><CalendarDays size={19} /></div>
                  {dashboard?.tasks.length
                    ? dashboard.tasks.map(l => (
                      <button className="task-row" key={l.id} onClick={() => { setSelectedLead(l); navigate('leads'); }}>
                        <span className="soft-icon"><CalendarDays size={20} /></span>
                        <span><b>{l.business.name}</b><small>{l.nextAction || 'Retomar a conversa'} · {l.nextActionAt && date(l.nextActionAt)}</small></span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))
                    : <Empty icon={<CalendarDays size={26} />} title="Agenda livre, possibilidades abertas." description="Agende um seguimento numa oportunidade e encontre aqui o próximo passo." />
                  }
                </section>

                {/* Leads do Dia */}
                <section className="panel">
                  <div className="panel-heading"><div><h2>Leads do Dia</h2><p>Actividade recente no seu espaço.</p></div><CalendarDays size={18} /></div>
                  {dashboard?.recent.length
                    ? <div className="activity-list">
                      {dashboard.recent.slice(0, 5).map(a => (
                        <div key={a.id}><span className="activity-dot" /><div><p>{a.note}</p><small>{date(a.createdAt)}</small></div></div>
                      ))}
                    </div>
                    : <Empty icon={<ArrowUpRight size={26} />} title="A sua história começa agora." description="As empresas guardadas e as alterações aparecerão aqui." />
                  }
                </section>
              </div>
            </>
          )}

          {/* ══ VIEW: Encontrar clientes ══════════════════ */}
          {user.profile.onboarded && view === 'search' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><Compass size={14} /> RADAR DE OPORTUNIDADES</div>
                  <h1>O próximo cliente pode estar aqui.</h1>
                  <p>Defina o nicho e as cidades. Localize negócios reais e identifique pontos de contacto.</p>
                </div>
                <span className="national-badge"><Globe2 size={18} /> Cobertura nacional</span>
              </div>

              <div className="search-layout">
                {/* Radar form */}
                <section className="panel search-panel radar-search-panel">
                  <form onSubmit={e => { e.preventDefault(); doSearch(); }}>
                    <div className="filter-heading">
                      <span><Radar size={17} /> Nova busca</span>
                      <button type="button" className="text-button muted" onClick={() => setFilters({ niche: '', cities: '', phone: 'all', website: 'all', instagram: 'all', province: '', country: 'MZ', locality: '', category: '', service: user.profile.service, budget: 11 })}>Limpar campos</button>
                    </div>
                    <div className="radar-row-geo">
                      {/* 1. Nicho */}
                      <label className="field-group">
                        <span className="field-label">1. Nicho</span>
                        <input
                          value={filters.niche || ''}
                          onChange={e => setFilters({ ...filters, niche: e.target.value })}
                          placeholder="Ex.: Clínicas odontológicas, Restaurantes, Salões"
                        />
                      </label>

                      {/* 2. Cidade */}
                      <label className="field-group">
                        <span className="field-label">2. Cidade(s)</span>
                        <input
                          value={filters.cities || ''}
                          onChange={e => setFilters({ ...filters, cities: e.target.value })}
                          placeholder={
                            (filters.country || 'MZ') === 'MZ' ? 'Maputo, Matola, Beira' :
                            filters.country === 'AO' ? 'Luanda, Benguela, Lubango' :
                            filters.country === 'PT' ? 'Lisboa, Porto, Braga' :
                            filters.country === 'BR' ? 'São Paulo, Rio de Janeiro' :
                            'Cidade(s) separadas por vírgula'
                          }
                        />
                      </label>

                      {/* 3. Província / Região */}
                      <label className="field-group">
                        <span className="field-label">3. Província / Região</span>
                        <select
                          value={filters.province || ''}
                          onChange={e => setFilters({ ...filters, province: e.target.value })}
                        >
                          <option value="">Todas as províncias / regiões</option>
                          {getCountryByCode(filters.country || 'MZ').provinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </label>

                      {/* 4. País */}
                      <label className="field-group">
                        <span className="field-label">4. País</span>
                        <select
                          value={filters.country || 'MZ'}
                          onChange={e => {
                            const newCountry = e.target.value;
                            setFilters({ ...filters, country: newCountry, province: '' });
                          }}
                        >
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="radar-row-2">
                      <label className="field-group"><span className="field-label">Telefone / WhatsApp</span>
                        <select value={filters.phone || 'all'} onChange={e => setFilters({ ...filters, phone: e.target.value })}>
                          <option value="all">Todos os contactos</option>
                          <option value="with_whatsapp">Com WhatsApp provável</option>
                          <option value="without_whatsapp">Sem WhatsApp (Contacto manual)</option>
                          <option value="with_phone">Qualquer telefone</option>
                        </select>
                      </label>
                      <label className="field-group"><span className="field-label">Website</span>
                        <select value={filters.website || 'all'} onChange={e => setFilters({ ...filters, website: e.target.value })}>
                          <option value="all">Todos</option><option value="without_website">Sem website</option><option value="with_website">Com website</option>
                        </select>
                      </label>
                      <label className="field-group"><span className="field-label">Instagram</span>
                        <select value={filters.instagram || 'all'} onChange={e => setFilters({ ...filters, instagram: e.target.value })}>
                          <option value="all">Todos</option><option value="with_instagram">Com Instagram</option><option value="without_instagram">Sem Instagram</option>
                        </select>
                      </label>
                      <label className="field-group"><span className="field-label">O serviço que oferece</span>
                        <select value={filters.service || SERVICES[0]} onChange={e => setFilters({ ...filters, service: e.target.value })}>
                          {SERVICES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </label>
                      <div className="radar-action-col">
                        <button className="button radar-submit-button" disabled={busy}>
                          {busy ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}Buscar negócios
                        </button>
                      </div>
                    </div>
                  </form>
                  {pastSearches.length > 0 && (
                    <div className="radar-my-searches">
                      <div className="radar-my-searches-header">
                        <span className="radar-my-searches-title"><Clock3 size={15} /> Minhas buscas <small>(Retome buscas anteriores)</small></span>
                      </div>
                      <div className="radar-search-pills">
                        {pastSearches.map(item => {
                          const nichePart = item.filters.niche || item.filters.category || 'Qualquer nicho';
                          const locPart = item.filters.cities || item.filters.locality || item.filters.province || 'Todo Moçambique';
                          const statusPart = item.status === 'succeeded' ? 'Concluída' : item.status === 'running' ? 'Em curso' : item.status === 'partial' ? 'Parcial' : 'Incompleta';
                          return (
                            <button key={item.id} type="button" className={cls('radar-search-pill', searchResult?.id === item.id && 'active')} onClick={() => resumeSearch(item)}>
                              <span className="pill-query">{nichePart} — {locPart}</span>
                              <span className="pill-dot">·</span>
                              <span className="pill-status">{statusPart}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>

                {/* Análise profunda card */}
                <aside className="analysis-card-aside">
                  <div className="analysis-deep-card">
                    <div className="adc-header"><span className="eyebrow"><Sparkles size={13} /> ANÁLISE PROFUNDA</span></div>
                    <div className="adc-score-row">
                      <CircleScore value={87} max={100} size={72} color="#1877F2" />
                      <div>
                        <strong className="adc-score-label">Score de oportunidade</strong>
                        <p>Alta probabilidade de interesse</p>
                      </div>
                    </div>
                    {(() => {
                      const currentService = filters.service || user.profile.service || 'Criação de websites';
                      const currentNiche = filters.niche || searchResult?.filters.niche || '';
                      const pricing = getRecommendedPricing(currentService, currentNiche);
                      return (
                        <div className="adc-pricing-box" style={{ background: 'rgba(24, 119, 242, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 10, padding: '10px 12px', margin: '12px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700, letterSpacing: '0.5px' }}>VALOR RECOMENDADO</span>
                            <span style={{ fontSize: 9, background: 'rgba(37, 99, 235, 0.25)', color: '#bfdbfe', padding: '1px 6px', borderRadius: 10 }}>{pricing.period === 'mês' ? 'Mensal' : 'Setup'}</span>
                          </div>
                          <strong style={{ fontSize: 18, color: '#60a5fa', display: 'block', letterSpacing: '-0.3px', marginBottom: 3 }}>{pricing.formattedRange}</strong>
                          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>{pricing.rationale}</p>
                        </div>
                      );
                    })()}
                    <button className="button full" onClick={() => notify('Seleccione uma empresa para gerar análise profunda.')}>
                      <Sparkles size={16} /> Gerar análise · 1 crédito
                    </button>
                    <p className="micro muted" style={{ textAlign: 'center', marginTop: 10 }}>Baseado no perfil e dados disponíveis</p>
                  </div>
                </aside>
              </div>

              {/* Results */}
              {searchResult ? (
                <>
                  <div className="results-heading">
                    <div>
                      <h2>{searchResult.total} empresas encontradas <Pill>Fonte autorizada</Pill></h2>
                      <p>{[searchResult.filters.niche, searchResult.filters.cities].filter(Boolean).join(' — ') || [searchResult.filters.province, searchResult.filters.locality].filter(Boolean).join(' · ') || (getCountryByCode(searchResult.filters.country || 'MZ')?.name || 'Moçambique')} · Página {searchResult.page} de {searchResult.pages}</p>
                    </div>
                    <span className="muted micro">{searchResult.status === 'succeeded' ? 'Consulta concluída' : searchResult.status === 'partial' ? 'Consulta parcial' : searchResult.status === 'failed' ? 'Falha na consulta' : 'A consultar as zonas…'}</span>
                  </div>
                  <div className="coverage-progress">
                    {searchResult.tasks.map(task => (
                      <span key={task.province} className={cls(task.status === 'succeeded' && 'complete', task.status === 'failed' && 'failed')} title={task.error || `${task.count} resultados nesta fonte`}>
                        {task.status === 'succeeded' ? <Check size={12} /> : <Clock3 size={12} />} {task.province}<b>{task.count}</b>
                      </span>
                    ))}
                  </div>
                  {(() => {
                    const seenNames = new Set<string>();
                    const uniqueResults = searchResult.results.filter(b => {
                      const k = (b.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                      if (seenNames.has(k)) return false;
                      seenNames.add(k);
                      return true;
                    });
                    const currentCountryCode = searchResult.filters.country || 'MZ';
                    const withWaList = uniqueResults.filter(b => isLikelyWhatsApp(b.phone, b.country || currentCountryCode));
                    const noWaList = uniqueResults.filter(b => !isLikelyWhatsApp(b.phone, b.country || currentCountryCode));
                    const displayedResults =
                      resultsSubTab === 'with_whatsapp' ? withWaList :
                      resultsSubTab === 'no_whatsapp' ? noWaList :
                      uniqueResults;

                    const allDisplayedSelected = displayedResults.length > 0 && displayedResults.every(b => selectedBizIds.includes(b.id));

                    return (
                      <>
                        {/* Subtabs for filtering / reports */}
                        <div className="results-subtabs">
                          <button
                            type="button"
                            className={cls('results-subtab', resultsSubTab === 'all' && 'active')}
                            onClick={() => setResultsSubTab('all')}
                          >
                            <Building2 size={15} /> Todas <span className="badge">{uniqueResults.length}</span>
                          </button>
                          <button
                            type="button"
                            className={cls('results-subtab', resultsSubTab === 'with_whatsapp' && 'active')}
                            onClick={() => setResultsSubTab('with_whatsapp')}
                          >
                            <MessageCircle size={15} /> Com WhatsApp <span className="badge">{withWaList.length}</span>
                          </button>
                          <button
                            type="button"
                            className={cls('results-subtab', resultsSubTab === 'no_whatsapp' && 'active')}
                            onClick={() => setResultsSubTab('no_whatsapp')}
                          >
                            <Phone size={15} /> Sem WhatsApp (Manual) <span className="badge">{noWaList.length}</span>
                          </button>

                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="text-button"
                              style={{ fontSize: 12 }}
                              onClick={() => {
                                const currentIds = displayedResults.map(b => b.id);
                                if (allDisplayedSelected) {
                                  setSelectedBizIds(prev => prev.filter(id => !currentIds.includes(id)));
                                } else {
                                  setSelectedBizIds(prev => Array.from(new Set([...prev, ...currentIds])));
                                }
                              }}
                            >
                              {allDisplayedSelected ? 'Desmarcar lista' : `Selecionar visíveis (${displayedResults.length})`}
                            </button>
                            {resultsSubTab === 'no_whatsapp' && noWaList.length > 0 && (
                              <button
                                type="button"
                                className="button outline compact"
                                style={{ fontSize: 11, padding: '4px 10px' }}
                                onClick={() => exportBusinessesToCsv(noWaList, `prospecta_sem_whatsapp_${searchResult.filters.niche || 'leads'}.csv`)}
                              >
                                <Download size={13} /> Exportar CSV
                              </button>
                            )}
                          </div>
                        </div>

                        {/* If in 'no_whatsapp' mode: dedicated report table */}
                        {resultsSubTab === 'no_whatsapp' ? (
                          noWaList.length === 0 ? (
                            <section className="panel">
                              <Empty
                                icon={<CheckCheck size={28} style={{ color: '#25D366' }} />}
                                title="Excelente! Todas as empresas desta busca têm WhatsApp móvel."
                                description="Pode avançar diretamente para o disparo em lote ou abordagem individual."
                              />
                            </section>
                          ) : (
                            <div className="no-wa-table-container">
                              <div style={{ padding: '12px 16px', background: 'rgba(234, 179, 8, 0.08)', borderBottom: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fef08a' }}>
                                  <AlertTriangle size={16} />
                                  <span><b>{noWaList.length}</b> empresas sem WhatsApp móvel detectado. Insira o contacto manualmente ou ligue para o fixo.</span>
                                </div>
                                <button
                                  type="button"
                                  className="button outline compact"
                                  onClick={() => exportBusinessesToCsv(noWaList, `prospecta_sem_whatsapp_${searchResult.filters.niche || 'leads'}.csv`)}
                                >
                                  <Download size={13} /> Descarregar Lista CSV
                                </button>
                              </div>
                              <table className="no-wa-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: 40, textAlign: 'center' }}>
                                      <input
                                        type="checkbox"
                                        checked={allDisplayedSelected}
                                        onChange={() => {
                                          const currentIds = noWaList.map(b => b.id);
                                          if (allDisplayedSelected) setSelectedBizIds(prev => prev.filter(id => !currentIds.includes(id)));
                                          else setSelectedBizIds(prev => Array.from(new Set([...prev, ...currentIds])));
                                        }}
                                      />
                                    </th>
                                    <th>Empresa</th>
                                    <th>Localidade</th>
                                    <th>Contacto Actual</th>
                                    <th>Score</th>
                                    <th>Registar WhatsApp Manual</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {noWaList.map(b => {
                                    const isEditing = inlinePhoneBizId === b.id;
                                    const cObj = getCountryByCode(b.country || currentCountryCode);
                                    return (
                                      <tr key={b.id}>
                                        <td style={{ textAlign: 'center' }}>
                                          <input
                                            type="checkbox"
                                            checked={selectedBizIds.includes(b.id)}
                                            onChange={() => setSelectedBizIds(prev => prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id])}
                                          />
                                        </td>
                                        <td>
                                          <strong style={{ color: '#F8FAFC', display: 'block' }}>{b.name}</strong>
                                          <small style={{ color: '#94A3B8' }}>{b.category || b.activity}</small>
                                        </td>
                                        <td>
                                          <span>{b.locality || b.city || b.province}</span>
                                          <small style={{ display: 'block', color: '#64748B' }}>{cObj.flag} {cObj.name}</small>
                                        </td>
                                        <td>
                                          {b.phone ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(234, 179, 8, 0.12)', color: '#facc15', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>
                                              <Phone size={12} /> {formatPhone(b.phone) || b.phone} (Fixo)
                                            </span>
                                          ) : (
                                            <span style={{ color: '#EF4444', fontSize: 12 }}>Sem telefone</span>
                                          )}
                                        </td>
                                        <td>
                                          <span style={{ fontWeight: 700, color: '#38BDF8', fontSize: 13 }}>{b.opportunityScore || 85}</span>
                                        </td>
                                        <td>
                                          {isEditing ? (
                                            <div className="no-wa-input-row">
                                              <input
                                                type="text"
                                                className="no-wa-input"
                                                value={inlinePhoneVal}
                                                placeholder={cObj.code === 'MZ' ? '+258 84...' : '+...'}
                                                autoFocus
                                                onChange={e => setInlinePhoneVal(e.target.value)}
                                                onKeyDown={e => {
                                                  if (e.key === 'Enter') {
                                                    handleUpdateBusinessPhone(b.id, inlinePhoneVal);
                                                    setInlinePhoneBizId(null);
                                                    notify('Contacto guardado com sucesso!');
                                                  } else if (e.key === 'Escape') {
                                                    setInlinePhoneBizId(null);
                                                  }
                                                }}
                                              />
                                              <button
                                                type="button"
                                                className="button compact"
                                                style={{ padding: '5px 10px', fontSize: 11 }}
                                                onClick={() => {
                                                  handleUpdateBusinessPhone(b.id, inlinePhoneVal);
                                                  setInlinePhoneBizId(null);
                                                  notify('Contacto guardado com sucesso!');
                                                }}
                                              >
                                                Salvar
                                              </button>
                                              <IconButton label="Cancelar" onClick={() => setInlinePhoneBizId(null)}><X size={14} /></IconButton>
                                            </div>
                                          ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                              <button
                                                type="button"
                                                className="text-button"
                                                style={{ fontSize: 12, color: '#60A5FA', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                onClick={() => {
                                                  setInlinePhoneBizId(b.id);
                                                  setInlinePhoneVal(b.phone || '');
                                                }}
                                              >
                                                <Plus size={13} /> {b.phone ? 'Inserir WhatsApp' : 'Adicionar contacto'}
                                              </button>
                                              <a
                                                href={getGoogleMapsUrl(b.name, b.locality, b.province, cObj.name)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="card-map-action"
                                                style={{ margin: 0, padding: '3px 7px', fontSize: 11 }}
                                                title="Verificar telefone no perfil Google Maps"
                                              >
                                                <MapPin size={11} /> Maps
                                              </a>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )
                        ) : (
                          /* Grid view */
                          displayedResults.length ? (
                            <div className="business-grid">
                              {displayedResults.map(b => (
                                <BusinessCard
                                  key={b.id}
                                  business={b}
                                  busy={busy}
                                  selected={selectedBizIds.includes(b.id)}
                                  onToggleSelect={() => setSelectedBizIds(prev => prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id])}
                                  onView={() => run(() => loadBusiness(b.id, 'business', b))}
                                  onSave={() => saveBusiness(b)}
                                  onUpdatePhone={(phone) => handleUpdateBusinessPhone(b.id, phone)}
                                />
                              ))}
                            </div>
                          ) : (
                            <section className="panel">
                              <Empty
                                icon={<Search size={30} />}
                                title={searchResult.status === 'failed' ? 'Não foi possível consultar a fonte.' : 'Nenhuma empresa encontrada com este filtro.'}
                                description="Alterne para a aba 'Todas' ou experimente outro nicho/cidade."
                              >
                                <button className="button outline" onClick={() => setResultsSubTab('all')}>Ver todas as empresas</button>
                              </Empty>
                            </section>
                          )
                        )}
                      </>
                    );
                  })()}
                  <div className="pagination">
                    <span>{searchResult.total} resultados nesta fonte · Não é um inventário completo</span>
                    <div>
                      <IconButton label="Página anterior" onClick={() => searchResult.page > 1 && doSearch(searchResult.page - 1)}><ChevronLeft size={18} /></IconButton>
                      <b>{searchResult.page}</b>
                      <IconButton label="Página seguinte" onClick={() => searchResult.page < searchResult.pages && doSearch(searchResult.page + 1)}><ChevronRight size={18} /></IconButton>
                    </div>
                  </div>

                  {/* STICKY BULK ACTION BAR */}
                  {selectedBizIds.length > 0 && (
                    <div className="bulk-action-bar">
                      <div className="bulk-action-info">
                        <span className="bulk-badge">{selectedBizIds.length}</span>
                        <span>empresa{selectedBizIds.length > 1 ? 's' : ''} selecionada{selectedBizIds.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="bulk-action-buttons">
                        <button
                          type="button"
                          className="button outline compact"
                          style={{ fontSize: 12 }}
                          onClick={() => setSelectedBizIds([])}
                        >
                          Limpar seleção
                        </button>
                        <button
                          type="button"
                          className="button compact"
                          style={{ background: '#25D366', color: '#000', fontWeight: 700, fontSize: 13 }}
                          onClick={() => {
                            setBulkPreviewIndex(0);
                            setIsBulkModalOpen(true);
                          }}
                        >
                          <MessageCircle size={16} /> Disparo em lote ({selectedBizIds.length})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MODAL DE DISPARO EM LOTE COM PREVIEW INDIVIDUALIZADO */}
                  {isBulkModalOpen && (() => {
                    const selectedBusinesses = (searchResult?.results || []).filter(b => selectedBizIds.includes(b.id));
                    const currentCountryCode = searchResult?.filters.country || 'MZ';
                    const withWaList = selectedBusinesses.filter(b => isLikelyWhatsApp(b.phone, b.country || currentCountryCode));
                    const withoutWaList = selectedBusinesses.filter(b => !isLikelyWhatsApp(b.phone, b.country || currentCountryCode));
                    const currentBiz = withWaList[bulkPreviewIndex] || withWaList[0];
                    const interpolatedPreview = currentBiz ? interpolateMessage(bulkTemplate, currentBiz, user?.name || 'Chelton', filters.service || user?.profile.service) : '';

                    const insertVar = (variable: string) => {
                      setBulkTemplate(prev => prev + ' ' + variable);
                    };

                    return (
                      <div className="bulk-modal-overlay" onClick={() => setIsBulkModalOpen(false)}>
                        <div className="bulk-modal-content" onClick={e => e.stopPropagation()}>
                          <div className="bulk-modal-header">
                            <div>
                              <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MessageCircle size={20} color="#25D366" /> Disparo em Lote Personalizado
                              </h2>
                              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
                                Cada mensagem substitui automaticamente o nome real da empresa e detalhes individuais com fila anti-bloqueio.
                              </p>
                            </div>
                            <IconButton label="Fechar modal" onClick={() => setIsBulkModalOpen(false)}>
                              <X size={18} />
                            </IconButton>
                          </div>

                          {/* WhatsApp Status Banner */}
                          <div style={{
                            background: waServiceStatus?.connected ? 'rgba(37, 211, 102, 0.12)' : 'rgba(234, 179, 8, 0.1)',
                            border: `1px solid ${waServiceStatus?.connected ? 'rgba(37, 211, 102, 0.35)' : 'rgba(234, 179, 8, 0.3)'}`,
                            borderRadius: 10,
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 14,
                            flexWrap: 'wrap',
                            gap: 10
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: waServiceStatus?.connected ? '#25D366' : '#FACC15', fontWeight: 600 }}>
                              {waServiceStatus?.connected ? <CircleCheck size={16} /> : <AlertTriangle size={16} />}
                              <span>
                                {waServiceStatus?.connected
                                  ? `WhatsApp Ativo: +${waServiceStatus.user || 'Conectado'} (Disparo 100% automático pronto)`
                                  : 'WhatsApp não conectado (Leia o QR Code na aba Integrações)'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              {!waServiceStatus?.connected && (
                                <button
                                  type="button"
                                  className="button compact"
                                  style={{ background: '#25D366', color: '#000', fontSize: 11, padding: '4px 10px', fontWeight: 700 }}
                                  onClick={() => setView('integrations')}
                                >
                                  Ler QR Code
                                </button>
                              )}
                              <button
                                type="button"
                                className="text-button"
                                style={{ fontSize: 11, color: '#93C5FD' }}
                                onClick={checkWhatsAppStatus}
                              >
                                Verificar conexão
                              </button>
                            </div>
                          </div>

                          {/* Status summary pills */}
                          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                            <span className="pill" style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.3)' }}>
                              <CheckCheck size={14} /> {withWaList.length} prontas com WhatsApp
                            </span>
                            {withoutWaList.length > 0 && (
                              <span className="pill" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#FACC15', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                <AlertTriangle size={14} /> {withoutWaList.length} sem WhatsApp (ignorado no disparo automático)
                              </span>
                            )}
                          </div>

                          {/* Variáveis dinâmicas inseríveis */}
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                              Variáveis dinâmicas (clique para inserir no modelo):
                            </label>
                            <div className="bulk-variables-bar">
                              <button type="button" className="variable-pill" onClick={() => insertVar('{nome_empresa}')}>
                                + &#123;nome_empresa&#125;
                              </button>
                              <button type="button" className="variable-pill" onClick={() => insertVar('{cidade}')}>
                                + &#123;cidade&#125;
                              </button>
                              <button type="button" className="variable-pill" onClick={() => insertVar('{nicho}')}>
                                + &#123;nicho&#125;
                              </button>
                              <button type="button" className="variable-pill" onClick={() => insertVar('{servico}')}>
                                + &#123;servico&#125;
                              </button>
                              <button type="button" className="variable-pill" onClick={() => insertVar('{responsavel}')}>
                                + &#123;responsavel&#125;
                              </button>
                            </div>
                          </div>

                          {/* Editor do modelo */}
                          <label style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                            Modelo da mensagem para todos os leads:
                          </label>
                          <textarea
                            className="message-editor"
                            style={{ height: 110, fontSize: 13, marginBottom: 14 }}
                            value={bulkTemplate}
                            onChange={e => setBulkTemplate(e.target.value)}
                            placeholder="Escreva a mensagem usando {nome_empresa} para personalizar..."
                          />

                          {/* Live Individualized Preview Box */}
                          {withWaList.length > 0 && currentBiz ? (
                            <div className="whatsapp-preview-box">
                              <div className="bulk-preview-nav">
                                <span>
                                  Pré-visualização individualizada: <b>{bulkPreviewIndex + 1} de {withWaList.length}</b> ({currentBiz.name})
                                </span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <IconButton
                                    label="Empresa anterior"
                                    onClick={() => setBulkPreviewIndex(prev => (prev > 0 ? prev - 1 : withWaList.length - 1))}
                                  >
                                    <ChevronLeft size={16} />
                                  </IconButton>
                                  <IconButton
                                    label="Próxima empresa"
                                    onClick={() => setBulkPreviewIndex(prev => (prev < withWaList.length - 1 ? prev + 1 : 0))}
                                  >
                                    <ChevronRight size={16} />
                                  </IconButton>
                                </div>
                              </div>
                              <div className="whatsapp-bubble">
                                {interpolatedPreview}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: '#94A3B8' }}>
                                <span>Destinatário: <b>{currentBiz.name}</b> · {currentBiz.phone}</span>
                                <button
                                  type="button"
                                  className="text-button"
                                  style={{ fontSize: 11, color: '#25D366' }}
                                  onClick={() => {
                                    navigator.clipboard.writeText(interpolatedPreview);
                                    notify(`Mensagem personalizada para "${currentBiz.name}" copiada!`);
                                  }}
                                >
                                  <Copy size={12} /> Copiar este texto individual
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: 16, textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 10, border: '1px dashed rgba(239, 68, 68, 0.3)', margin: '14px 0' }}>
                              <p style={{ color: '#fca5a5', margin: 0, fontSize: 13 }}>
                                Nenhuma das empresas selecionadas possui número de WhatsApp registado.
                              </p>
                              <small style={{ color: '#94a3b8' }}>
                                Registe os números manualmente na aba &quot;Sem WhatsApp&quot; ou selecione empresas com contacto móvel.
                              </small>
                            </div>
                          )}

                          {/* Modal Footer & Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, borderTop: '1px solid var(--navy-border)', paddingTop: 16, flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94A3B8' }}>
                              <ShieldCheck size={16} color="#34D399" />
                              <span>Fila anti-bloqueio com Baileys persistente (20s-60s por mensagem).</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="button outline compact"
                                  onClick={() => setIsBulkModalOpen(false)}
                                >
                                  Fechar
                                </button>
                                {withWaList.length > 0 && waServiceStatus?.connected && (
                                  <button
                                    type="button"
                                    className="button compact"
                                    style={{ background: '#25D366', color: '#000', fontWeight: 800 }}
                                    disabled={campaignLoading}
                                    onClick={() => handleCreateAndStartCampaign(withWaList)}
                                  >
                                    <Send size={15} /> {campaignLoading ? 'A iniciar...' : `Iniciar Campanha (${withWaList.length} leads)`}
                                  </button>
                                )}
                                {withWaList.length > 0 && currentBiz && (
                                  <button
                                    type="button"
                                    className="button outline compact"
                                    style={{ borderColor: '#25D366', color: '#25D366' }}
                                    onClick={() => {
                                      const cleanPhone = (currentBiz.phone || '').replace(/\D/g, '');
                                      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(interpolatedPreview)}`;
                                      window.open(url, '_blank');
                                      notify(`WhatsApp Web aberto para ${currentBiz.name} (${bulkPreviewIndex + 1}/${withWaList.length})!`);
                                      if (bulkPreviewIndex < withWaList.length - 1) {
                                        setBulkPreviewIndex(prev => prev + 1);
                                      }
                                    }}
                                  >
                                    <ExternalLink size={14} /> Abrir WhatsApp Web ({bulkPreviewIndex + 1}/{withWaList.length})
                                  </button>
                                )}
                              </div>
                            </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div className="results-heading"><h2>Oportunidades começam com uma pergunta.</h2></div>
                  <div className="search-start">
                    <div className="search-start-copy">
                      <span className="soft-icon"><Radar size={28} /></span>
                      <h2>Onde pode o seu<br />trabalho fazer diferença?</h2>
                      <p>Pesquise por nicho e cidade em Moçambique. Receba contexto para começar uma conversa relevante.</p>
                      <div className="quick-searches">
                        {[['Clínicas odontológicas', 'Maputo, Matola'], ['Restaurantes', 'Beira'], ['Salões de beleza', 'Nampula'], ['Oficinas e mecânica', 'Tete']].map(([n, c]) => (
                          <button key={n + c} onClick={() => setFilters({ ...filters, niche: n, cities: c })}><MapPin size={13} />{n} — {c}<ArrowUpRight size={13} /></button>
                        ))}
                      </div>
                    </div>
                    <div className="country-outline"><MozambiqueMap /><span><span className="live-dot" /> TODO MOÇAMBIQUE</span></div>
                  </div>
                </>
              )}

              <div className="integrity-note"><ShieldCheck size={18} /><p><b>Informação para conversar, não para presumir.</b> A disponibilidade varia por fonte. Confirme sempre as necessidades com a empresa.</p></div>
            </>
          )}

          {/* ══ VIEW: Buscas salvas ═══════════════════════ */}
          {user.profile.onboarded && view === 'saved-searches' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><Search size={14} /> BUSCAS SALVAS</div>
                  <h1>As suas pesquisas guardadas.</h1>
                  <p>Retome qualquer busca anterior com um clique.</p>
                </div>
                <button className="button" onClick={() => navigate('search')}><Plus size={18} /> Nova busca</button>
              </div>
              {pastSearches.length ? (
                <section className="panel">
                  <div className="panel-heading"><h2>Buscas anteriores</h2><span className="muted micro">{pastSearches.length} buscas guardadas</span></div>
                  <div style={{ paddingBottom: 16 }}>
                    {pastSearches.map(item => {
                      const nichePart = item.filters.niche || item.filters.category || 'Qualquer nicho';
                      const locPart = item.filters.cities || item.filters.locality || item.filters.province || 'Todo Moçambique';
                      return (
                        <button key={item.id} className="task-row" onClick={() => { navigate('search'); resumeSearch(item); }}>
                          <span className="soft-icon"><Search size={18} /></span>
                          <span><b>{nichePart} — {locPart}</b><small>{item.total} resultados · {item.status === 'succeeded' ? 'Concluída' : 'Parcial'}</small></span>
                          <ArrowRight size={17} />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <section className="panel">
                  <Empty icon={<Search size={28} />} title="Ainda não tem buscas salvas." description="Realize uma pesquisa em Encontrar clientes e ela ficará guardada aqui automaticamente.">
                    <button className="button" onClick={() => navigate('search')}>Fazer primeira busca <ArrowRight size={16} /></button>
                  </Empty>
                </section>
              )}
            </>
          )}

          {/* ══ VIEW: Leads salvos ════════════════════════ */}
          {user.profile.onboarded && view === 'leads' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><Bookmark size={14} /> RELAÇÕES QUE AVANÇAM</div>
                  <h1>Cada conversa, no seu lugar.</h1>
                  <p>Acompanhe oportunidades e não perca o próximo passo.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="button outline"
                    onClick={() => {
                      const filtered = leads.filter(l => (!stageFilter || l.stage === stageFilter) && l.business.name.toLowerCase().includes(leadSearch.toLowerCase()));
                      if (filtered.length === 0) {
                        notify('Nenhuma oportunidade disponível para exportar.', true);
                        return;
                      }
                      exportLeadsToCsv(filtered);
                      notify(`${filtered.length} lead(s) exportado(s) em CSV com sucesso!`);
                    }}
                    title="Descarregar ficheiro CSV com as suas oportunidades"
                  >
                    <Download size={16} /> Exportar Leads (CSV)
                  </button>
                  <button className="button" onClick={() => navigate('search')}><Plus size={17} /> Encontrar empresas</button>
                </div>
              </div>
              <div className="stage-filters">
                <button className={!stageFilter ? 'active' : ''} onClick={() => setStageFilter('')}>Todas <b>{leads.length}</b></button>
                {STAGES.map((s, i) => (
                  <button key={s} className={stageFilter === s ? 'active' : ''} onClick={() => setStageFilter(s)}>
                    <span className={'stage-dot stage-' + i} />{s}<b>{leads.filter(l => l.stage === s).length}</b>
                  </button>
                ))}
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>As suas oportunidades</h2>
                  <div className="inline-search"><Search size={16} /><input aria-label="Procurar oportunidades" placeholder="Procurar empresa…" value={leadSearch} onChange={e => setLeadSearch(e.target.value)} /></div>
                </div>
                {leads.filter(l => (!stageFilter || l.stage === stageFilter) && l.business.name.toLowerCase().includes(leadSearch.toLowerCase())).length
                  ? <div className="lead-list">
                    {leads.filter(l => (!stageFilter || l.stage === stageFilter) && l.business.name.toLowerCase().includes(leadSearch.toLowerCase())).map(l => (
                      <button className="lead-row" key={l.id} onClick={() => setSelectedLead(l)}>
                        <span className="business-icon"><Building2 size={21} /></span>
                        <div className="lead-name"><b>{l.business.name}</b><small>{l.business.locality} · {l.business.province}</small></div>
                        <Pill tone={'stage-tone-' + STAGES.indexOf(l.stage)}>{l.stage}</Pill>
                        <span className="lead-followup">{l.nextAction || 'Definir próximo passo'}<small>{l.nextActionAt ? date(l.nextActionAt) : 'Sem data agendada'}</small></span>
                        <strong className="lead-amount">{l.amountMinor !== null ? money(l.amountMinor) : '—'}</strong>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                  : <Empty title={leads.length ? 'Nenhuma oportunidade neste filtro.' : 'A próxima relação começa aqui.'} description="Guarde empresas da pesquisa para acompanhar contactos, propostas e próximos passos.">
                    <button className="button" onClick={() => navigate('search')}>Encontrar empresas <ArrowRight size={16} /></button>
                  </Empty>
                }
              </section>
            </>
          )}

          {/* ══ VIEW: Portfólio (BETA) ════════════════════ */}
          {user.profile.onboarded && view === 'portfolio' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={14} /> PORTFÓLIO <Pill tone="amber">BETA</Pill></div>
                  <h1>O seu trabalho, apresentado.</h1>
                  <p>Crie um portfólio profissional para partilhar com clientes.</p>
                </div>
              </div>
              <section className="panel">
                <Empty icon={<FileText size={28} />} title="Portfólio em breve." description="Esta funcionalidade está em desenvolvimento. Em breve poderá criar e partilhar o seu portfólio profissional directamente pela Prospecta.">
                  <Pill tone="amber">BETA — Em desenvolvimento</Pill>
                </Empty>
              </section>
            </>
          )}

          {/* ══ VIEW: Integrações & Disparos WhatsApp ═══════ */}
          {user.profile.onboarded && view === 'integrations' && (() => {
            const activeSourceList: Business[] = integrationSource === 'search'
              ? (searchResult?.results || [])
              : leads.map(l => l.business);

            const withWaList = activeSourceList.filter(b => isLikelyWhatsApp(b.phone, b.country || filters.country || 'MZ'));
            const noWaList = activeSourceList.filter(b => !isLikelyWhatsApp(b.phone, b.country || filters.country || 'MZ'));

            const displayedList = integrationFilter === 'all'
              ? activeSourceList
              : integrationFilter === 'with_wa'
                ? withWaList
                : noWaList;

            const allDisplayedSelected = displayedList.length > 0 && displayedList.every(b => selectedBizIds.includes(b.id));

            const toggleSelectAll = () => {
              if (allDisplayedSelected) {
                const displayedIds = new Set(displayedList.map(b => b.id));
                setSelectedBizIds(prev => prev.filter(id => !displayedIds.has(id)));
              } else {
                setSelectedBizIds(prev => Array.from(new Set([...prev, ...displayedList.map(b => b.id)])));
              }
            };

            const selectedCount = activeSourceList.filter(b => selectedBizIds.includes(b.id)).length;
            const selectedWithWa = activeSourceList.filter(b => selectedBizIds.includes(b.id) && isLikelyWhatsApp(b.phone, b.country || filters.country || 'MZ')).length;

            const previewBiz = activeSourceList.find(b => selectedBizIds.includes(b.id)) || withWaList[0] || activeSourceList[0];
            const previewText = previewBiz
              ? interpolateMessage(bulkTemplate, previewBiz, user.name || 'Chelton', filters.service || user.profile.service)
              : bulkTemplate;

            return (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MessageCircle size={14} /> AUTOMAÇÃO COMERCIAL INTELIGENTE <Pill tone="emerald">BAILEYS PROD</Pill>
                    </div>
                    <h1>Central de Integrações & WhatsApp.</h1>
                    <p>Disparos automáticos em massa com mensagens personalizadas, rotação spintax e fila segura anti-bloqueio.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="button secondary" onClick={() => checkWhatsAppStatus()} title="Atualizar estado">
                      <RefreshCw size={15} /> Verificar Conexão
                    </button>
                    <button
                      className="button"
                      style={{ background: '#25D366', color: '#000', fontWeight: 800 }}
                      disabled={campaignLoading || withWaList.length === 0}
                      onClick={() => setShowConfirmModal(true)}
                    >
                      <Send size={15} /> Iniciar Campanha ({selectedWithWa > 0 ? selectedWithWa : withWaList.length})
                    </button>
                  </div>
                </div>

                {/* ══ GUIA DE BOAS PRÁTICAS ANTI-BLOQUEIO ══ */}
                {showBestPractices && (
                  <div style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 20,
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <strong style={{ fontSize: 14, color: '#60A5FA', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldCheck size={18} /> Guia de Boas Práticas para Prospeção Segura no WhatsApp
                      </strong>
                      <button
                        type="button"
                        onClick={() => setShowBestPractices(false)}
                        style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 12 }}
                      >
                        ✕ Ocultar Dicas
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.5 }}>
                      <div>
                        <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 2 }}>📱 Chip Dedicado</strong>
                        Utilize sempre um número móvel novo exclusivo para prospeção de vendas (nunca o seu número pessoal ou pessoal da família).
                      </div>
                      <div>
                        <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 2 }}>☕ Aquecimento</strong>
                        Troque conversas normais por 1 a 2 semanas antes de disparar campanhas maiores para criar histórico na Meta.
                      </div>
                      <div>
                        <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 2 }}>✍️ Personalização & Spintax</strong>
                        Use variáveis como &#123;nome_empresa&#125; e spintax &#123;Olá|Bom dia&#125; para que cada mensagem seja única e não aparente spam.
                      </div>
                      <div>
                        <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 2 }}>🚪 Opt-out Automático</strong>
                        Se qualquer contacto responder "SAIR" ou "PARAR", o sistema adiciona-o automaticamente à lista de exclusão e nunca mais lhe envia mensagens.
                      </div>
                    </div>
                  </div>
                )}

                {/* ══ 1. PAINEL DE CONEXÃO WHATSAPP ══ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18, marginBottom: 24 }}>
                  {/* Status & Controls */}
                  <div className="panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageCircle size={18} color="#25D366" />
                        Conexão WhatsApp
                      </h3>
                      {waServiceStatus?.connected ? (
                        <span style={{ background: 'rgba(34, 197, 94, 0.18)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ADE80', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>
                          🟢 ONLINE · +{waServiceStatus.user || 'Conectado'}
                        </span>
                      ) : waServiceStatus?.status === 'waiting_qr' ? (
                        <span style={{ background: 'rgba(234, 179, 8, 0.18)', border: '1px solid rgba(234, 179, 8, 0.4)', color: '#FACC15', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>
                          🟡 A AGUARDAR QR CODE
                        </span>
                      ) : waWakingUp ? (
                        <span style={{ background: 'rgba(59, 130, 246, 0.18)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#93C5FD', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>
                          🔵 A CONECTAR AO SERVIDOR...
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(239, 68, 68, 0.18)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#FCA5A5', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>
                          🔴 DESCONECTADO
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
                      Conexão direta e segura via Baileys multi-sessão com credenciais salvas na base de dados Supabase. Sobrevive a reinícios e mantém a sessão ativa.
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 'auto' }}>
                      <button className="button secondary" onClick={fetchWhatsAppQr} disabled={waQrLoading} style={{ fontSize: 12 }}>
                        <RefreshCw size={14} className={waQrLoading ? 'spin' : ''} /> {waQrLoading ? 'A gerar...' : 'Gerar / Atualizar QR Code'}
                      </button>
                      <button className="button secondary" onClick={handleResetWhatsApp} style={{ fontSize: 12, color: '#FCA5A5' }}>
                        Desconectar / Reset
                      </button>
                    </div>
                  </div>

                  {/* QR Code / Conectado visual */}
                  <div className="panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12 }}>
                    {waWakingUp ? (
                      <>
                        <LoaderCircle size={32} className="spin" color="#3B82F6" />
                        <strong style={{ color: '#93C5FD', fontSize: 14 }}>A ligar ao servidor de WhatsApp...</strong>
                        <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', maxWidth: 260 }}>
                          O serviço está a inicializar (arranque a frio). O QR Code surgirá em instantes.
                        </p>
                      </>
                    ) : waServiceStatus?.connected ? (
                      <>
                        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', border: '2px solid rgba(34, 197, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E' }}>
                          <CheckCheck size={36} />
                        </div>
                        <div>
                          <strong style={{ color: '#FFFFFF', fontSize: 16 }}>Sessão Ativa & Conectada</strong>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>Terminal sincronizado (+{waServiceStatus.user}). Pronto para disparos em massa.</p>
                        </div>
                      </>
                    ) : waServiceStatus?.qrDataUrl ? (
                      <>
                        <img src={waServiceStatus.qrDataUrl} alt="QR Code WhatsApp" style={{ width: 160, height: 160, borderRadius: 10, border: '3px solid #3B82F6', background: '#FFFFFF', padding: 4 }} />
                        <span style={{ fontSize: 12, color: '#93C5FD', fontWeight: 600 }}>WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho</span>
                        <small style={{ fontSize: 11, color: '#64748B' }}>Atualiza automaticamente a cada 50 segundos se expirar</small>
                      </>
                    ) : (
                      <>
                        <LoaderCircle size={32} className="spin" color="#3B82F6" />
                        <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>A sincronizar estado do motor de WhatsApp…</p>
                        <button className="button secondary" onClick={() => fetchWhatsAppQr()} style={{ fontSize: 12 }}>
                          Gerar QR Code
                        </button>
                      </>
                    )}
                  </div>

                  {/* Disparo de Teste Rápido */}
                  <div className="panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: 14, color: '#FFFFFF' }}>🚀 Disparo de Teste Imediato</strong>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>Normalização automática 258</span>
                    </div>
                    <label style={{ fontSize: 12, color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Número de teste (ex: 847404158):
                      <input
                        value={waTestPhone}
                        onChange={e => setWaTestPhone(e.target.value)}
                        placeholder="847404158 ou +258..."
                        style={{ padding: '8px 12px', fontSize: 13, borderRadius: 8, background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#FFFFFF' }}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Mensagem de teste:
                      <textarea
                        value={waTestMessage}
                        onChange={e => setWaTestMessage(e.target.value)}
                        rows={2}
                        style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8, background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#FFFFFF', resize: 'none' }}
                      />
                    </label>
                    <button
                      className="button"
                      onClick={handleSendTestMessage}
                      disabled={waTestSending || !waServiceStatus?.connected}
                      style={{ marginTop: 'auto', fontSize: 13, justifyContent: 'center' }}
                    >
                      {waTestSending ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
                      {waServiceStatus?.connected ? 'Enviar Teste ao Vivo' : 'Conecte o WhatsApp para Testar'}
                    </button>
                  </div>
                </div>

                {/* ══ PAINEL DE CAMPANHA ATIVA / PROGRESSO EM TEMPO REAL ══ */}
                {campaignData && (
                  <div className="panel" style={{ padding: 22, marginBottom: 24, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(59, 130, 246, 0.35)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: campaignData.status === 'running' ? '#22C55E' : campaignData.status === 'paused' ? '#FACC15' : '#3B82F6', boxShadow: campaignData.status === 'running' ? '0 0 12px #22C55E' : 'none' }} />
                        <strong style={{ fontSize: 16, color: '#FFFFFF' }}>{campaignData.name || 'Campanha em Execução'}</strong>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: campaignData.status === 'running' ? 'rgba(34, 197, 94, 0.2)' : campaignData.status === 'paused' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: campaignData.status === 'running' ? '#4ADE80' : campaignData.status === 'paused' ? '#FDE047' : '#93C5FD' }}>
                          {campaignData.status === 'running' ? '🚀 A ENVIAR NA FILA' : campaignData.status === 'paused' ? '⏸️ PAUSADA' : campaignData.status === 'completed' ? '🎉 CONCLUÍDA' : campaignData.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {campaignData.status === 'running' && (
                          <button className="button secondary" onClick={handlePauseCampaign} style={{ fontSize: 12 }}>
                            Pausar Campanha
                          </button>
                        )}
                        {campaignData.status === 'paused' && (
                          <button className="button" onClick={handleResumeCampaign} style={{ fontSize: 12, background: '#2563EB' }}>
                            Retomar Campanha
                          </button>
                        )}
                        {(campaignData.status === 'running' || campaignData.status === 'paused') && (
                          <button className="button secondary" onClick={handleCancelCampaign} style={{ fontSize: 12, color: '#FCA5A5' }}>
                            Cancelar
                          </button>
                        )}
                        <button className="button secondary" onClick={() => exportCampaignCsv(campaignData, campaignData.recipients || [])} style={{ fontSize: 12 }}>
                          <Download size={14} /> Exportar Relatório (CSV)
                        </button>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    {(() => {
                      const total = campaignData.stats?.total || 1;
                      const processed = (campaignData.stats?.sent || 0) + (campaignData.stats?.failed || 0) + (campaignData.stats?.ignored || 0) + (campaignData.stats?.optout || 0);
                      const percent = Math.min(100, Math.round((processed / total) * 100));
                      return (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#CBD5E1', marginBottom: 6 }}>
                            <span>Progresso do lote: <b>{processed} de {total}</b> leads processados</span>
                            <span style={{ fontWeight: 800, color: '#60A5FA' }}>{percent}%</span>
                          </div>
                          <div style={{ width: '100%', height: 10, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #2563EB, #22C55E)', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Badges de estatística */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                      <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8, fontSize: 12, color: '#4ADE80' }}>
                        <b>✅ Enviadas:</b> {campaignData.stats?.sent || 0}
                      </div>
                      <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, fontSize: 12, color: '#FCA5A5' }}>
                        <b>❌ Falhas:</b> {campaignData.stats?.failed || 0}
                      </div>
                      <div style={{ padding: '8px 12px', background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 8, fontSize: 12, color: '#FDE047' }}>
                        <b>⚠️ Sem WhatsApp:</b> {campaignData.stats?.ignored || 0}
                      </div>
                      <div style={{ padding: '8px 12px', background: 'rgba(148, 163, 184, 0.12)', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: 8, fontSize: 12, color: '#CBD5E1' }}>
                        <b>⛔ Opt-Out (SAIR):</b> {campaignData.stats?.optout || 0}
                      </div>
                    </div>

                    {/* Alerta de Desconexão / Caixa de Retoma Segura */}
                    {campaignData.status === 'paused' && (
                      <div style={{
                        marginTop: 14,
                        padding: '14px 16px',
                        background: waServiceStatus?.connected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                        border: `1px solid ${waServiceStatus?.connected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12
                      }}>
                        <div>
                          <strong style={{ color: waServiceStatus?.connected ? '#4ADE80' : '#FDE047', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {waServiceStatus?.connected ? <CheckCheck size={18} /> : <AlertTriangle size={18} />}
                            {waServiceStatus?.connected
                              ? 'WhatsApp Reconectado — A campanha não retoma sozinha'
                              : 'Campanha Pausada Automaticamente (WhatsApp Desconectado)'}
                          </strong>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.45 }}>
                            {waServiceStatus?.connected
                              ? `A ligação foi restabelecida com sucesso. Resumo atual: ${campaignData.stats?.sent || 0} enviadas, restam ${Math.max(0, (campaignData.stats?.total || 0) - (campaignData.stats?.sent || 0) - (campaignData.stats?.failed || 0) - (campaignData.stats?.ignored || 0))} leads. Clique em Retomar Campanha para continuar.`
                              : 'Para proteger a sua reputação e evitar perda silenciosa de contactos, a fila foi pausada automaticamente. Conecte o terminal para poder retomar.'}
                          </p>
                        </div>
                        {waServiceStatus?.connected ? (
                          <button
                            type="button"
                            className="button"
                            onClick={handleResumeCampaign}
                            style={{ background: '#22C55E', color: '#000000', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <Play size={14} fill="#000000" /> Retomar Campanha
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="button secondary"
                            onClick={fetchWhatsAppQr}
                            style={{ fontSize: 12 }}
                          >
                            <RefreshCw size={14} /> Conectar WhatsApp
                          </button>
                        )}
                      </div>
                    )}

                    {campaignData.last_error && !campaignData.last_error.includes('WhatsApp desconectado') && (
                      <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, color: '#FCA5A5', fontSize: 12.5 }}>
                        <strong>Aviso de Fila:</strong> {campaignData.last_error}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ 2. MOTOR DE DISPARO EM MASSA ══ */}
                <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: 16, marginBottom: 18 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, color: '#FFFFFF' }}>Disparo em Massa Personalizado</h2>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
                        Envie abordagens em lote com substituição automática do nome da empresa e da cidade.
                      </p>
                    </div>

                    {/* Fonte de dados */}
                    <div style={{ display: 'flex', gap: 8, background: 'rgba(15, 23, 42, 0.8)', padding: 4, borderRadius: 10, border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                      <button
                        className={cls('tab-btn', integrationSource === 'search' && 'active')}
                        onClick={() => setIntegrationSource('search')}
                        style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: integrationSource === 'search' ? '#2563EB' : 'transparent', color: '#FFFFFF' }}
                      >
                        Resultados da Pesquisa ({searchResult?.results.length || 0})
                      </button>
                      <button
                        className={cls('tab-btn', integrationSource === 'leads' && 'active')}
                        onClick={() => setIntegrationSource('leads')}
                        style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: integrationSource === 'leads' ? '#2563EB' : 'transparent', color: '#FFFFFF' }}
                      >
                        Leads Salvos / CRM ({leads.length})
                      </button>
                    </div>
                  </div>

                  {/* Template Editor & Preview */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
                    {/* Template editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Template da Mensagem</span>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>{bulkTemplate.length} caracteres</span>
                      </div>
                      <textarea
                        value={bulkTemplate}
                        onChange={e => setBulkTemplate(e.target.value)}
                        rows={7}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(11, 19, 38, 0.9)', border: '1px solid rgba(59, 130, 246, 0.35)', color: '#FFFFFF', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Tags & Spintax:</span>
                        {[
                          { label: '{nome_empresa}', tag: '{nome_empresa}' },
                          { label: '{cidade}', tag: '{cidade}' },
                          { label: '{nicho}', tag: '{nicho}' },
                          { label: '{servico}', tag: '{servico}' },
                          { label: '{responsavel}', tag: '{responsavel}' },
                          { label: '{Olá|Bom dia|Boa tarde}', tag: '{Olá|Bom dia|Boa tarde}' }
                        ].map(t => (
                          <button
                            key={t.tag}
                            type="button"
                            onClick={() => setBulkTemplate(prev => prev + ' ' + t.tag)}
                            style={{ background: 'rgba(37, 99, 235, 0.18)', border: '1px solid rgba(59, 130, 246, 0.35)', color: '#93C5FD', padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          >
                            + {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Painel de Configurações Anti-Bloqueio */}
                      <div style={{ marginTop: 8, padding: 14, background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#E2E8F0' }}>
                            🛡️ Configuração da Fila Anti-Bloqueio & Rampa
                          </span>
                          <span style={{ fontSize: 11, color: '#34D399' }}>Aquecimento Ativo</span>
                        </div>

                        {/* Widget de Aquecimento Automático */}
                        {waServiceStatus?.warmup && (
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'rgba(30, 41, 59, 0.65)',
                            border: `1px solid ${waDailyLimit > waServiceStatus.warmup.recommendedLimit ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Flame size={15} color="#F97316" />
                                Limite de hoje: {waServiceStatus.warmup.todaySent} de {waDailyLimit} (aquecimento: dia {waServiceStatus.warmup.dayNumber})
                              </span>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: waDailyLimit > waServiceStatus.warmup.recommendedLimit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                color: waDailyLimit > waServiceStatus.warmup.recommendedLimit ? '#FCA5A5' : '#86EFAC'
                              }}>
                                {waDailyLimit > waServiceStatus.warmup.recommendedLimit ? '⚠️ Limite acima da rampa' : '🛡️ Rampa segura'}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 11.5, color: '#CBD5E1', lineHeight: 1.4 }}>
                              <b>{waServiceStatus.warmup.phaseDescription}:</b> máximo recomendado de <b>{waServiceStatus.warmup.recommendedLimit} envios/dia</b> somando todas as campanhas. Números novos precisam de aquecimento progressivo para evitar banimento.
                            </p>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                          <label style={{ fontSize: 11.5, color: '#94A3B8' }}>
                            Atraso Mínimo:
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <input
                                type="number"
                                min={10}
                                max={120}
                                value={waMinDelaySec}
                                onChange={e => setWaMinDelaySec(Number(e.target.value))}
                                style={{ width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 6, background: '#0B132B', border: '1px solid #3B82F6', color: '#FFFFFF' }}
                              />
                              <span style={{ fontSize: 11, color: '#64748B' }}>seg</span>
                            </div>
                          </label>

                          <label style={{ fontSize: 11.5, color: '#94A3B8' }}>
                            Atraso Máximo:
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <input
                                type="number"
                                min={waMinDelaySec}
                                max={240}
                                value={waMaxDelaySec}
                                onChange={e => setWaMaxDelaySec(Number(e.target.value))}
                                style={{ width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 6, background: '#0B132B', border: '1px solid #3B82F6', color: '#FFFFFF' }}
                              />
                              <span style={{ fontSize: 11, color: '#64748B' }}>seg</span>
                            </div>
                          </label>

                          <label style={{ fontSize: 11.5, color: '#94A3B8' }}>
                            Limite Diário:
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <input
                                type="number"
                                min={5}
                                max={150}
                                value={waDailyLimit}
                                onChange={e => setWaDailyLimit(Number(e.target.value))}
                                style={{ width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 6, background: '#0B132B', border: '1px solid #3B82F6', color: '#FFFFFF' }}
                              />
                              <span style={{ fontSize: 11, color: '#64748B' }}>envios</span>
                            </div>
                          </label>
                        </div>

                        {(waMinDelaySec < 20 || waDailyLimit > (waServiceStatus?.warmup?.recommendedLimit || 40)) && (
                          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 6, color: '#FCA5A5', fontSize: 11.5 }}>
                            ⚠️ Atenção: Configurar limites acima da rampa de aquecimento ({waServiceStatus?.warmup?.recommendedLimit || 40}/dia) ou intervalos abaixo de 20s aumenta o risco de bloqueio do chip pelo WhatsApp.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview box */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Pré-visualização Individual</span>
                        <span style={{ fontSize: 11, color: '#60A5FA' }}>
                          {previewBiz ? `Empresa: ${previewBiz.name}` : 'Nenhuma empresa selecionada'}
                        </span>
                      </div>
                      <div style={{ flex: 1, padding: 16, borderRadius: 10, background: 'linear-gradient(180deg, rgba(7, 13, 26, 0.95) 0%, rgba(13, 24, 48, 0.9) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#E2E8F0', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#25D366' }} />
                          <strong style={{ fontSize: 13, color: '#FFFFFF' }}>{previewBiz?.name || 'Exemplo'}</strong>
                          <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>{previewBiz?.locality || 'Maputo'}</span>
                        </div>
                        {previewText}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: '#94A3B8' }}>
                        <span>Caracteres renderizados: <b>{previewText.length}</b></span>
                        <span style={{ color: '#34D399' }}>Spintax ativo dinamicamente</span>
                      </div>
                    </div>
                  </div>

                  {/* ══ SELEÇÃO & TABELA DE EMPRESAS ══ */}
                  <div style={{ marginTop: 20 }}>
                    {/* Filter sub-tabs & SELECT ALL button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={cls('vault-cat-pill', integrationFilter === 'all' && 'active')}
                          onClick={() => setIntegrationFilter('all')}
                        >
                          Todas ({activeSourceList.length})
                        </button>
                        <button
                          type="button"
                          className={cls('vault-cat-pill', integrationFilter === 'with_wa' && 'active')}
                          onClick={() => setIntegrationFilter('with_wa')}
                        >
                          🟢 Com WhatsApp ({withWaList.length})
                        </button>
                        <button
                          type="button"
                          className={cls('vault-cat-pill', integrationFilter === 'no_wa' && 'active')}
                          onClick={() => setIntegrationFilter('no_wa')}
                        >
                          ⚠️ Sem WhatsApp ({noWaList.length})
                        </button>
                      </div>

                      {/* SELECT ALL BUTTON & LAUNCH ACTION */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={toggleSelectAll}
                          style={{
                            fontSize: 12.5,
                            fontWeight: 750,
                            padding: '7px 14px',
                            background: allDisplayedSelected ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                            border: allDisplayedSelected ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFFFFF'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={allDisplayedSelected}
                            onChange={() => {}}
                            style={{ marginRight: 6, accentColor: '#2563EB', cursor: 'pointer' }}
                          />
                          {allDisplayedSelected ? 'Desmarcar Todos' : 'Selecionar Tudo'} ({displayedList.length})
                        </button>
                        <span style={{ fontSize: 12, color: '#94A3B8', marginRight: 6 }}>
                          Selecionadas: <strong style={{ color: '#60A5FA' }}>{selectedCount}</strong> de {activeSourceList.length}
                        </span>

                        <button
                          type="button"
                          className="button"
                          style={{ background: '#25D366', color: '#000', fontWeight: 800, fontSize: 13 }}
                          disabled={campaignLoading || (selectedWithWa === 0 && withWaList.length === 0)}
                          onClick={() => setShowConfirmModal(true)}
                        >
                          <Send size={15} /> Iniciar Campanha ({selectedWithWa > 0 ? selectedWithWa : withWaList.length} leads)
                        </button>
                      </div>
                    </div>

                    {/* Table of companies */}
                    {displayedList.length > 0 ? (
                      <div style={{ overflowX: 'auto', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(59, 130, 246, 0.25)', color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                              <th style={{ padding: '12px 14px', width: 44 }}>
                                <input
                                  type="checkbox"
                                  checked={allDisplayedSelected}
                                  onChange={toggleSelectAll}
                                  style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                                />
                              </th>
                              <th style={{ padding: '12px 14px' }}>Empresa / Nicho</th>
                              <th style={{ padding: '12px 14px' }}>Localização</th>
                              <th style={{ padding: '12px 14px' }}>Contacto / WhatsApp</th>
                              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedList.map(b => {
                              const isSelected = selectedBizIds.includes(b.id);
                              const hasWa = isLikelyWhatsApp(b.phone, b.country || filters.country || 'MZ');
                              const isEditingThis = inlinePhoneBizId === b.id;
                              return (
                                <tr
                                  key={b.id}
                                  style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                                    transition: 'background 0.15s ease'
                                  }}
                                >
                                  <td style={{ padding: '12px 14px' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setSelectedBizIds(prev => prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id]);
                                      }}
                                      style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ padding: '12px 14px' }}>
                                    <strong style={{ color: '#FFFFFF', display: 'block' }}>{b.name}</strong>
                                    <small style={{ color: '#94A3B8' }}>{b.category}</small>
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#CBD5E1' }}>
                                    {b.locality}, {b.province}
                                  </td>
                                  <td style={{ padding: '12px 14px' }}>
                                    {isEditingThis ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input
                                          value={inlinePhoneVal}
                                          onChange={e => setInlinePhoneVal(e.target.value)}
                                          placeholder="+258 84..."
                                          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, background: '#0B132B', border: '1px solid #3B82F6', color: '#FFFFFF' }}
                                        />
                                        <button
                                          type="button"
                                          className="button"
                                          style={{ padding: '4px 8px', fontSize: 11 }}
                                          onClick={() => {
                                            handleUpdateBusinessPhone(b.id, inlinePhoneVal);
                                            setInlinePhoneBizId(null);
                                          }}
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          type="button"
                                          className="text-button"
                                          style={{ fontSize: 11 }}
                                          onClick={() => setInlinePhoneBizId(null)}
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : hasWa ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.35)', color: '#4ADE80', padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 650 }}>
                                        <MessageCircle size={13} /> {formatPhone(b.phone) || b.phone}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setInlinePhoneBizId(b.id);
                                          setInlinePhoneVal(b.phone || '');
                                        }}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.12)', border: '1px dashed rgba(239, 68, 68, 0.4)', color: '#FCA5A5', padding: '3px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                                      >
                                        <Phone size={12} /> {b.phone ? `${formatPhone(b.phone)} (Fixo - Inserir WhatsApp)` : '+ Inserir WhatsApp'}
                                      </button>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      className="text-button"
                                      onClick={() => loadBusiness(b.id, 'business', b)}
                                      style={{ fontSize: 12, color: '#60A5FA' }}
                                    >
                                      Ver Ficha →
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty title="Nenhuma empresa encontrada neste filtro." description="Realize uma pesquisa ou guarde leads para gerir os disparos.">
                        <button className="button" onClick={() => navigate('search')}>
                          Ir para Pesquisa de Clientes <ArrowRight size={15} />
                        </button>
                      </Empty>
                    )}
                  </div>
                </section>

                {/* ══ 3. GESTÃO DE EMPRESAS SEM WHATSAPP ══ */}
                <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone size={18} color="#FBBF24" /> Relatório de Empresas "Sem WhatsApp"
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
                        Empresas com telefone fixo ou sem contacto directo. Insira o WhatsApp móvel ou exporte para contacto telefónico.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => exportNoWhatsAppCsv(noWaList)}
                      disabled={noWaList.length === 0}
                      style={{ fontSize: 12.5 }}
                    >
                      <Download size={15} /> Exportar Lista (CSV) ({noWaList.length})
                    </button>
                  </div>
                </section>

                {/* ══ 4. ROADMAP DE FUTURAS INTEGRAÇÕES ══ */}
                <section className="panel" style={{ padding: 24 }}>
                  <div style={{ marginBottom: 18 }}>
                    <span className="eyebrow"><Sparkles size={13} /> EXPANSÃO DO SISTEMA</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: 18, color: '#FFFFFF' }}>Futuras Integrações em Desenvolvimento</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
                      Novos canais que estão a ser integrados para transformar a Prospecta no motor comercial completo para a CPLP & PALOP.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                    {[
                      {
                        title: 'Meta Ads & Instagram DM',
                        badge: 'Em Desenvolvimento',
                        badgeColor: 'blue',
                        icon: Sparkles,
                        desc: 'Auditoria com IA das empresas sem anúncios activos e disparo de abordagens automáticas por mensagem privada (DM) no Instagram.'
                      },
                      {
                        title: 'Cold Email Corporativo',
                        badge: 'Próximo Lançamento',
                        badgeColor: 'amber',
                        icon: Mail,
                        desc: 'Sequências de e-mails profissionais (via Gmail, Outlook ou Resend) com acompanhamento de aberturas e respostas.'
                      },
                      {
                        title: 'Webhooks, Zapier & Make',
                        badge: 'Planeado',
                        badgeColor: 'green',
                        icon: SlidersHorizontal,
                        desc: 'Envio automático de leads fechados para CRM externo (HubSpot, Notion, Trello, Google Sheets e ERPs locais).'
                      },
                      {
                        title: 'Agente de Voz IA (Cold Calling)',
                        badge: 'Pesquisa',
                        badgeColor: 'purple',
                        icon: Phone,
                        desc: 'Ligações telefónicas automatizadas com voz ultra-realista em português para pré-qualificar decisores antes do envio de propostas.'
                      }
                    ].map(feat => (
                      <div key={feat.title} style={{ padding: 18, background: 'rgba(11, 19, 38, 0.75)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
                            <feat.icon size={18} />
                          </span>
                          <Pill tone={feat.badgeColor as any}>{feat.badge}</Pill>
                        </div>
                        <h4 style={{ margin: 0, fontSize: 15, color: '#FFFFFF' }}>{feat.title}</h4>
                        <p style={{ margin: 0, fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>{feat.desc}</p>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => notify(`Obrigado pelo interesse na funcionalidade "${feat.title}"! Notificaremos no lançamento.`)}
                          style={{ marginTop: 'auto', fontSize: 12, color: '#60A5FA', textAlign: 'left', padding: 0 }}
                        >
                          Manifestar Interesse →
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ══ MODAL DE CONFIRMAÇÃO DA CAMPANHA ══ */}
                {showConfirmModal && (() => {
                  const targetList = selectedWithWa > 0
                    ? withWaList.filter(b => selectedBizIds.includes(b.id))
                    : withWaList;
                  const firstTarget = targetList[0] || previewBiz;
                  const firstMsg = firstTarget
                    ? parseSpintaxClient(interpolateMessage(bulkTemplate, firstTarget, user.name || 'Chelton', filters.service || user.profile.service))
                    : '';
                  const warmupInfo = waServiceStatus?.warmup;
                  const isOverWarmup = warmupInfo ? waDailyLimit > warmupInfo.recommendedLimit : waDailyLimit > 40;
                  const isAggressive = waMinDelaySec < 20 || isOverWarmup;

                  return (
                    <div className="bulk-modal-overlay" onClick={() => setShowConfirmModal(false)}>
                      <div className="bulk-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div className="bulk-modal-header">
                          <div>
                            <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF' }}>
                              <Send size={20} color="#25D366" /> Confirmar Início da Campanha
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
                              Reveja os parâmetros de segurança e o resumo da fila antes de disparar.
                            </p>
                          </div>
                          <IconButton label="Fechar modal" onClick={() => setShowConfirmModal(false)}>
                            <X size={18} />
                          </IconButton>
                        </div>

                        {/* Summary Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
                          <div style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 10, padding: 12 }}>
                            <span style={{ fontSize: 11, color: '#93C5FD', display: 'block' }}>Destinatários Válidos</span>
                            <strong style={{ fontSize: 20, color: '#FFFFFF' }}>{targetList.length} leads</strong>
                            <small style={{ fontSize: 11, color: '#60A5FA', display: 'block' }}>com WhatsApp confirmado</small>
                          </div>
                          <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 10, padding: 12 }}>
                            <span style={{ fontSize: 11, color: '#86EFAC', display: 'block' }}>Cadência Anti-Bloqueio</span>
                            <strong style={{ fontSize: 18, color: '#FFFFFF' }}>{waMinDelaySec}s - {waMaxDelaySec}s</strong>
                            <small style={{ fontSize: 11, color: '#4ADE80', display: 'block' }}>atraso aleatório entre envios</small>
                          </div>
                          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 10, padding: 12 }}>
                            <span style={{ fontSize: 11, color: '#94A3B8', display: 'block' }}>Janela & Limite Diário</span>
                            <strong style={{ fontSize: 16, color: '#FFFFFF' }}>{String(waStartHour).padStart(2, '0')}h - {String(waEndHour).padStart(2, '0')}h</strong>
                            <small style={{ fontSize: 11, color: isOverWarmup ? '#FCA5A5' : '#CBD5E1', display: 'block' }}>
                              Máx {waDailyLimit} msgs/dia {warmupInfo ? `(Dia ${warmupInfo.dayNumber})` : ''}
                            </small>
                          </div>
                        </div>

                        {/* Rampa de Aquecimento & Alerta de Risco */}
                        {isOverWarmup ? (
                          <div style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.45)', borderRadius: 8, marginBottom: 16 }}>
                            <strong style={{ color: '#FCA5A5', fontSize: 12.5, display: 'block', marginBottom: 4 }}>
                              ⚠️ Alerta de Risco: Limite Superior à Rampa de Aquecimento
                            </strong>
                            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#CBD5E1', lineHeight: 1.45 }}>
                              {warmupInfo
                                ? `O seu WhatsApp está no dia ${warmupInfo.dayNumber} de aquecimento (${warmupInfo.phaseDescription}), com limite seguro de ${warmupInfo.recommendedLimit} envios/dia. Disparar ${waDailyLimit} mensagens aumenta muito a probabilidade de bloqueio imediato pela Meta.`
                                : `O limite configurado de ${waDailyLimit} envios/dia está acima do teto conservador recomendado (40/dia).`}
                            </p>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
                              <input
                                type="checkbox"
                                checked={confirmWarmupOverride}
                                onChange={e => setConfirmWarmupOverride(e.target.checked)}
                                style={{ marginTop: 2 }}
                              />
                              <span>Estou ciente do risco de suspensão do chip e confirmo expressamente o envio acima do limite recomendado pelo aquecimento.</span>
                            </label>
                          </div>
                        ) : warmupInfo && (
                          <div style={{ padding: '10px 14px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8, color: '#86EFAC', fontSize: 12, marginBottom: 16 }}>
                            🛡️ <b>Rampa de Aquecimento Protegida:</b> Dia {warmupInfo.dayNumber} ({warmupInfo.phaseDescription}) · Limite diário configurado de {waDailyLimit} envios está dentro da zona segura (máx {warmupInfo.recommendedLimit}/dia).
                          </div>
                        )}

                        {/* Anti-ban protections list */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div>🛡️ <b>Simulação de digitação:</b> 2 a 5 segundos de status <i>digitando...</i> antes de cada mensagem.</div>
                          <div>⏸️ <b>Pausa programada:</b> 7 minutos de descanso a cada 20 mensagens enviadas.</div>
                          <div>🚪 <b>Opt-out ativo:</b> Quem responder &quot;SAIR&quot; ou &quot;PARAR&quot; é excluído automaticamente.</div>
                          <div>🛑 <b>Proteção de falhas:</b> Pausa automática caso ocorram 5 falhas consecutivas ou queda de sessão.</div>
                        </div>

                        {/* First message preview */}
                        {firstTarget && (
                          <div style={{ marginBottom: 20 }}>
                            <span style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                              Exemplo real da 1ª mensagem ({firstTarget.name}):
                            </span>
                            <div style={{ padding: 12, borderRadius: 8, background: '#0B132B', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#E2E8F0', fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 140, overflowY: 'auto' }}>
                              {firstMsg}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => setShowConfirmModal(false)}
                            disabled={campaignLoading}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="button"
                            style={{ background: '#25D366', color: '#000', fontWeight: 800, minWidth: 160 }}
                            disabled={campaignLoading || targetList.length === 0 || (isOverWarmup && !confirmWarmupOverride)}
                            onClick={() => handleCreateAndStartCampaign(targetList)}
                          >
                            {campaignLoading ? 'A iniciar...' : `🚀 Iniciar (${targetList.length} disparos)`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}

          {/* ══ VIEW: Cofre ══════════════════════════════ */}
          {user.profile.onboarded && view === 'vault' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={14} /> SCRIPTS DE PROSPECÇÃO, NEGOCIAÇÃO E FECHAMENTO</div>
                  <h1>Cofre de Scripts · Código Zero & Prospecta</h1>
                  <p>Modelos comerciais de alta conversão testados em Moçambique para WhatsApp, abordagem fria, objeções e M-Pesa / e-Mola.</p>
                </div>
              </div>

              {/* Filter bar */}
              <div className="vault-filter-panel">
                <div className="vault-search-row">
                  <Search size={18} />
                  <input
                    value={vaultSearch}
                    onChange={e => setVaultSearch(e.target.value)}
                    placeholder="Pesquisar scripts (ex.: caro, sem site, m-pesa, objeção, follow-up)..."
                  />
                  {vaultSearch && <button type="button" className="text-button" onClick={() => setVaultSearch('')}>Limpar</button>}
                </div>
                <div className="vault-category-pills">
                  {[
                    { key: 'all', label: `Todos (${vaultScripts.length || 23})` },
                    { key: 'primeiro-contato', label: 'Primeiro Contato (Frio)' },
                    { key: 'sem-site', label: 'Empresas Sem Site' },
                    { key: 'qualificacao', label: 'Qualificação & Diagnóstico' },
                    { key: 'oferta', label: 'Apresentação da Oferta' },
                    { key: 'objecoes', label: 'Quebra de Objeções' },
                    { key: 'fechamento', label: 'Fechamento M-Pesa / e-Mola' },
                    { key: 'followup', label: 'Follow-up e Retomada' },
                    { key: 'pos-venda', label: 'Pós-venda e Depoimentos' },
                  ].map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      className={cls('vault-cat-pill', vaultCategory === cat.key && 'active')}
                      onClick={() => setVaultCategory(cat.key)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Script list */}
              {vaultScripts.filter(s => {
                const matchCat = vaultCategory === 'all' || s.category === vaultCategory;
                const matchQ = !vaultSearch || s.title.toLowerCase().includes(vaultSearch.toLowerCase()) || s.template.toLowerCase().includes(vaultSearch.toLowerCase()) || s.scenario.toLowerCase().includes(vaultSearch.toLowerCase()) || s.keyPhrases.some(k => k.toLowerCase().includes(vaultSearch.toLowerCase()));
                return matchCat && matchQ;
              }).length > 0 ? (
                <div className="vault-grid">
                  {vaultScripts.filter(s => {
                    const matchCat = vaultCategory === 'all' || s.category === vaultCategory;
                    const matchQ = !vaultSearch || s.title.toLowerCase().includes(vaultSearch.toLowerCase()) || s.template.toLowerCase().includes(vaultSearch.toLowerCase()) || s.scenario.toLowerCase().includes(vaultSearch.toLowerCase()) || s.keyPhrases.some(k => k.toLowerCase().includes(vaultSearch.toLowerCase()));
                    return matchCat && matchQ;
                  }).map(script => (
                    <article key={script.id} className="vault-card">
                      <div className="vault-card-header">
                        <span className="vault-badge">{script.categoryLabel}</span>
                        <h3>{script.title}</h3>
                        <p className="vault-scenario">{script.scenario}</p>
                      </div>
                      <div className="vault-template-box">
                        <pre>{script.template}</pre>
                      </div>
                      {customizingVaultId === script.id && (
                        <div className="vault-customizer-box">
                          <div className="vault-customizer-header">
                            <span><SlidersHorizontal size={14} /> Adaptar a outro Nicho & Editar</span>
                            <button type="button" className="text-button" style={{ padding: 0, fontSize: 11 }} onClick={() => setCustomizingVaultId(null)}>
                              <X size={14} /> Fechar
                            </button>
                          </div>

                          <div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Nichos para inspiração rápida:</div>
                            <div className="vault-niche-chips">
                              {[
                                { label: '🦷 Clínica Odontológica', niche: 'Clínica Odontológica', company: 'Clínica Sorriso Lda' },
                                { label: '💇‍♀️ Salão de Beleza', niche: 'Salão de Beleza & Estética', company: 'Studio Glamour' },
                                { label: '🍽️ Restaurante', niche: 'Restaurante & Bar', company: 'Restaurante Sabor da Terra' },
                                { label: '🔧 Oficina Mecânica', niche: 'Oficina Mecânica', company: 'Auto Center Maputo' },
                                { label: '⚖️ Advocacia', niche: 'Escritório de Advocacia', company: 'Madime Advogados Associados' },
                                { label: '🏠 Imobiliária', niche: 'Mediação Imobiliária', company: 'Imobiliária Maputo Prime' }
                              ].map(n => (
                                <button
                                  key={n.niche}
                                  type="button"
                                  className={cls('vault-chip-btn', vaultCustomNiche === n.niche && 'active')}
                                  onClick={() => {
                                    setVaultCustomNiche(n.niche);
                                    setVaultCustomCompany(n.company);
                                    const updated = adaptScriptTemplate(script.template, n.company, n.niche, vaultCustomService, vaultCustomLocality, user.name);
                                    setVaultCustomText(updated);
                                  }}
                                >
                                  {n.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="vault-inputs-grid">
                            <div className="vault-input-group">
                              <label>Nome da Empresa</label>
                              <input
                                value={vaultCustomCompany}
                                placeholder="Ex: Dental Prime Lda"
                                onChange={e => {
                                  setVaultCustomCompany(e.target.value);
                                  setVaultCustomText(adaptScriptTemplate(script.template, e.target.value, vaultCustomNiche, vaultCustomService, vaultCustomLocality, user.name));
                                }}
                              />
                            </div>
                            <div className="vault-input-group">
                              <label>Nicho / Ramo de Atividade</label>
                              <input
                                value={vaultCustomNiche}
                                placeholder="Ex: Clínica, Salão, Restaurante..."
                                onChange={e => {
                                  setVaultCustomNiche(e.target.value);
                                  setVaultCustomText(adaptScriptTemplate(script.template, vaultCustomCompany, e.target.value, vaultCustomService, vaultCustomLocality, user.name));
                                }}
                              />
                            </div>
                            <div className="vault-input-group">
                              <label>Serviço oferecido</label>
                              <select
                                value={vaultCustomService}
                                onChange={e => {
                                  setVaultCustomService(e.target.value);
                                  setVaultCustomText(adaptScriptTemplate(script.template, vaultCustomCompany, vaultCustomNiche, e.target.value, vaultCustomLocality, user.name));
                                }}
                              >
                                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="vault-input-group">
                              <label>Localidade</label>
                              <input
                                value={vaultCustomLocality}
                                placeholder="Ex: Maputo, Matola, Nampula..."
                                onChange={e => {
                                  setVaultCustomLocality(e.target.value);
                                  setVaultCustomText(adaptScriptTemplate(script.template, vaultCustomCompany, vaultCustomNiche, vaultCustomService, e.target.value, user.name));
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Texto Adaptado (Pode editar directamente):</label>
                              <small style={{ fontSize: 11, color: '#94a3b8' }}>{vaultCustomText.length} caracteres</small>
                            </div>
                            <textarea
                              className="vault-custom-textarea"
                              value={vaultCustomText}
                              onChange={e => setVaultCustomText(e.target.value)}
                              rows={7}
                              placeholder="O texto personalizado e adaptado aparecerá aqui..."
                            />
                          </div>

                          <div className="vault-customizer-actions">
                            <button
                              type="button"
                              className="button outline compact"
                              onClick={() => {
                                navigator.clipboard.writeText(vaultCustomText);
                                notify('Script adaptado copiado para a área de transferência!');
                              }}
                            >
                              <Copy size={13} /> Copiar texto adaptado
                            </button>
                            <button
                              type="button"
                              className="button compact"
                              onClick={() => {
                                setDraft(vaultCustomText);
                                if (business) {
                                  navigate('outreach', business);
                                  notify('Script personalizado aplicado na preparação da mensagem!');
                                } else {
                                  notify('Script guardado no rascunho de abordagem!');
                                }
                              }}
                            >
                              <ArrowRight size={13} /> {business ? `Usar com ${business.name}` : 'Usar na abordagem'}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="vault-card-footer">
                        <button
                          type="button"
                          className={cls('button outline compact', customizingVaultId === script.id && 'active')}
                          onClick={() => {
                            if (customizingVaultId === script.id) {
                              setCustomizingVaultId(null);
                            } else {
                              setCustomizingVaultId(script.id);
                              const comp = business?.name || 'Empresa Exemplo Lda';
                              const nic = business?.category || 'Clínica Odontológica';
                              const srv = service || SERVICES[0];
                              const loc = business?.locality || 'Maputo';
                              setVaultCustomCompany(comp);
                              setVaultCustomNiche(nic);
                              setVaultCustomService(srv);
                              setVaultCustomLocality(loc);
                              setVaultCustomText(adaptScriptTemplate(script.template, comp, nic, srv, loc, user.name));
                            }
                          }}
                        >
                          <SlidersHorizontal size={14} /> {customizingVaultId === script.id ? 'Fechar adaptação' : 'Adaptar Nicho / Editar'}
                        </button>
                        <button
                          type="button"
                          className="button outline compact"
                          onClick={() => {
                            navigator.clipboard.writeText(script.template);
                            notify('Script original copiado!');
                          }}
                        >
                          <Copy size={14} /> Copiar original
                        </button>
                        {business && (
                          <button
                            type="button"
                            className="button compact"
                            onClick={() => {
                              const filled = adaptScriptTemplate(script.template, business.name, business.category, service, business.locality, user.name);
                              setDraft(filled);
                              navigate('outreach', business);
                              notify('Script inserido na preparação da mensagem!');
                            }}
                          >
                            <ArrowRight size={14} /> Usar com {business.name}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <section className="panel">
                  <Empty icon={<Search size={28} />} title="Nenhum script encontrado." description="Experimente outro termo de pesquisa ou selecione outra categoria do Cofre.">
                    <button type="button" className="button outline" onClick={() => { setVaultCategory('all'); setVaultSearch(''); }}>Ver todos os scripts</button>
                  </Empty>
                </section>
              )}
            </>
          )}


          {/* ══ VIEW: Ficha + Abordagem ═══════════════════ */}
          {user.profile.onboarded && ['business', 'outreach'].includes(view) && business && (
            <>
              <button className="back-link" onClick={() => navigate('search')}><ChevronLeft size={16} /> Voltar à pesquisa</button>
              <div className="company-heading">
                <div className="company-heading-left">
                  <span className="business-icon large"><Building2 size={32} /></span>
                  <div>
                    <div className="eyebrow">{business.category}</div>
                    <h1>{business.name}</h1>
                    <p>
                    <MapPin size={15} />{business.locality}, {business.province}
                    <a
                      href={getGoogleMapsUrl(business.name, business.locality, business.province)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="heading-map-link"
                      title="Pesquisar esta empresa no Google Maps"
                    >
                      · Ver no Google Maps <ExternalLink size={12} />
                    </a>
                    <a
                      href={getMetaAdLibraryUrl(business.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="heading-map-link"
                      title="Verificar anúncios desta empresa na Biblioteca de Anúncios do Meta"
                    >
                      · Biblioteca de Anúncios Meta <ExternalLink size={12} />
                    </a>
                  </p>
                  </div>
                </div>
                <button className="button outline" disabled={busy || business.saved} onClick={() => saveBusiness(business)}>
                  {business.saved ? <Check size={17} /> : <Bookmark size={17} />} {business.saved ? 'Guardada' : 'Guardar oportunidade'}
                </button>
              </div>
              <div className="tab-bar">
                <button className={view === 'business' ? 'active' : ''} onClick={() => navigate('business', business)}><FileText size={16} /> Empresa e oportunidades</button>
                <button className={view === 'outreach' ? 'active' : ''} onClick={() => navigate('outreach', business)}><MessageCircle size={16} /> Preparar abordagem</button>
              </div>
              {business.suppressed && <div className="alert danger"><ShieldCheck size={18} /> Este contacto está marcado para não contactar. A geração e a abordagem estão bloqueadas.</div>}
              {view === 'business'
                ? <div className="detail-grid">
                  <div>
                    <section className="panel">
                      <div className="panel-heading"><div><h2>Primeiro, os factos.</h2><p>O que a fonte consultada permite observar.</p></div><ShieldCheck size={21} /></div>
                      <div className="evidence-list">
                        {business.evidence.map(e => (
                          <article key={e.id}>
                            <span className="evidence-check"><Check size={14} /></span>
                            <div>
                              <span className="micro-label">{e.field === 'name' ? 'EMPRESA' : e.field === 'location' ? 'LOCALIZAÇÃO' : 'ACTIVIDADE'}</span>
                              <h3>{e.value}</h3><p>{e.source} · {date(e.observedAt)}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                      <div className="panel-footer"><span><Database size={14} /> {business.source}</span><span>Consultado a {date(business.observedAt)}</span></div>
                    </section>
                    <section className="panel opportunity-panel">
                      <div className="panel-heading">
                        <div>
                          <h2><Sparkles size={19} /> Possibilidades para explorar</h2>
                          <p>Hipóteses de trabalho e valores de mercado recomendados em Moçambique.</p>
                        </div>
                      </div>
                      {(() => {
                        const currentService = service || filters.service || user.profile.service || 'Criação de websites';
                        const pricing = getRecommendedPricing(currentService, business.category);
                        return (
                          <div style={{ background: 'rgba(24, 119, 242, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, letterSpacing: '0.5px' }}>
                                ESCALA RECOMENDADA · {pricing.tierName.toUpperCase()}
                              </span>
                              <span style={{ fontSize: 10, background: 'rgba(37, 99, 235, 0.2)', color: '#bfdbfe', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                                {pricing.period === 'mês' ? 'Mensalidade' : 'Valor de Setup'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0 6px' }}>
                              <span style={{ fontSize: 24, fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.4px' }}>
                                {pricing.formattedRange}
                              </span>
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                para {business.category || 'este nicho'}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
                              {pricing.rationale}
                            </p>
                            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: '#94a3b8' }}>
                              <span>Serviço: <strong style={{ color: '#f1f5f9' }}>{currentService}</strong></span>
                              <span>Piso viável: <strong style={{ color: '#f1f5f9' }}>{pricing.minMt.toLocaleString('pt-MZ')} MT</strong></span>
                              <span>Teto sugerido: <strong style={{ color: '#f1f5f9' }}>{pricing.maxMt.toLocaleString('pt-MZ')} MT</strong></span>
                            </div>
                          </div>
                        );
                      })()}
                      {analysis
                        ? <div className="opportunities-content">
                          <Pill>Análise por IA</Pill>
                          <h2>{analysis.recommendedService}</h2><p>{analysis.reason}</p>
                          {analysis.hypotheses.map((h, i) => <div className="hypothesis" key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{h}</p></div>)}
                          <div className="alert"><ShieldCheck size={17} /><span>{analysis.confidence}</span></div>
                          {analysis.missingData.length > 0 && <div><h4>O que ainda precisamos de saber</h4><ul className="missing-list">{analysis.missingData.map(m => <li key={m}>{m}</li>)}</ul></div>}
                          <button className="button" onClick={() => navigate('outreach', business)}>Preparar a conversa <ArrowRight size={17} /></button>
                        </div>
                        : <Empty icon={<Sparkles size={28} />} title="Uma análise com o seu serviço em mente." description="Relacione os dados disponíveis com o que oferece. Inclui uma primeira mensagem editável; custa 1 crédito.">
                          <button className="button" disabled={busy || business.suppressed} onClick={() => generate()}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Analisar oportunidade · 1 crédito</button>
                        </Empty>
                      }
                    </section>
                  </div>
                  <aside className="detail-aside">
                    <section className="panel content">
                      <h3>Dados de contacto</h3>
                      <div className="contact-line">
                        <Phone size={17} />
                        <div style={{ flex: 1 }}>
                          <span>Telefone / WhatsApp</span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                            <b>{business.phone ? getPhoneBadgeLabel(business.phone) : 'Não listado na busca'}</b>
                            <button
                              type="button"
                              className="text-button"
                              style={{ fontSize: 11, color: '#38bdf8', padding: 0 }}
                              onClick={() => {
                                const newPhone = window.prompt(`Inserir número do Google Maps para "${business.name}" (ex: 84 060 0333):`, business.phone || '');
                                if (newPhone) {
                                  handleUpdateBusinessPhone(business.id, newPhone);
                                }
                              }}
                            >
                              {business.phone ? 'Editar' : '+ Inserir do Maps'}
                            </button>
                          </div>
                        </div>
                      </div>
                      {business.phone && (
                        <a
                          className="button whatsapp"
                          style={{ marginTop: 8, marginBottom: 8, width: '100%', justifyContent: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}
                          href={`https://wa.me/${business.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle size={15} /> Abrir no WhatsApp ({business.phone})
                        </a>
                      )}
                      <p className="micro">O contacto fica salvo na sua base da Prospecta.</p>
                      <div className="contact-line"><Globe2 size={17} /><div><span>Website</span>{business.website ? <a href={business.website} target="_blank" rel="noreferrer">{business.website.replace('https://', '')} <ExternalLink size={12} /></a> : <b>Não identificado nesta fonte</b>}</div></div>
                      {business.instagram && <div className="contact-line"><Sparkles size={17} /><div><span>Instagram</span><b>{business.instagram}</b></div></div>}
                      <div className="contact-line"><MapPin size={17} /><div><span>Localização</span><a href={getGoogleMapsUrl(business.name, business.locality, business.province)} target="_blank" rel="noreferrer">Ver no Google Maps <ExternalLink size={12} /></a></div></div>
                      <div className="contact-line"><Target size={17} /><div><span>Anúncios Meta</span><a href={getMetaAdLibraryUrl(business.name)} target="_blank" rel="noreferrer">Verificar na Biblioteca <ExternalLink size={12} /></a></div></div>
                      <div className="alert"><ShieldCheck size={17} /><span>A ausência de informação não prova ausência de presença digital.</span></div>
                    </section>
                    <section className="blue-note">
                      <span className="soft-icon"><MessageCircle size={20} /></span>
                      <h3>Uma boa abordagem começa por ouvir.</h3>
                      <p>Apresente-se, faça uma pergunta e confirme se o seu serviço faz sentido.</p>
                    </section>
                    <section className="panel content">
                      <h4>Qualidade da informação</h4>
                      <button className="text-button" onClick={() => { const note = window.prompt('Que informação deve ser corrigida?'); if (note) run(async () => { await post('corrections', { businessId: business.id, note }); notify('Pedido de correcção registado.'); }); }}>Sinalizar informação incorrecta <ArrowUpRight size={14} /></button>
                      <button className="text-button danger-text" disabled={business.suppressed} onClick={() => { const reason = window.prompt('Motivo para não contactar esta empresa:'); if (reason) run(async () => { await post('suppressions', { businessId: business.id, reason }); setBusiness({ ...business, suppressed: true }); notify('Contacto bloqueado para futuras abordagens.'); }); }}>Marcar para não contactar</button>
                    </section>
                  </aside>
                </div>
                : <div className="outreach-grid">
                  <section className="panel content">
                    <div className="step-label"><span>1</span><div><h2>A sua voz, o seu serviço.</h2><p>Prepare o contexto da abordagem.</p></div></div>
                    <div className="two-fields">
                      <label>Tom da mensagem<select value={tone} onChange={e => setTone(e.target.value)}>{['Profissional', 'Amigável', 'Consultivo'].map(t => <option key={t}>{t}</option>)}</select></label>
                      <label>Serviço em destaque<select value={service} onChange={e => setService(e.target.value)}>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></label>
                    </div>

                    {/* Extensão da mensagem */}
                    <div className="message-length-bar">
                      <div className="length-label">
                        <span>Extensão da mensagem:</span>
                        <small>{messageLength === 'curta' ? '⚡ Curta (ideal para atendentes no WhatsApp lerem rápido)' : messageLength === 'media' ? '💬 Equilibrada (consultiva com apresentação)' : '📄 Completa (detalhada com quebra de objeções)'}</small>
                      </div>
                      <div className="length-options">
                        <button
                          type="button"
                          className={cls('length-pill', messageLength === 'curta' && 'active')}
                          onClick={() => setMessageLength('curta')}
                        >
                          ⚡ Curta (para atendente / 3 frases)
                        </button>
                        <button
                          type="button"
                          className={cls('length-pill', messageLength === 'media' && 'active')}
                          onClick={() => setMessageLength('media')}
                        >
                          💬 Equilibrada
                        </button>
                        <button
                          type="button"
                          className={cls('length-pill', messageLength === 'longa' && 'active')}
                          onClick={() => setMessageLength('longa')}
                        >
                          📄 Completa
                        </button>
                      </div>
                    </div>

                    {/* Instruções personalizadas para a IA */}
                    <div className="prompt-customizer-box">
                      <button
                        type="button"
                        className="prompt-toggle-btn"
                        onClick={() => setShowPromptDetails(!showPromptDetails)}
                      >
                        <span><SlidersHorizontal size={14} /> Personalizar instruções da IA {customPrompt.trim() && <span className="prompt-active-dot" />}</span>
                        <span className="prompt-toggle-action">{showPromptDetails ? 'Ocultar' : 'Detalhar como quero a mensagem'}</span>
                      </button>

                      {(showPromptDetails || customPrompt.trim().length > 0) && (
                        <div className="prompt-details-body">
                          <textarea
                            value={customPrompt}
                            onChange={e => setCustomPrompt(e.target.value)}
                            placeholder="Ex.: Mensagem bem curta para recepcionista ler rápido, focar em criação de Landing Page rápida, mencionar que vi no Google Maps, ou pedir apenas 2 minutos de áudio..."
                            rows={2}
                            className="prompt-textarea"
                          />
                          <div className="prompt-quick-chips">
                            <span className="prompt-chips-label">Sugestões rápidas:</span>
                            <button
                              type="button"
                              className="prompt-chip"
                              onClick={() => setCustomPrompt('Mensagem super curta de 3 frases, directa para a atendente do WhatsApp ler em 5 segundos sem cansar.')}
                            >
                              ⚡ Super curta para atendente
                            </button>
                            <button
                              type="button"
                              className="prompt-chip"
                              onClick={() => setCustomPrompt('Focar na criação de uma Landing Page moderna e rápida para converter quem pesquisa no Google Maps directamente para o WhatsApp.')}
                            >
                              🎯 Focar em Landing Page
                            </button>
                            <button
                              type="button"
                              className="prompt-chip"
                              onClick={() => setCustomPrompt('Mencionar que encontrei a empresa no Google Maps com óptima reputação e elogiar o trabalho antes de propor a solução.')}
                            >
                              📍 Mencionar Google Maps
                            </button>
                            <button
                              type="button"
                              className="prompt-chip"
                              onClick={() => setCustomPrompt('Perguntar gentilmente à atendente com quem devo falar sobre a presença digital e captação de clientes da empresa.')}
                            >
                              📱 Pedir contacto do responsável
                            </button>
                            <button
                              type="button"
                              className="prompt-chip"
                              onClick={() => setCustomPrompt('Destacar facilidade de pagamento parcelado via M-Pesa / e-Mola.')}
                            >
                              💰 Facilitar com M-Pesa
                            </button>
                            {customPrompt && (
                              <button type="button" className="prompt-chip danger" onClick={() => setCustomPrompt('')}>
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="editor-heading">
                      <div className="step-label"><span>2</span><div><h2>Prepare uma boa conversa.</h2><p>{analysis ? 'Reveja, personalize e guarde a mensagem.' : 'Uma nova análise inclui a primeira mensagem.'}</p></div></div>
                      <button className="button outline compact" disabled={busy || business.suppressed} onClick={() => generate(!!analysis)}>{busy ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} {analysis ? 'Nova análise' : 'Gerar mensagem'} · 1 crédito</button>
                    </div>
                    <div className="vault-quick-bar">
                      <span className="vault-quick-label"><ShieldCheck size={13} /> Modelos do Cofre:</span>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(getCoherentVaultScript('primeiro-contato', service, business, user.name, messageLength));
                        notify(`Modelo de Primeiro Contato (${service}) inserido!`);
                      }}>Primeiro Contato</button>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(getCoherentVaultScript('sem-site', service, business, user.name, messageLength));
                        notify('Modelo para Empresa Sem Site inserido!');
                      }}>Sem Website</button>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(getCoherentVaultScript('esta-caro', service, business, user.name, messageLength));
                        notify('Modelo de Quebra de Objeção ("Está Caro") inserido!');
                      }}>Quebra "Está Caro"</button>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(getCoherentVaultScript('fechamento-mpesa', service, business, user.name, messageLength));
                        notify('Modelo de Fechamento via M-Pesa inserido!');
                      }}>Fechamento M-Pesa</button>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(getCoherentVaultScript('followup', service, business, user.name, messageLength));
                        notify('Modelo de Follow-up inserido!');
                      }}>Follow-up</button>
                      <button type="button" className="text-button" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => navigate('vault')}>Ver todos no Cofre <ArrowRight size={12} /></button>
                    </div>
                    <label className="sr-only" htmlFor="draft">Mensagem de abordagem</label>
                    <textarea id="draft" className="message-editor" value={draft} onChange={e => setDraft(e.target.value)} placeholder="A sua mensagem aparece aqui após a análise. Também pode preparar um texto manualmente." />
                    <div className="editor-meta"><span>{draft.length} caracteres</span><span>Envio decidido por si</span></div>
                    <div className="outreach-actions">
                      <button className="button outline" disabled={!draft || busy || business.suppressed} onClick={copyDraft}><Copy size={16} /> Copiar mensagem</button>
                      <button className="button" disabled={!analysis || !draft || busy || business.suppressed} onClick={saveDraft}><Check size={16} /> Guardar edição</button>
                    </div>
                    {business.phone && !business.suppressed ? (
                      isMozambiqueMobile(business.phone) ? (
                        <>
                          <a className="button whatsapp full" href={`https://wa.me/${business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(draft)}`} target="_blank" rel="noreferrer">
                            <MessageCircle size={18} /> Abrir WhatsApp ({formatPhone(business.phone)}) <ExternalLink size={15} />
                          </a>
                          <p className="micro">Abrir WhatsApp não confirma envio, entrega ou leitura da mensagem.</p>
                        </>
                      ) : isMozambiqueLandline(business.phone) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                          <a className="button full" href={`tel:${business.phone}`} style={{ background: '#0284c7', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Phone size={18} /> Ligar Telefone Fixo ({formatPhone(business.phone)})
                          </a>
                          <p className="micro" style={{ color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '8px 12px', borderRadius: 8, margin: 0, lineHeight: 1.4 }}>
                            ℹ️ <strong>Rede Fixa:</strong> Este contacto ({formatPhone(business.phone)}) pertence à rede fixa e normalmente não possui WhatsApp. Ligue diretamente ou consulte as redes sociais da empresa.
                          </p>
                          {business.instagram && (
                            <a className="button outline full" href={`https://instagram.com/${business.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <Sparkles size={16} /> Abrir Instagram ({business.instagram})
                            </a>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                          <a className="button full" href={`tel:${business.phone}`} style={{ background: '#0f172a', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Phone size={18} /> Ligar ({formatPhone(business.phone)})
                          </a>
                          {business.instagram && (
                            <a className="button outline full" href={`https://instagram.com/${business.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <Sparkles size={16} /> Abrir Instagram ({business.instagram})
                            </a>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="alert">
                        <MessageCircle size={18} />
                        <span>{business.suppressed ? 'A abordagem está bloqueada por pedido de não contacto.' : 'Sem telefone disponível. Prepare o texto e confirme outro canal de contacto com a empresa.'}</span>
                      </div>
                    )}
                    {selectedLead && <button className="text-button" disabled={busy} onClick={() => run(async () => { await api('leads/' + selectedLead.id, { method: 'PATCH', body: JSON.stringify({ stage: 'Contactado' }) }); notify('Contacto confirmado por si. Etapa actualizada.'); })}><CheckCheck size={16} /> Já realizei o contacto · Marcar como Contactado</button>}
                  </section>
                  <aside className="message-preview">
                    <div className="preview-title"><span>PRÉ-VISUALIZAÇÃO</span><Pill>Rascunho</Pill></div>
                    <div className="phone-frame">
                      <div className="phone-contact"><span className="business-icon"><Building2 size={20} /></span><div><b>{business.name}</b><small>Pré-visualização da mensagem</small></div></div>
                      <div className="phone-body">
                        <span className="phone-day">RASCUNHO · NÃO ENVIADO</span>
                        <div className="message-bubble">{draft || 'A sua próxima conversa começa com uma mensagem relevante.'}<small>Pré-visualização</small></div>
                      </div>
                      <div className="phone-bottom"><span>A mensagem será enviada por si</span><Send size={17} /></div>
                    </div>
                    <div className="preview-tip"><ShieldCheck size={20} /><p>Não presuma as necessidades. Uma pergunta honesta abre mais espaço para conversar.</p></div>
                  </aside>
                </div>
              }
              {job && ['queued', 'running'].includes(job.status) && (
                <div className="job-bar"><LoaderCircle className="spin" size={18} /><span>Análise em curso. O crédito está reservado.</span>
                  <button onClick={() => run(async () => { const j = await post<Job>('jobs/' + job.id + '/cancel'); setJob(j); await refreshUser(); })}>Cancelar tarefa</button>
                </div>
              )}
            </>
          )}

          {/* ══ VIEW: Conta ══════════════════════════════ */}
          {user.profile.onboarded && view === 'account' && (
            <>
              <div className="page-heading">
                <div><div className="eyebrow"><Settings2 size={14} /> À SUA MEDIDA</div><h1>O seu espaço, as suas escolhas.</h1><p>Perfil comercial, utilização e controlo dos seus dados.</p></div>
              </div>
              <div className="detail-grid">
                <section className="panel content"><h2>Perfil comercial</h2><p className="muted">A base para mensagens mais relevantes.</p><ProfileForm user={user} profile={profile || user.profile} busy={busy} onSubmit={saveProfile} /></section>
                <div>
                  <section className="account-credit">
                    <Sparkles size={25} /><span>CRÉDITOS DISPONÍVEIS</span><strong>{user.credits.available}</strong>
                    <p>{user.credits.reserved} reservados · {user.credits.spent} utilizados</p>
                    <div><Check size={15} /> 1 análise com mensagem = 1 crédito</div>
                    <div><Check size={15} /> Editar e reabrir são gratuitos</div>
                    <p className="micro">Piloto gratuito. Sem renovação ou cobrança automática.</p>
                  </section>
                  <section className="panel content">
                    <h3>Os seus dados estão sob o seu controlo.</h3>
                    <p className="muted">Exporte o seu trabalho ou peça a eliminação da conta.</p>
                    <div className="actions">
                      <button className="button outline compact" onClick={() => requestPrivacy('export')} disabled={busy}><Download size={15} /> Exportar dados</button>
                      <button className="text-button danger-text" onClick={() => requestPrivacy('delete')} disabled={busy}>Pedir eliminação</button>
                    </div>
                    {requests.map(r => (
                      <div className="privacy-row" key={r.id}>
                        <span>{r.type === 'export' ? 'Exportação' : 'Eliminação'} · {r.status === 'ready' ? 'Pronta' : r.status === 'pending' ? 'Pendente' : r.status}</span>
                        {r.type === 'export' && <a href={'/api/privacy/' + r.id + '/export'} download>Descarregar <Download size={13} /></a>}
                      </div>
                    ))}
                  </section>
                </div>
              </div>
              <section className="panel">
                <div className="panel-heading"><h2>Histórico de utilização</h2><Wallet size={19} /></div>
                <div className="ledger">
                  {usage.map(e => (
                    <div key={e.id}>
                      <span className={cls('ledger-icon', e.kind === 'grant' && 'positive')}>{e.kind === 'grant' ? <Plus size={17} /> : <ArrowDownLeft size={17} />}</span>
                      <span><b>{e.description}</b><small>{date(e.createdAt)}</small></span>
                      <strong>{e.kind === 'grant' ? '+' : e.kind === 'consume' ? '-' : ''}{e.units} <small>crédito{e.units !== 1 ? 's' : ''}</small></strong>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ══ VIEW: Admin ══════════════════════════════ */}
          {user.profile.onboarded && view === 'admin' && user.role === 'admin' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><ShieldCheck size={14} /> PAINEL DO ADMINISTRADOR · CONTROLE SAAS</div>
                  <h1>Gestão Central do SaaS & Subscrições</h1>
                  <p>Controle todos os utilizadores registados, monitore planos ativos (Essencial e Pro) e gerencie quotas.</p>
                </div>
                <Pill tone="amber">Super Administrador</Pill>
              </div>

              {/* Métricas Globais do SaaS */}
              <div className="summary-grid" style={{ marginBottom: 24 }}>
                <div className="summary-tile">
                  <div className="summary-icon blue"><Users size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-label">TOTAL DE UTILIZADORES</span>
                    <strong className="summary-number">{admin?.metrics?.totalUsers ?? admin?.users?.length ?? 0}</strong>
                    <span className="summary-detail">Contas reais registadas no SaaS</span>
                  </div>
                </div>

                <div className="summary-tile">
                  <div className="summary-icon green"><Sparkles size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-label">PRO ATIVO (347 MT)</span>
                    <strong className="summary-number">{admin?.metrics?.proUsers ?? admin?.users?.filter(u => u.subscription?.plan === 'pro' && u.subscription?.status === 'active').length ?? 0}</strong>
                    <span className="summary-detail">Clientes em escala alta</span>
                  </div>
                </div>

                <div className="summary-tile">
                  <div className="summary-icon blue"><Sparkles size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-label">ESSENCIAL ATIVO (197 MT)</span>
                    <strong className="summary-number">{admin?.metrics?.essentialUsers ?? admin?.users?.filter(u => u.subscription?.plan === 'essential' && u.subscription?.status === 'active').length ?? 0}</strong>
                    <span className="summary-detail">Clientes no plano inicial</span>
                  </div>
                </div>

                <div className="summary-tile">
                  <div className="summary-icon amber"><Clock3 size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-label">SEM PLANO / EXPIRADOS</span>
                    <strong className="summary-number">{admin?.metrics?.freeUsers ?? admin?.users?.filter(u => u.subscription?.plan === 'free' || u.subscription?.status === 'expired').length ?? 0}</strong>
                    <span className="summary-detail">Aguardando ativação</span>
                  </div>
                </div>

                <div className="summary-tile">
                  <div className="summary-icon purple"><Wallet size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-label">CRÉDITOS EM SALDO</span>
                    <strong className="summary-number">{admin?.metrics?.totalCredits ?? 0}</strong>
                    <span className="summary-detail">Total distribuído no sistema</span>
                  </div>
                </div>
              </div>

              {/* Tabela de Utilizadores & Planos */}
              <section className="panel content" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18 }}>Utilizadores e Subscrições ({admin?.users?.length || 0})</h2>
                    <p className="muted" style={{ margin: '4px 0 0' }}>Lista auditada de clientes registados, respetivos planos, atividades e quotas.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div className="inline-search" style={{ maxWidth: 260 }}>
                      <Search size={15} />
                      <input
                        aria-label="Procurar utilizador"
                        placeholder="Filtrar nome ou e-mail…"
                        value={adminUserSearch}
                        onChange={e => setAdminUserSearch(e.target.value)}
                      />
                    </div>
                    <button className="button outline compact" onClick={async () => {
                      const r = await api<AdminData>('admin');
                      setAdmin(r);
                      notify('Dados atualizados com sucesso.');
                    }}>
                      <RefreshCw size={14} /> Atualizar Lista
                    </button>
                  </div>
                </div>

                <div className="no-wa-table-container">
                  <table className="no-wa-table">
                    <thead>
                      <tr>
                        <th>Nome & Email</th>
                        <th>Tipo</th>
                        <th>Plano Atual</th>
                        <th>Estado</th>
                        <th>Atividade</th>
                        <th>Validade</th>
                        <th>Créditos</th>
                        <th style={{ textAlign: 'right' }}>Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin?.users && admin.users.length > 0 ? (
                        admin.users
                          .filter(u => !adminUserSearch || u.name.toLowerCase().includes(adminUserSearch.toLowerCase()) || u.email.toLowerCase().includes(adminUserSearch.toLowerCase()))
                          .map(u => (
                            <tr key={u.id} style={{ background: adminSelectedUserId === u.id ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                              <td>
                                <strong>{u.name}</strong>
                                <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>{u.email}</small>
                              </td>
                              <td>
                                <Pill tone={u.role === 'admin' ? 'amber' : 'gray'}>{u.role}</Pill>
                              </td>
                              <td>
                                {u.subscription?.plan === 'pro' ? (
                                  <Pill tone="green">Prospecta Pro (347 MT)</Pill>
                                ) : u.subscription?.plan === 'essential' ? (
                                  <Pill tone="blue">Prospecta Essencial (197 MT)</Pill>
                                ) : (
                                  <Pill tone="gray">Sem Plano Ativo</Pill>
                                )}
                              </td>
                              <td>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: u.subscription?.status === 'active' ? '#10b981' : '#ef4444'
                                }}>
                                  {u.subscription?.status === 'active' ? '● Ativo' : '● Inativo / Expirado'}
                                </span>
                              </td>
                              <td style={{ fontSize: 11.5 }}>
                                {u.activity ? (
                                  <span>{u.activity.searchesCount} buscas · {u.activity.leadsCount} leads · {u.activity.analysesCount} análises</span>
                                ) : (
                                  <span style={{ color: 'var(--muted)' }}>—</span>
                                )}
                              </td>
                              <td style={{ fontSize: 12 }}>
                                {u.subscription?.expiresAt ? date(u.subscription.expiresAt) : 'Sem validade'}
                              </td>
                              <td>
                                <strong style={{ color: '#2563eb' }}>{u.credits?.available ?? 0}</strong>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button
                                    className="button outline compact"
                                    style={{ fontSize: 11, padding: '4px 8px' }}
                                    title="Ativar 1 mês de Plano Pro (450 créditos)"
                                    onClick={async () => {
                                      await post('admin/subscription', { userId: u.id, plan: 'pro', months: 1, grantPlanCredits: true });
                                      const r = await api<AdminData>('admin');
                                      setAdmin(r);
                                      notify(`Plano Pro ativado para ${u.name}!`);
                                    }}
                                  >
                                    + Pro
                                  </button>
                                  <button
                                    className="button outline compact"
                                    style={{ fontSize: 11, padding: '4px 8px' }}
                                    title="Ativar 1 mês de Plano Essencial (150 créditos)"
                                    onClick={async () => {
                                      await post('admin/subscription', { userId: u.id, plan: 'essential', months: 1, grantPlanCredits: true });
                                      const r = await api<AdminData>('admin');
                                      setAdmin(r);
                                      notify(`Plano Essencial ativado para ${u.name}!`);
                                    }}
                                  >
                                    + Essencial
                                  </button>
                                  <button
                                    className="button outline compact"
                                    style={{ fontSize: 11, padding: '4px 8px' }}
                                    onClick={() => {
                                      setAdminSelectedUserId(u.id);
                                      notify(`Utilizador "${u.name}" selecionado para gestão.`);
                                    }}
                                  >
                                    Gerir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                            Nenhum utilizador encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Formulários de Gestão: Plano & Quota Manual */}
              <div className="detail-grid">
                {/* Atribuição de Plano */}
                <section className="panel content">
                  <h2>Atribuir ou Alterar Plano</h2>
                  <p className="muted">Selecione o utilizador, defina o plano (Essencial ou Pro) e a validade em meses.</p>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    const targetUserId = form.get('userId') as string;
                    const planChoice = form.get('plan') as 'free' | 'essential' | 'pro';
                    const months = Number(form.get('months')) || 1;
                    const grantPlanCredits = form.get('grantPlanCredits') === 'on';

                    run(async () => {
                      await post('admin/subscription', {
                        userId: targetUserId,
                        plan: planChoice,
                        months,
                        grantPlanCredits
                      });
                      const r = await api<AdminData>('admin');
                      setAdmin(r);
                      await refreshUser();
                      notify(`Plano ${planChoice === 'pro' ? 'Pro' : planChoice === 'essential' ? 'Essencial' : 'Grátis'} atribuído por ${months} mês(es)!`);
                    });
                  }}>
                    <label>
                      Utilizador
                      <select name="userId" value={adminSelectedUserId} onChange={e => setAdminSelectedUserId(e.target.value)} required>
                        <option value="">Selecione um utilizador...</option>
                        {admin?.users?.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} · {u.email} ({u.subscription?.plan === 'pro' ? 'Pro' : u.subscription?.plan === 'essential' ? 'Essencial' : 'Grátis'})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Plano a Atribuir
                      <select name="plan" defaultValue="pro" required>
                        <option value="pro">Prospecta Pro · 347 MT/mês (Alta escala, disparos múltiplos, CRM)</option>
                        <option value="essential">Prospecta Essencial · 197 MT/mês (150 créditos, pesquisas)</option>
                        <option value="free">Gratuito / Demonstração (Até 22/10/2026)</option>
                      </select>
                    </label>

                    <label>
                      Duração da Assinatura
                      <select name="months" defaultValue={1} required>
                        <option value={1}>1 Mês de Acesso</option>
                        <option value={2}>2 Meses</option>
                        <option value={3}>3 Meses (Trimestral)</option>
                        <option value={6}>6 Meses (Semestral)</option>
                        <option value={12}>12 Meses (Anual)</option>
                        <option value={24}>24 Meses</option>
                      </select>
                    </label>

                    <label className="checkbox" style={{ marginTop: 8 }}>
                      <input name="grantPlanCredits" type="checkbox" defaultChecked />
                      Creditar automaticamente quota mensal do plano (150 ou 450 créditos x meses)
                    </label>

                    <button className="button" disabled={busy} style={{ marginTop: 12 }}>
                      <Sparkles size={16} /> Gravar e Ativar Plano
                    </button>
                  </form>
                </section>

                {/* Atribuição de Quota Manual */}
                <section className="panel content">
                  <h2>Adicionar Quota de Créditos</h2>
                  <p className="muted">Credite saldo avulso de prospecção para qualquer utilizador manualmente.</p>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    const targetUserId = form.get('userId') as string;
                    const units = Number(form.get('units'));
                    const reason = String(form.get('reason'));

                    run(async () => {
                      await post('admin/grant', { userId: targetUserId, units, reason });
                      const r = await api<AdminData>('admin');
                      setAdmin(r);
                      await refreshUser();
                      notify(`${units} créditos adicionados ao utilizador com sucesso.`);
                    });
                  }}>
                    <label>
                      Utilizador
                      <select name="userId" value={adminSelectedUserId} onChange={e => setAdminSelectedUserId(e.target.value)} required>
                        <option value="">Selecione um utilizador...</option>
                        {admin?.users?.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} · {u.email} ({u.credits?.available ?? 0} créditos atuais)
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Quantidade de Créditos a Adicionar
                      <input name="units" type="number" min={1} max={50000} defaultValue={100} required />
                    </label>

                    <label>
                      Motivo / Referência de Pagamento
                      <input name="reason" required minLength={3} placeholder="Ex.: Pagamento M-Pesa manual / Recarga Lojou" />
                    </label>

                    <button className="button outline" disabled={busy} style={{ marginTop: 12 }}>
                      <Plus size={16} /> Adicionar Créditos
                    </button>
                  </form>
                </section>
              </div>

              {/* Importação CSV & Outras Funções */}
              <div className="detail-grid" style={{ marginTop: 24 }}>
                <section className="panel content">
                  <h2>Importar empresas por CSV</h2>
                  <p className="muted">Até 500 linhas. Colunas: name, category, province, locality, sourceId, phone, website, countryCode.</p>
                  <form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); run(async () => { const r = await post<{ imported: number }>('admin/import', { csv: form.get('csv'), source: form.get('source'), authorized: form.get('authorized') === 'on' }); notify(`${r.imported} empresas importadas.`); }); }}>
                    <label>Origem dos dados<input name="source" required minLength={3} placeholder="Nome da fonte autorizada" /></label>
                    <label>Conteúdo CSV<textarea name="csv" rows={7} required placeholder={'name,category,province,locality,sourceId,phone,website,countryCode\nEmpresa Exemplo,Restauração,Sofala,Beira,ref-01,,,MZ'} /></label>
                    <label className="checkbox"><input name="authorized" type="checkbox" required /> Confirmo ter autorização de uso e armazenamento destes dados.</label>
                    <button className="button" disabled={busy}><Database size={16} /> Validar e importar</button>
                  </form>
                </section>

                <section className="panel content">
                  <h2>Tarefas de análise</h2>
                  {admin?.jobs.length ? <div className="admin-rows">{admin.jobs.map(j => <div key={j.id}><code>{j.id.slice(0, 8)}</code><Pill tone={j.status === 'failed' ? 'red' : 'blue'}>{j.status}</Pill><span>{j.attempts} tentativa(s)</span><small>{j.error || '—'}</small></div>)}</div> : <p className="muted">Nenhuma tarefa de análise criada.</p>}
                  <p className="micro">Após falha definitiva, a reserva é libertada.</p>
                </section>
              </div>

              <section className="panel content" style={{ marginTop: 24 }}><h2>Pedidos de privacidade</h2>{admin?.requests.length ? admin.requests.map(r => (<div className="privacy-row" key={r.id}><span>{r.type} · {r.status} · {r.id.slice(0, 8)}</span><button className="button outline compact" disabled={busy} onClick={() => { if (window.confirm(r.type === 'delete' ? 'Eliminar definitivamente?' : 'Concluir este pedido?')) run(async () => { await post('admin/privacy/' + r.id + '/complete'); const remaining = await refreshUser(); if (remaining) setAdmin(await api<AdminData>('admin')); notify('Pedido processado.'); }); }}>Processar</button></div>)) : <p className="muted">Sem pedidos registados.</p>}</section>
              <section className="panel content"><h2>Correcções de informação</h2>{admin?.corrections.length ? admin.corrections.map(c => (<div className="privacy-row" key={c.id}><span>{c.note} · {c.status}</span>{c.status === 'pending' && <button className="button outline compact" onClick={() => run(async () => { await post('admin/corrections/' + c.id + '/complete'); setAdmin(await api<AdminData>('admin')); notify('Correcção marcada como revista.'); })}>Marcar como revista</button>}</div>)) : <p className="muted">Sem correcções pendentes.</p>}</section>
            </>
          )}

          <footer className="workspace-footer">
            <span><Radar size={14} /> Prospecta · O próximo passo é seu.</span>
            <span>Feito para os países da CPLP & PALOP <span className="country-dot" /></span>
          </footer>
        </main>
      </div>

      {/* ══ LEAD DRAWER ══════════════════════════════════ */}
      {view === 'leads' && selectedLead && (
        <div className="modal-backdrop drawer-backdrop" onClick={() => setSelectedLead(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="lead-title" className="lead-drawer" onClick={e => e.stopPropagation()}>
            <div className="row"><Pill>OPORTUNIDADE</Pill><IconButton label="Fechar oportunidade" onClick={() => setSelectedLead(null)}><X size={20} /></IconButton></div>
            <h2 id="lead-title">{selectedLead.business.name}</h2>
            <p className="muted">{selectedLead.business.locality} · {selectedLead.business.province}</p>
            <form onSubmit={updateLead}>
              <label>Etapa<select name="stage" defaultValue={selectedLead.stage}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></label>
              <label>Próximo passo<input name="nextAction" defaultValue={selectedLead.nextAction} placeholder="Ex.: apresentar proposta comercial" /></label>
              <div className="two-fields">
                <label>Data de seguimento<input name="due" type="date" defaultValue={selectedLead.nextActionAt?.slice(0, 10) || ''} /></label>
                <label>Valor proposto (MT)<input name="amount" type="number" min={0} step="0.01" defaultValue={selectedLead.amountMinor !== null ? selectedLead.amountMinor / 100 : ''} /></label>
              </div>
              <label>Notas<textarea name="note" rows={4} defaultValue={selectedLead.note} placeholder="O que é importante para esta conversa?" /></label>
              <button className="button full" disabled={busy}><Check size={16} /> Guardar alterações</button>
            </form>
            <button className="button outline full" onClick={() => run(async () => { await loadBusiness(selectedLead.businessId, 'business', selectedLead.business); })}>Ver ficha da empresa <ArrowRight size={16} /></button>
            <h3>Histórico</h3>
            <div className="activity-list">{selectedLead.activities.map(a => <div key={a.id}><span className="activity-dot" /><div><p>{a.note}</p><small>{date(a.createdAt)}</small></div></div>)}</div>
          </section>
        </div>
      )}

      {/* ══ MODAL DE PLANOS E ASSINATURA LOJOU ══════════════ */}
      {showPlansModal && (
        <div className="modal-backdrop" onClick={() => setShowPlansModal(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="plans-title" className="lead-drawer" style={{ maxWidth: 840, width: '92vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="row">
              <Pill tone="amber">UPGRADE DE PLANO · PROSPECTA</Pill>
              <IconButton label="Fechar planos" onClick={() => setShowPlansModal(false)}><X size={20} /></IconButton>
            </div>
            
            <h2 id="plans-title" style={{ marginTop: 8 }}>Invista no seu motor de prospecção</h2>
            <p className="muted">Encontre mais empresas, envie abordagens em simultâneo e feche contratos de alto valor.</p>

            {/* Modal ROI Persuasion Callout */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(16, 185, 129, 0.12) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <span style={{ fontSize: '24px' }}>💡</span>
              <div style={{ fontSize: '12.5px', color: '#E2E8F0', lineHeight: 1.5 }}>
                <strong style={{ color: '#60A5FA' }}>Por que o Plano se paga sozinho?</strong>
                <div style={{ color: '#CBD5E1', marginTop: '2px' }}>
                  Com os scripts da IA e disparo pelo WhatsApp, fechar <strong>1 único cliente</strong> (15.000 MT a 30.000 MT) já paga mais de <strong>3 anos inteiros do Plano Pro (347 MT)</strong>. O retorno sobre o seu investimento é imediato.
                </div>
              </div>
            </div>

            <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {/* Card Essencial */}
              <div className="panel content" style={{ display: 'flex', flexDirection: 'column', background: 'var(--navy-surface)', border: '1px solid var(--navy-border)', borderRadius: '14px' }}>
                <span className="fact-pill" style={{ width: 'max-content', marginBottom: 10, background: 'rgba(59, 130, 246, 0.12)', color: '#93C5FD', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                  Pra começar · Básico
                </span>
                <h3 style={{ fontSize: 20, margin: '0 0 4px', color: '#FFFFFF' }}>{PLANS.essential.name}</h3>
                <p className="muted" style={{ fontSize: 13, minHeight: 38, color: '#94A3B8' }}>{PLANS.essential.tagline}</p>
                <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF' }}>{PLANS.essential.priceMt} MT</span>
                  <span style={{ fontSize: 14, color: '#94A3B8' }}>{PLANS.essential.period}</span>
                </div>
                <div style={{ fontSize: 11, background: 'var(--navy-surface-alt)', border: '1px solid var(--navy-border)', color: '#CBD5E1', padding: '6px 10px', borderRadius: 6, marginBottom: 16, textAlign: 'center' }}>
                  M-Pesa · e-Mola · Cartão · Lojou Pay
                </div>
                <a
                  href={PLANS.essential.lojouCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                  style={{ textDecoration: 'none', justifyContent: 'center', background: '#1E40AF', borderColor: '#3B82F6', color: '#FFFFFF', fontWeight: 700 }}
                >
                  Assinar Essencial (197 MT) <ArrowRight size={15} />
                </a>
                <div style={{ marginTop: 18, borderTop: '1px solid var(--navy-border)', paddingTop: 14, flex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>O QUE INCLUI:</span>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    {PLANS.essential.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#E2E8F0' }}>
                        <Check size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Pro (Radiant Clivra Pro Style) */}
              <div
                className="panel content lp-pro-glowing-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(180deg, #0e1629 0%, #070d19 100%)',
                  border: '2px solid #3B82F6',
                  borderRadius: '18px',
                  position: 'relative',
                  boxShadow: '0 0 35px rgba(59, 130, 246, 0.45), 0 0 70px rgba(99, 102, 241, 0.25), inset 0 0 25px rgba(59, 130, 246, 0.15)',
                  padding: '24px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 22, margin: 0, fontWeight: 800, color: '#FFFFFF' }}>{PLANS.pro.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#3b0764', border: '1px solid #7c3aed', color: '#c084fc', fontSize: 11, fontWeight: 750, padding: '3px 10px', borderRadius: 9999 }}>
                      Black Friday
                    </span>
                    <span style={{ background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999 }}>
                      Mais popular
                    </span>
                  </div>
                </div>

                <div style={{ margin: '8px 0 4px', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 36, fontWeight: 850, color: '#60A5FA', textShadow: '0 0 25px rgba(96, 165, 250, 0.4)' }}>
                    {PLANS.pro.priceMt} MT
                  </span>
                  <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>no 1º mês</span>
                  {PLANS.pro.originalPriceMt && (
                    <span style={{ fontSize: 16, color: '#64748B', textDecoration: 'line-through', fontWeight: 600 }}>
                      {PLANS.pro.originalPriceMt} MT
                    </span>
                  )}
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#94A3B8' }}>
                  Depois, {PLANS.pro.originalPriceMt || '497'} MT/mês nos meses seguintes.
                </p>

                <div style={{ fontSize: 11, background: 'rgba(24, 119, 242, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', color: '#93C5FD', padding: '6px 10px', borderRadius: 6, marginBottom: 14, textAlign: 'center' }}>
                  M-Pesa · e-Mola · Cartão Visa/Mastercard · Lojou Pay
                </div>

                <p className="muted" style={{ fontSize: 12.5, minHeight: 32, margin: '0 0 14px', color: '#CBD5E1', lineHeight: 1.5 }}>
                  {PLANS.pro.tagline}
                </p>

                <a
                  href={PLANS.pro.lojouCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button lp-pro-glow-btn"
                  style={{
                    textDecoration: 'none',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1877F2 0%, #3B82F6 45%, #6366F1 100%)',
                    boxShadow: '0 0 28px rgba(37, 99, 235, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    padding: '12px 18px',
                    borderRadius: 12
                  }}
                >
                  ASSINAR PRO
                </a>

                <div style={{ marginTop: 18, borderTop: '1px solid var(--navy-border)', paddingTop: 14, flex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', letterSpacing: 1 }}>TUDO DO ESSENCIAL E MAIS:</span>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    {PLANS.pro.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#F1F5F9' }}>
                        <Check size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontWeight: f.includes('WhatsApp') || f.includes('Vendas com IA') || f.includes('300') || f.includes('CPLP') || f.includes('Sem WhatsApp') ? 700 : 400 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: 14, background: 'var(--navy-surface-alt)', border: '1px solid var(--navy-border)', borderRadius: 10, fontSize: 12.5, color: '#CBD5E1', textAlign: 'center' }}>
              🛡️ Pagamento seguro via <b>Lojou</b>. Aceita M-Pesa e e-Mola (Moçambique) e Cartões Visa/Mastercard internacionais. Ativação imediata sem fidelização.
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────
function ProfileForm({ user, profile, busy, onSubmit }: { user: User; profile: Profile; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="profile-form" key={user.id}>
      <div className="two-fields">
        <label>O seu nome<input name="name" defaultValue={user.name} required minLength={2} /></label>
        <label>Serviço principal<select name="service" defaultValue={profile.service}>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label>Como apresenta o seu trabalho?<textarea name="pitch" defaultValue={profile.pitch} maxLength={1000} rows={3} placeholder="Ajudo pequenos negócios a…" /></label>
      <div className="two-fields">
        <label>Localização de base<select name="province" defaultValue={profile.province}><option value="">Seleccionar província</option>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Contacto profissional (opcional)<input name="phone" type="tel" defaultValue={profile.phone} placeholder="+258 …" /></label>
      </div>
      <label className="checkbox"><input name="nationwide" type="checkbox" defaultChecked={profile.nationwide} /> Presto serviços em todo Moçambique.</label>
      <p className="micro">A sua localização não limita as zonas onde pode pesquisar empresas.</p>
      <button className="button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Guardar perfil</button>
    </form>
  );
}

function formatPhone(p: string | null) {
  if (!p) return null;
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('258')) {
    const local = digits.slice(3);
    if (local.length >= 8) return `+258 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return p;
}

function getPhoneBadgeLabel(phone: string): string {
  const formatted = formatPhone(phone) || phone;
  if (isMozambiqueLandline(phone)) {
    return `${formatted} (Fixo)`;
  }
  if (isMozambiqueMobile(phone)) {
    return `${formatted} (WhatsApp)`;
  }
  return formatted;
}

function BusinessCard({ business: b, busy, selected, onToggleSelect, onView, onSave, onUpdatePhone }: { business: Business; busy: boolean; selected?: boolean; onToggleSelect?: () => void; onView: () => void; onSave: () => void; onUpdatePhone?: (phone: string) => void }) {
  const isWa = isLikelyWhatsApp(b.phone, b.country || 'MZ');
  const countryObj = getCountryByCode(b.country);
  return (
    <article className={cls('business-card', selected && 'selected')}>
      {onToggleSelect && (
        <input
          type="checkbox"
          className="card-checkbox"
          checked={!!selected}
          aria-label={`Selecionar ${b.name}`}
          onClick={e => e.stopPropagation()}
          onChange={onToggleSelect}
        />
      )}
      <div className="row">
        <span className="business-icon"><Building2 size={23} /></span>
        <div className="card-tags">
          <Pill tone="blue">{countryObj.flag} {b.country && b.country !== 'MZ' ? countryObj.name : 'Fonte autorizada'}</Pill>
          <IconButton label={b.saved ? 'Empresa guardada' : 'Guardar ' + b.name} onClick={onSave}>{b.saved ? <Bookmark fill="currentColor" size={18} /> : <Bookmark size={18} />}</IconButton>
        </div>
      </div>
      <span className="business-category">{b.category}</span>
      <h3><button onClick={onView}>{b.name}</button></h3>
      <p className="location"><MapPin size={14} />{b.locality}, {b.province}</p>
      <div className="business-facts">
        {!b.phone ? (
          <button
            type="button"
            className="fact-pill fact-phone-none"
            style={{ cursor: 'pointer', background: 'rgba(239, 68, 68, 0.12)', border: '1px dashed rgba(239, 68, 68, 0.45)', color: '#fca5a5' }}
            title="Encontrou o número? Clique para registar."
            onClick={(e) => {
              e.stopPropagation();
              const phoneInput = window.prompt(`Inserir contacto para "${b.name}" (com DDI ou formato local):`);
              if (phoneInput && onUpdatePhone) {
                onUpdatePhone(phoneInput);
              }
            }}
          >
            <Phone size={13} /> + Inserir contacto
          </button>
        ) : isWa ? (
          <span className="fact-pill fact-phone" style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.3)' }}>
            <MessageCircle size={13} /><b>{formatPhone(b.phone) || b.phone} (WhatsApp)</b>
          </span>
        ) : (
          <span className="fact-pill" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }} title="Telefone fixo. Clique para adicionar WhatsApp móvel se tiver encontrado." onClick={(e) => {
            e.stopPropagation();
            const phoneInput = window.prompt(`Atualizar com WhatsApp móvel para "${b.name}":`, b.phone || '');
            if (phoneInput && onUpdatePhone) onUpdatePhone(phoneInput);
          }}>
            <Phone size={13} /><b>{formatPhone(b.phone) || b.phone} (Fixo)</b>
          </span>
        )}
        <span className={cls('fact-pill', b.website ? 'fact-web' : 'fact-web-none')}><Globe2 size={13} />{b.website ? 'Com website' : 'Sem website'}</span>
        {b.instagram && <span className="fact-pill fact-ig"><Sparkles size={13} /><b>{b.instagram}</b></span>}
      </div>
      <div className="business-source"><Database size={13} /><span>{b.source}<small>Actualizado a {date(b.observedAt)}</small></span></div>
      <div className="card-actions-wrapper">
        <button className="card-action" onClick={onView} disabled={busy}>Ver empresa e possibilidades <ArrowUpRight size={17} /></button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%' }}>
          <a
            href={getGoogleMapsUrl(b.name, b.locality, b.province, countryObj.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="card-map-action"
            title="Pesquisar esta empresa no Google Maps"
            onClick={e => e.stopPropagation()}
            style={{ margin: 0, justifyContent: 'center' }}
          >
            <MapPin size={13} /> Maps <ExternalLink size={11} />
          </a>
          <a
            href={getMetaAdLibraryUrl(b.name, b.country || 'MZ')}
            target="_blank"
            rel="noopener noreferrer"
            className="card-map-action"
            title="Verificar anúncios desta empresa na Biblioteca de Anúncios do Meta"
            onClick={e => e.stopPropagation()}
            style={{ margin: 0, justifyContent: 'center' }}
          >
            <Target size={13} /> Anúncios <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </article>
  );
}

function MozambiqueMap() {
  const [activeProvince, setActiveProvince] = useState<string | null>(null);

  const provinces = [
    // Região Norte
    { id: 'cd', name: 'Cabo Delgado', region: 'Norte', x: 236, y: 64 },
    { id: 'nia', name: 'Niassa', region: 'Norte', x: 160, y: 72 },
    { id: 'nam', name: 'Nampula', region: 'Norte', x: 228, y: 116 },
    // Região Centro
    { id: 'zam', name: 'Zambézia', region: 'Centro', x: 184, y: 156 },
    { id: 'tet', name: 'Tete', region: 'Centro', x: 88, y: 132 },
    { id: 'man', name: 'Manica', region: 'Centro', x: 104, y: 202 },
    { id: 'sof', name: 'Sofala', region: 'Centro', x: 136, y: 218 },
    // Região Sul
    { id: 'inh', name: 'Inhambane', region: 'Sul', x: 146, y: 288 },
    { id: 'gaz', name: 'Gaza', region: 'Sul', x: 98, y: 312 },
    { id: 'map', name: 'Maputo', region: 'Sul', x: 82, y: 348 },
  ];

  return (
    <div className="moz-map-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '290px', margin: '0 auto' }}>
      <svg
        viewBox="0 0 300 380"
        aria-label="Mapa Oficial e Autêntico de Moçambique com 10 províncias e 3 regiões"
        role="img"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="moz-surface-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EAF2FF" />
            <stop offset="45%" stopColor="#D5E6FE" />
            <stop offset="100%" stopColor="#BFD9FD" />
          </linearGradient>
          <filter id="moz-subtle-shadow" x="-6%" y="-6%" width="115%" height="115%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#1877F2" floodOpacity="0.16" />
          </filter>
        </defs>

        {/* Authentic Geographic Outline of Mozambique */}
        <path
          d="M 134 46
             C 155 38, 185 30, 225 27
             C 245 26, 258 27, 263 32
             C 266 42, 260 56, 262 76
             C 264 92, 270 102, 268 114
             C 265 125, 256 135, 250 142
             C 240 152, 225 160, 209 165
             C 195 170, 186 174, 181 177
             C 174 182, 171 187, 170 192
             C 158 202, 142 208, 134 217
             C 132 228, 138 235, 143 241
             C 147 248, 148 255, 145 262
             C 146 275, 152 288, 150 301
             C 148 310, 140 315, 132 318
             C 124 321, 114 322, 107 324
             C 98 328, 90 334, 84 342
             C 80 348, 86 356, 91 361
             C 85 363, 76 362, 72 360
             C 68 354, 69 346, 70 344
             C 71 339, 69 332, 68 320
             C 67 308, 66 295, 66 285
             C 63 278, 56 272, 55 270
             C 62 255, 75 238, 88 221
             C 87 210, 86 202, 86 198
             C 84 180, 83 162, 82 148
             C 65 142, 45 136, 30 130
             C 32 118, 48 112, 59 107
             C 74 103, 85 101, 93 101
             C 105 108, 122 120, 132 138
             C 138 148, 142 155, 145 161
             C 148 152, 152 144, 157 138
             C 152 128, 155 116, 154 105
             C 148 95, 138 88, 134 87
             C 132 75, 133 62, 134 58
             Z"
          fill="url(#moz-surface-fill)"
          stroke="#1877F2"
          strokeWidth="1.8"
          strokeLinejoin="round"
          filter="url(#moz-subtle-shadow)"
        />

        {/* Lake Niassa Northwest Border Detail */}
        <path
          d="M 134 58 C 132 68, 133 78, 134 87 C 127 82, 124 74, 126 64 C 128 58, 131 56, 134 58 Z"
          fill="#FFFFFF"
          opacity="0.8"
        />

        {/* Zambezi River Channel */}
        <path
          d="M 30 130 Q 60 128, 93 132 T 136 170 T 170 192"
          fill="none"
          stroke="#1877F2"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          opacity="0.45"
        />

        {/* Regional Boundaries: Norte/Centro and Centro/Sul */}
        <line x1="140" y1="130" x2="248" y2="140" stroke="#1877F2" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        <line x1="86" y1="230" x2="145" y2="245" stroke="#1877F2" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

        {/* Subtle Regional Typography Badges */}
        <text x="206" y="50" fill="#145DBF" fontSize="9" fontWeight="800" opacity="0.55" letterSpacing="1.2">NORTE</text>
        <text x="144" y="185" fill="#145DBF" fontSize="9" fontWeight="800" opacity="0.55" letterSpacing="1.2">CENTRO</text>
        <text x="96" y="270" fill="#145DBF" fontSize="9" fontWeight="800" opacity="0.55" letterSpacing="1.2">SUL</text>

        {/* 10 Real Provinces - Geographic Pins and High-Contrast Labels */}
        {provinces.map((p) => {
          const isHovered = activeProvince === p.id;
          return (
            <g
              key={p.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActiveProvince(p.id)}
              onMouseLeave={() => setActiveProvince(null)}
            >
              <circle cx={p.x} cy={p.y} r={isHovered ? 11 : 6.5} fill="#1877F2" opacity={isHovered ? 0.3 : 0.14} />
              <circle cx={p.x} cy={p.y} r={isHovered ? 4.5 : 3.2} fill="#1877F2" stroke="#FFFFFF" strokeWidth={1.6} />
              <text
                x={p.x + (p.x > 180 ? -7 : 7)}
                y={p.y + 3}
                textAnchor={p.x > 180 ? 'end' : 'start'}
                fill="#142638"
                fontSize={isHovered ? '9.5' : '8'}
                fontWeight={isHovered ? '800' : '650'}
                style={{ pointerEvents: 'none', transition: 'all 0.15s ease' }}
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

