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
export interface User { id: string; name: string; email: string; workspaceId: string; role: 'owner' | 'admin'; profile: Profile; credits: Credits }
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

/**
 * Gera URL direto para verificação na Biblioteca de Anúncios do Meta para Moçambique
 */
export function getMetaAdLibraryUrl(businessName: string): string {
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=MZ&q=${encodeURIComponent(businessName.trim())}`;
}

export interface Business { id: string; name: string; category: string; province: string; locality: string; description: string; phone: string | null; website: string | null; instagram?: string | null; source: string; observedAt: string; isDemo: boolean; evidence: Evidence[]; saved?: boolean; suppressed?: boolean; phoneType?: 'mobile' | 'landline' | null; hasActiveAds?: boolean; }
export interface SearchFilters { province?: string; locality?: string; category?: string; service: string; budget?: number; niche?: string; cities?: string; phone?: string; website?: string; instagram?: string }
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
