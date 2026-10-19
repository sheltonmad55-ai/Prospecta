export const PROVINCES = ['Cabo Delgado', 'Gaza', 'Inhambane', 'Manica', 'Maputo Província', 'Maputo Cidade', 'Nampula', 'Niassa', 'Sofala', 'Tete', 'Zambézia'] as const;
export const STAGES = ['Novo', 'Contactado', 'Em conversa', 'Proposta', 'Ganho', 'Perdido'] as const;
export const SERVICES = [
  'Tráfego pago (Anúncios online)',
  'Criação de websites',
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
