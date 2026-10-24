export const PROVINCES = ['Cabo Delgado', 'Gaza', 'Inhambane', 'Manica', 'Maputo Província', 'Maputo Cidade', 'Nampula', 'Niassa', 'Sofala', 'Tete', 'Zambézia'] as const;
export const STAGES = ['Novo', 'Contactado', 'Em conversa', 'Proposta', 'Ganho', 'Perdido'] as const;
export const SERVICES = [
  'Criação de websites',
  'Criação de landing pages',
  'Tráfego pago (Anúncios online)',
  'Gestão de redes sociais',
  'Automação no WhatsApp',
  'Menus e catálogos digitais',
  'Design e identidade visual',
  'Fotografia',
  'Consultoria'
] as const;
export type Stage = typeof STAGES[number];
export interface Credits { available: number; reserved: number; spent: number }
export interface Profile { service: string; pitch: string; province: string; phone: string; nationwide: boolean; onboarded: boolean }

export type PlanType = 'free' | 'essential' | 'pro';
export type SubscriptionStatus = 'active' | 'expired' | 'trial' | 'canceled';

export interface UserSubscription {
  plan: PlanType;
  status: SubscriptionStatus;
  expiresAt: string | null;
  months?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  role: 'owner' | 'admin';
  profile: Profile;
  credits: Credits;
  subscription?: UserSubscription;
}
export interface Evidence { id: string; field: string; value: string; source: string; observedAt: string }
export function getMozambiqueLocalDigits(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('258') ? digits.slice(3) : digits;
}

/**
 * Operadoras móveis em Moçambique (com suporte a WhatsApp):
 * - 84, 85: Vodacom
 * - 86, 87: Movitel
 * - 82, 83: Tmcel
 * 9 dígitos no plano nacional de numeração de Moçambique.
 */
export function isMozambiqueMobile(phone: string | null | undefined): boolean {
  const local = getMozambiqueLocalDigits(phone);
  return (local.length === 8 || local.length === 9) && /^8[2-7]/.test(local);
}

/**
 * Rede fixa em Moçambique (TDM / Linhas terrestres):
 * Códigos geográficos começam por 2:
 * 21 (Maputo), 23 (Beira/Sofala), 24 (Quelimane/Zambézia), 25x (Tete),
 * 26 (Nampula), 27x (Niassa/Cabo Delgado), 28x (Gaza), 29x (Inhambane).
 */
export function isMozambiqueLandline(phone: string | null | undefined): boolean {
  const local = getMozambiqueLocalDigits(phone);
  return (local.length === 8 || local.length === 9) && /^2[1-9]/.test(local);
}

export type MozambiquePhoneKind = 'mobile' | 'landline' | 'unknown';

export function getMozambiquePhoneKind(phone: string | null | undefined): MozambiquePhoneKind {
  if (isMozambiqueMobile(phone)) return 'mobile';
  if (isMozambiqueLandline(phone)) return 'landline';
  return 'unknown';
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  ddi: string;
  provinces: string[];
}

export const COUNTRIES: CountryOption[] = [
  {
    code: 'MZ',
    name: 'Moçambique',
    flag: '🇲🇿',
    ddi: '+258',
    provinces: ['Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala', 'Manica', 'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa']
  },
  {
    code: 'AO',
    name: 'Angola',
    flag: '🇦🇴',
    ddi: '+244',
    provinces: ['Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Cuanza Sul', 'Cuanza Norte', 'Uíge', 'Zaire', 'Malanje', 'Namibe', 'Lunda Norte', 'Lunda Sul', 'Moxico', 'Bié', 'Cuando Cubango', 'Cunene', 'Bengo']
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    ddi: '+351',
    provinces: ['Lisboa', 'Porto', 'Braga', 'Setúbal', 'Aveiro', 'Faro', 'Coimbra', 'Leiria', 'Santarém', 'Viseu', 'Viana do Castelo', 'Vila Real', 'Castelo Branco', 'Évora', 'Guarda', 'Beja', 'Bragança', 'Portalegre', 'Madeira', 'Açores']
  },
  {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    ddi: '+55',
    provinces: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná', 'Rio Grande do Sul', 'Santa Catarina', 'Pernambuco', 'Ceará', 'Goiás', 'Distrito Federal', 'Espírito Santo', 'Mato Grosso', 'Pará', 'Amazonas']
  },
  {
    code: 'ZA',
    name: 'África do Sul',
    flag: '🇿🇦',
    ddi: '+27',
    provinces: ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']
  },
  {
    code: 'CV',
    name: 'Cabo Verde',
    flag: '🇨🇻',
    ddi: '+238',
    provinces: ['Santiago', 'São Vicente', 'Sal', 'Boa Vista', 'Santo Antão', 'Fogo', 'São Nicolau', 'Maio', 'Brava']
  },
  {
    code: 'ST',
    name: 'São Tomé e Príncipe',
    flag: '🇸🇹',
    ddi: '+239',
    provinces: ['Água Grande', 'Mé-Zóchi', 'Lobata', 'Cantagalo', 'Caué', 'Lembá', 'Príncipe']
  },
  {
    code: 'GW',
    name: 'Guiné-Bissau',
    flag: '🇬🇼',
    ddi: '+245',
    provinces: ['Bissau', 'Bafatá', 'Gabú', 'Oio', 'Cacheu', 'Biombo', 'Quinara', 'Tombali', 'Bolama']
  },
  {
    code: 'TL',
    name: 'Timor-Leste',
    flag: '🇹🇱',
    ddi: '+670',
    provinces: ['Díli', 'Baucau', 'Bobonaro', 'Cova Lima', 'Ermera', 'Lautém', 'Liquiçá', 'Manatuto', 'Manufahi', 'Oecusse', 'Viqueque', 'Aileu', 'Ainaro', 'Atauro']
  },
  {
    code: 'GQ',
    name: 'Guiné Equatorial',
    flag: '🇬🇶',
    ddi: '+240',
    provinces: ['Bioko Norte', 'Bioko Sur', 'Litoral', 'Centro Sur', 'Kié-Ntem', 'Wele-Nzas', 'Annobón', 'Djibloho']
  }
];

export function getCountryByCode(code?: string): CountryOption {
  const c = (code || 'MZ').toUpperCase();
  return COUNTRIES.find(x => x.code === c) || COUNTRIES[0];
}

export function isLikelyWhatsApp(phone: string | null | undefined, countryCode = 'MZ'): boolean {
  if (!phone) return false;
  const cleaned = phone.trim();
  if (countryCode === 'MZ' || cleaned.startsWith('+258')) {
    return isMozambiqueMobile(cleaned);
  }
  const digits = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('+351') || countryCode === 'PT') {
    const local = digits.startsWith('351') ? digits.slice(3) : digits;
    return local.length === 9 && /^9/.test(local);
  }
  if (cleaned.startsWith('+244') || countryCode === 'AO') {
    const local = digits.startsWith('244') ? digits.slice(3) : digits;
    return local.length === 9 && /^9/.test(local);
  }
  if (cleaned.startsWith('+55') || countryCode === 'BR') {
    const local = digits.startsWith('55') ? digits.slice(2) : digits;
    return (local.length === 11 && local[2] === '9') || (local.length === 10 && local[2] >= '7');
  }
  if (cleaned.startsWith('+238') || countryCode === 'CV') {
    const local = digits.startsWith('238') ? digits.slice(3) : digits;
    return local.length === 7 && /^9/.test(local);
  }
  if (cleaned.startsWith('+239') || countryCode === 'ST') {
    const local = digits.startsWith('239') ? digits.slice(3) : digits;
    return local.length === 7 && /^9/.test(local);
  }
  if (cleaned.startsWith('+245') || countryCode === 'GW') {
    const local = digits.startsWith('245') ? digits.slice(3) : digits;
    return local.length === 7 && /^9/.test(local);
  }
  return digits.length >= 7;
}

/**
 * Gera URL direto para verificação na Biblioteca de Anúncios do Meta para Moçambique ou país selecionado
 */
export function getMetaAdLibraryUrl(businessName: string, countryCode = 'MZ'): string {
  const cc = (countryCode || 'MZ').toUpperCase();
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${cc}&q=${encodeURIComponent(businessName.trim())}`;
}

export interface Business { id: string; name: string; category: string; province: string; locality: string; country?: string; description: string; phone: string | null; website: string | null; instagram?: string | null; source: string; observedAt: string; isDemo: boolean; evidence: Evidence[]; saved?: boolean; suppressed?: boolean; phoneType?: 'mobile' | 'landline' | null; hasActiveAds?: boolean; city?: string; activity?: string; opportunityScore?: number; address?: string; }
export interface SearchFilters { country?: string; province?: string; locality?: string; category?: string; service: string; budget?: number; niche?: string; cities?: string; phone?: string; website?: string; instagram?: string }
export interface SearchTask { province: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'limited'; count: number; error?: string }
export interface SearchResult { id: string; status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed'; filters: SearchFilters; tasks: SearchTask[]; results: Business[]; allResults?: Business[]; total: number; page: number; pages: number; createdAt: string; mode: 'demo' | 'live' }
export interface Analysis { id: string; businessId: string; facts: {text: string; evidenceIds: string[]}[]; hypotheses: string[]; recommendedService: string; reason: string; missingData: string[]; draftMessage: string; confidence: string; mode: 'demo' | 'live'; createdAt: string }
export interface Job { id: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'; result?: Analysis; error?: string }
export interface Lead { id: string; businessId: string; business: Business; stage: Stage; note: string; nextActionAt: string | null; nextAction: string; amountMinor: number | null; createdAt: string; activities: Activity[] }
export interface Activity { id: string; type: string; note: string; createdAt: string }
export interface LedgerEntry { id: string; kind: string; units: number; createdAt: string; description: string }
export interface Dashboard { leads: number; due: number; proposalsMinor: number; stages: {stage: Stage; count: number}[]; tasks: Lead[]; recent: Activity[]; credits: Credits }
export interface VaultScript { id: string; category: 'primeiro-contato' | 'sem-site' | 'qualificacao' | 'oferta' | 'objecoes' | 'fechamento' | 'followup' | 'pos-venda'; categoryLabel: string; title: string; template: string; scenario: string; keyPhrases: string[] }
export interface PricingGuideline {
  minMt: number;
  maxMt: number;
  period: 'único' | 'mês';
  tierName: string;
  rationale: string;
  formattedRange: string;
}

export function getRecommendedPricing(service: string, nicheOrCategory = ''): PricingGuideline {
  const normNiche = (nicheOrCategory || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normService = (service || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const isHighTicket = /(clinic|medic|dent|odonto|hospital|saude|advocac|advogad|juridic|imobiliar|construt|construcao|engenhari|arquitet|consultor|seguro|banco|finan)/.test(normNiche);
  const isSmallLocal = /(salao|beleza|cabel|estetic|unha|nail|spa|barbear|lavandar|mecanic|oficin|padar|pastelar|boutique|artesan)/.test(normNiche);

  if (normService.includes('website') || normService.includes('site') || normService.includes('landing')) {
    if (isHighTicket) {
      return {
        minMt: 12000,
        maxMt: 25000,
        period: 'único',
        tierName: 'Alto Ticket · Clínicas / Imobiliárias / Consultorias',
        rationale: 'Nicho nobre com ticket elevado: exige site institucional robusto, design de alta autoridade e captação de clientes.',
        formattedRange: '12.000 – 25.000 MT'
      };
    }
    if (isSmallLocal) {
      return {
        minMt: 5000,
        maxMt: 12000,
        period: 'único',
        tierName: 'Serviços Locais · Salões / Barbearias / Oficinas',
        rationale: 'Pequenos comércios e serviços de bairro: landing page ágil, visual directo focada em cliques directos para o WhatsApp.',
        formattedRange: '5.000 – 12.000 MT'
      };
    }
    return {
      minMt: 8000,
      maxMt: 18000,
      period: 'único',
      tierName: 'Médio Porte · Restaurantes / Escolas / Comércio',
      rationale: 'Empresas médias: página completa com menu, catálogo de produtos ou serviços e integração WhatsApp.',
      formattedRange: '8.000 – 18.000 MT'
    };
  }

  if (normService.includes('trafego') || normService.includes('anuncio') || normService.includes('ads')) {
    if (isHighTicket) {
      return {
        minMt: 15000,
        maxMt: 30000,
        period: 'mês',
        tierName: 'Alto Ticket · Clínicas / Imobiliárias',
        rationale: 'Gestão de campanhas Meta e Google Ads de alta precisão com geração contínua de consultas e leads qualificados.',
        formattedRange: '15.000 – 30.000 MT/mês'
      };
    }
    if (isSmallLocal) {
      return {
        minMt: 6000,
        maxMt: 12000,
        period: 'mês',
        tierName: 'Serviços Locais · Salões / Barbearias',
        rationale: 'Anúncios locais de raio curto em volta do bairro/cidade para encher a agenda da semana com clientes próximos.',
        formattedRange: '6.000 – 12.000 MT/mês'
      };
    }
    return {
      minMt: 10000,
      maxMt: 20000,
      period: 'mês',
      tierName: 'Médio Porte · Restaurantes / Comércio',
      rationale: 'Campanhas periódicas de reconhecimento, pedidos e promoções para atrair público local constante.',
      formattedRange: '10.000 – 20.000 MT/mês'
    };
  }

  if (normService.includes('social') || normService.includes('rede')) {
    if (isHighTicket) {
      return {
        minMt: 12000,
        maxMt: 22000,
        period: 'mês',
        tierName: 'Alto Ticket · Clínicas / Advocacia',
        rationale: 'Posicionamento e autoridade técnica com conteúdos educativos, carrosséis e vídeos de alta qualidade visual.',
        formattedRange: '12.000 – 22.000 MT/mês'
      };
    }
    if (isSmallLocal) {
      return {
        minMt: 5000,
        maxMt: 10000,
        period: 'mês',
        tierName: 'Serviços Locais · Salões / Pequeno Comércio',
        rationale: 'Feed com fotos de trabalhos reais (antes/depois), stories diários e avisos de horários disponíveis.',
        formattedRange: '5.000 – 10.000 MT/mês'
      };
    }
    return {
      minMt: 8000,
      maxMt: 15000,
      period: 'mês',
      tierName: 'Médio Porte · Restaurantes / Serviços',
      rationale: 'Planeamento editorial, posts regulares e interacção com a comunidade local.',
      formattedRange: '8.000 – 15.000 MT/mês'
    };
  }

  if (normService.includes('whatsapp') || normService.includes('automacao')) {
    if (isHighTicket) {
      return {
        minMt: 8000,
        maxMt: 18000,
        period: 'único',
        tierName: 'Alto Ticket · Clínicas / Escritórios',
        rationale: 'Funil automatizado para triagem de pacientes/clientes, agendamento de consultas e confirmações.',
        formattedRange: '8.000 – 18.000 MT'
      };
    }
    if (isSmallLocal) {
      return {
        minMt: 4000,
        maxMt: 8000,
        period: 'único',
        tierName: 'Serviços Locais · Salões / Pequenos Negócios',
        rationale: 'Respostas automáticas a perguntas frequentes, lista de preços/serviços e encaminhamento rápido.',
        formattedRange: '4.000 – 8.000 MT'
      };
    }
    return {
      minMt: 6000,
      maxMt: 14000,
      period: 'único',
      tierName: 'Médio Porte · Restaurantes / Lojas',
      rationale: 'Cardápio ou catálogo em PDF, pedidos rápidos e suporte automatizado.',
      formattedRange: '6.000 – 14.000 MT'
    };
  }

  // Padrão para outros serviços
  return {
    minMt: isHighTicket ? 10000 : isSmallLocal ? 4000 : 7000,
    maxMt: isHighTicket ? 22000 : isSmallLocal ? 9000 : 15000,
    period: 'único',
    tierName: isHighTicket ? 'Nicho de Alto Ticket' : isSmallLocal ? 'Nicho de Pequeno Porte' : 'Nicho de Médio Porte',
    rationale: 'Proposta equilibrada de acordo com o porte do negócio e poder de investimento no mercado moçambicano.',
    formattedRange: isHighTicket ? '10.000 – 22.000 MT' : isSmallLocal ? '4.000 – 9.000 MT' : '7.000 – 15.000 MT'
  };
}

export const PLANS_ACTIVE = true;

export interface PlanDefinition {
  id: 'essential' | 'pro';
  name: string;
  tagline: string;
  priceMt: number;
  originalPriceMt?: number;
  period: string;
  badge?: string;
  popular?: boolean;
  creditsPerMonth: number;
  leadsPerSearch: number;
  features: string[];
  lojouCheckoutUrl: string;
  paymentMethods: string[];
}

export const PLANS: Record<'essential' | 'pro', PlanDefinition> = {
  essential: {
    id: 'essential',
    name: 'Prospecta Essencial',
    tagline: 'Pra quem está a começar a prospectar e quer fechar os seus primeiros clientes.',
    priceMt: 197,
    period: '/mês',
    creditsPerMonth: 150,
    leadsPerSearch: 10,
    features: [
      '150 créditos de prospecção por mês',
      'Até 10 leads por pesquisa',
      'Pesquisas em Moçambique e no exterior',
      'Diagnóstico comercial profundo de cada empresa',
      'Agente de Vendas com IA (abordagens de alta conversão)',
      'Acesso ao Cofre de Scripts de Prospecção',
      'Disparo de WhatsApp individual (Directo / Web)',
      'Relatório "Sem WhatsApp" com preenchimento manual e CSV',
      'Suporte via comunidade'
    ],
    lojouCheckoutUrl: 'https://pay.lojou.app/0tCdP',
    paymentMethods: ['M-Pesa', 'e-Mola', 'Cartão Visa/Mastercard', 'Lojou']
  },
  pro: {
    id: 'pro',
    name: 'Prospecta Pro',
    tagline: 'Pra quem prospecta e vende com frequência e quer máxima escala.',
    priceMt: 347,
    originalPriceMt: 497,
    period: '/mês',
    badge: 'Mais popular',
    popular: true,
    creditsPerMonth: 450,
    leadsPerSearch: 30,
    features: [
      '450 créditos de prospecção por mês',
      'Até 30 leads por pesquisa (Alta escala)',
      'Pesquisas Internacionais completas (Moçambique, Angola, Portugal, Brasil, África do Sul, Cabo Verde)',
      'Disparo em Massa Inteligente (Brevemente)',
      'Proteção e cadência inteligente anti-bloqueio no WhatsApp',
      'Análise profunda com verificação na Biblioteca de Anúncios Meta',
      'Acesso Ilimitado ao Cofre de Scripts + Gerador Gemini IA Pro',
      'Histórico completo de prospecção e CRM Kanban',
      'Exportação CSV ilimitada para equipas e fechamentos',
      'Suporte prioritário via WhatsApp'
    ],
    lojouCheckoutUrl: 'https://pay.lojou.app/Z4Uvt',
    paymentMethods: ['M-Pesa', 'e-Mola', 'Cartão Visa/Mastercard', 'Lojou']
  }
};

export function hasActivePaidPlan(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!user.subscription) return false;
  const isPaid = user.subscription.plan === 'essential' || user.subscription.plan === 'pro';
  if (!isPaid) return false;
  if (user.subscription.status !== 'active') return false;
  if (user.subscription.expiresAt && new Date(user.subscription.expiresAt).getTime() < Date.now()) {
    return false;
  }
  return true;
}

export const hasActivePlan = hasActivePaidPlan;

export function getPlanMaxLeads(user: User | null | undefined): number {
  if (!user) return 10;
  if (user.role === 'admin') return 50;
  if (user.subscription?.plan === 'pro') return PLANS.pro.leadsPerSearch;
  if (user.subscription?.plan === 'essential') return PLANS.essential.leadsPerSearch;
  return 10;
}
