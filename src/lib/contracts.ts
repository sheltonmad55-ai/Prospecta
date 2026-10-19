export const PROVINCES = ['Cabo Delgado', 'Gaza', 'Inhambane', 'Manica', 'Maputo Província', 'Maputo Cidade', 'Nampula', 'Niassa', 'Sofala', 'Tete', 'Zambézia'] as const;
export const STAGES = ['Novo', 'Contactado', 'Em conversa', 'Proposta', 'Ganho', 'Perdido'] as const;
export const SERVICES = ['Criação de websites', 'Menus e catálogos digitais', 'Gestão de redes sociais', 'Design e identidade visual', 'Fotografia', 'Consultoria'] as const;
export type Stage = typeof STAGES[number];
export interface Credits { available: number; reserved: number; spent: number }
export interface Profile { service: string; pitch: string; province: string; phone: string; nationwide: boolean; onboarded: boolean }
export interface User { id: string; name: string; email: string; workspaceId: string; role: 'owner' | 'admin'; profile: Profile; credits: Credits }
export interface Evidence { id: string; field: string; value: string; source: string; observedAt: string }
export function isMozambiqueMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('258')) {
    local = local.slice(3);
  }
  return local.length >= 8 && local.startsWith('8');
}

export interface Business { id: string; name: string; category: string; province: string; locality: string; description: string; phone: string | null; website: string | null; instagram?: string | null; source: string; observedAt: string; isDemo: boolean; evidence: Evidence[]; saved?: boolean; suppressed?: boolean; phoneType?: 'mobile' | 'landline' | null; }
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
