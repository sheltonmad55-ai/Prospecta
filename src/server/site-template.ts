/**
 * Renderizador de templates de sites para o módulo "Criar site" (V2).
 * Converte o JSON estruturado num documento HTML5 responsivo, mobile-first,
 * com CSS inline, suporte a scroll animations com prefers-reduced-motion,
 * formulário interativo para o WhatsApp e glifo oficial do WhatsApp.
 */

export interface SiteServiceItem {
  title: string;
  description: string;
  icon?: string;
  exemplo?: boolean;
}

export interface SiteReviewItem {
  author: string;
  rating: number;
  comment: string;
  exemplo?: boolean;
}

export interface SiteContent {
  businessName: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutText: string;
  services: SiteServiceItem[];
  address: string;
  openingHours: string;
  phone: string;
  whatsappNumber: string;
  whatsappMessage?: string;
  style: 'moderno' | 'elegante' | 'simples';
  primaryColor: string;
  accentColor?: string;
  images?: string[];
  reviews?: SiteReviewItem[];
  mapsEmbedUrl?: string;
  missingFields?: string[];
  placeholdersPending?: number;
  hasExampleData?: boolean;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanPhoneForWa(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('258')) return digits;
  if (digits.length === 9) return `258${digits}`;
  return digits || '258840000000';
}

// Glifo Oficial do WhatsApp (recursos de marca oficiais Meta/WhatsApp)
export const OFFICIAL_WHATSAPP_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.23-.19-.48-.31"/></svg>`;

function getServiceIconSvg(iconName = 'star'): string {
  switch (iconName.toLowerCase()) {
    case 'shield':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    case 'clock':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    case 'heart':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
    case 'sparkles':
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
    default:
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
}

import { renderSiteTemplateV3, type SiteContentV3 } from './site-template-v3';
import { SITE_THEMES } from './site-themes';

export function renderSiteTemplate(content: SiteContent | any, isDraft = false, isEditorMode = false): string {
  // Converte SiteContent para o formato enriquecido V3 garantindo compatibilidade total
  const rawStyle = (content.style || '') as string;
  const themeId = content.themeId || ((rawStyle in SITE_THEMES)
    ? (rawStyle as any)
    : (content.style === 'elegante' ? 'odontoart-champagne' : (content.style === 'simples' ? 'dentalcare-emerald' : 'odontoart-champagne')));

  const v3Content: any = {
    ...content,
    businessName: content.businessName,
    tagline: content.tagline,
    heroHeadline: content.heroHeadline,
    heroSubheadline: content.heroSubheadline,
    aboutText: content.aboutText,
    services: content.services,
    address: content.address,
    openingHours: content.openingHours,
    phone: content.phone,
    whatsappNumber: content.whatsappNumber,
    whatsappMessage: content.whatsappMessage,
    themeId,
    primaryColor: content.primaryColor,
    images: content.images,
    reviews: content.reviews,
    mapsEmbedUrl: content.mapsEmbedUrl,
    placeholdersPending: content.placeholdersPending,
    hasExampleData: content.hasExampleData,
    global: content.global,
    sectionsOrder: content.sectionsOrder,
    sections: content.sections
  };

  return renderSiteTemplateV3(v3Content, isDraft, isEditorMode);
}
