export const SITE_GENERATION_CREDIT_COST = 5;
export const SITE_REGENERATION_CREDIT_COST = 2;
export const SITE_MAX_IMAGES = 10;
export const SITE_MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const SITE_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const SITE_NICHES = [
  { id: 'clinica', label: 'Clínica & Saúde' },
  { id: 'salao', label: 'Salão de Beleza & Estética' },
  { id: 'restaurante', label: 'Restaurante & Cafetaria' },
  { id: 'oficina', label: 'Oficina & Mecânica' },
  { id: 'outro', label: 'Outro Negócio Local' }
] as const;

export type SiteNiche = typeof SITE_NICHES[number]['id'];

export const SITE_STYLES = [
  { id: 'moderno', label: 'Moderno & Dinâmico' },
  { id: 'elegante', label: 'Elegante & Sofisticado' },
  { id: 'simples', label: 'Simples & Direto' }
] as const;

export type SiteStyle = typeof SITE_STYLES[number]['id'];

export interface SiteSourceData {
  businessName: string;
  niche?: SiteNiche | string;
  phone?: string;
  address?: string;
  openingHours?: string;
  services?: string;
  style?: SiteStyle | string;
  primaryColor?: string;
  socialLink?: string;
  referenceSiteUrl?: string;
  mapsUrl?: string;
  rawProfileText?: string;
  reviews?: Array<string | { author: string; rating?: number; comment: string }>;
  missingFields?: string[];
}

export interface GeneratedSite {
  id: string;
  userId: string;
  slug: string;
  businessName: string;
  niche: string;
  sourceData: SiteSourceData;
  images: string[];
  content?: any;
  html: string;
  template?: string;
  placeholdersPending?: number;
  isLegacy?: boolean;
  status: 'draft' | 'approved';
  createdAt: string;
  updatedAt: string;
}

