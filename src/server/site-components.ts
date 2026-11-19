import type { SiteThemeConfig, ThemeColors } from './site-themes';
import { OFFICIAL_WHATSAPP_SVG } from './site-template';

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PhoneNormalizationResult {
  valid: boolean;
  needsCountryCode: boolean;
  raw: string;
  formattedDisplay: string;
  telLink: string; // SEMPRE formato internacional tel:+<dígitos>
  waLink: string; // SEMPRE https://wa.me/<dígitos>
  digitsWithCountry: string; // só dígitos incluindo indicativo
  countryCode?: string; // '258' | '244' | etc.
  message?: string;
}

/**
 * Normaliza números de telefone garantindo tel:+<int> e wa.me/<digits>
 * Suporta Moçambique (+258), Angola (+244) e internacional geral.
 * Regra estrita: um número sem indicativo nunca recebe +258 automaticamente.
 */
export function parseInternationalPhone(
  rawPhone: string,
  userCountryHint?: string
): PhoneNormalizationResult {
  const raw = (rawPhone || '').trim();
  if (!raw) {
    return {
      valid: false,
      needsCountryCode: false,
      raw: '',
      formattedDisplay: '',
      telLink: '',
      waLink: '',
      digitsWithCountry: ''
    };
  }

  const hasLeadingPlus = raw.startsWith('+');
  const hasLeading00 = raw.startsWith('00');
  let cleanDigits = raw.replace(/\D/g, '');

  if (hasLeading00) {
    cleanDigits = cleanDigits.slice(2);
  }

  // 1. Número traz indicativo explícito (+ ou 00)
  if (hasLeadingPlus || hasLeading00) {
    let countryCode = '';
    if (cleanDigits.startsWith('258')) countryCode = '258';
    else if (cleanDigits.startsWith('244')) countryCode = '244';
    else if (cleanDigits.startsWith('351')) countryCode = '351';
    else if (cleanDigits.startsWith('55')) countryCode = '55';
    else countryCode = cleanDigits.slice(0, 3);

    return {
      valid: cleanDigits.length >= 7,
      needsCountryCode: false,
      raw,
      formattedDisplay: hasLeadingPlus ? raw : `+${cleanDigits}`,
      telLink: `tel:+${cleanDigits}`,
      waLink: `https://wa.me/${cleanDigits}`,
      digitsWithCountry: cleanDigits,
      countryCode
    };
  }

  // 2. Número SEM indicativo (+ nem 00)
  // Regra obrigatória: NUNCA assumir +258 automaticamente!
  let profileCountryCode = '';
  if (userCountryHint) {
    const hintDigits = userCountryHint.replace(/\D/g, '');
    if (hintDigits.startsWith('244') || userCountryHint.toLowerCase().includes('angola') || userCountryHint.toLowerCase().includes('ao')) {
      profileCountryCode = '244';
    } else if (hintDigits.startsWith('258') || userCountryHint.toLowerCase().includes('mocambique') || userCountryHint.toLowerCase().includes('mz')) {
      profileCountryCode = '258';
    } else if (hintDigits) {
      profileCountryCode = hintDigits;
    }
  }

  // Se já veio com indicativo 258 ou 244 no início de 12 dígitos
  if (cleanDigits.startsWith('258') && cleanDigits.length === 12) {
    return {
      valid: true,
      needsCountryCode: false,
      raw,
      formattedDisplay: `+${cleanDigits}`,
      telLink: `tel:+${cleanDigits}`,
      waLink: `https://wa.me/${cleanDigits}`,
      digitsWithCountry: cleanDigits,
      countryCode: '258'
    };
  }

  if (cleanDigits.startsWith('244') && cleanDigits.length === 12) {
    return {
      valid: true,
      needsCountryCode: false,
      raw,
      formattedDisplay: `+${cleanDigits}`,
      telLink: `tel:+${cleanDigits}`,
      waLink: `https://wa.me/${cleanDigits}`,
      digitsWithCountry: cleanDigits,
      countryCode: '244'
    };
  }

  // Se o perfil do utilizador definiu um indicativo padrão
  if (profileCountryCode && cleanDigits.length === 9) {
    const full = `${profileCountryCode}${cleanDigits}`;
    return {
      valid: true,
      needsCountryCode: false,
      raw,
      formattedDisplay: `+${profileCountryCode} ${cleanDigits}`,
      telLink: `tel:+${full}`,
      waLink: `https://wa.me/${full}`,
      digitsWithCountry: full,
      countryCode: profileCountryCode
    };
  }

  // Se não tem indicativo e o perfil não forneceu: marca needsCountryCode = true!
  return {
    valid: false,
    needsCountryCode: true,
    raw,
    formattedDisplay: raw,
    telLink: cleanDigits ? `tel:+${cleanDigits}` : '',
    waLink: cleanDigits ? `https://wa.me/${cleanDigits}` : '',
    digitsWithCountry: cleanDigits,
    message: 'Número sem indicativo internacional (+258 para Moçambique, +244 para Angola).'
  };
}

export function cleanPhoneForWa(phone: string, userCountryHint?: string): string {
  const res = parseInternationalPhone(phone, userCountryHint);
  return res.digitsWithCountry || phone.replace(/\D/g, '');
}

export function getSvgIcon(name = 'star', size = 24): string {
  switch ((name || '').toLowerCase()) {
    case 'shield':
    case 'seguranca':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    case 'clock':
    case 'horario':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    case 'heart':
    case 'saude':
    case 'cuidado':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
    case 'sparkles':
    case 'estetica':
    case 'excelencia':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
    case 'map-pin':
    case 'localizacao':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    case 'phone':
    case 'telefone':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
    case 'check':
    case 'verificado':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    case 'user':
    case 'equipa':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    case 'award':
    case 'premio':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
}

/**
 * Gera um placeholder visualmente requintado quando não há foto enviada,
 * adaptado semanticamente ao nicho do negócio (sem elementos de clínica num restaurante ou oficina).
 */
export function renderPlaceholderPattern(label: string, category = 'Espaço & Instalações', niche = 'clinica'): string {
  let badgeText = 'Ambiente Climatizado & Humanizado';
  if (niche === 'restaurante') badgeText = 'Espaço Aconchegante & Área Lounge';
  else if (niche === 'salao') badgeText = 'Atendimento com Conforto & Estilo';
  else if (niche === 'oficina') badgeText = 'Oficina Equipada & Segurança';

  return `
    <div class="elegant-placeholder">
      <div class="ph-pattern-bg"></div>
      <div class="ph-content">
        <div class="ph-icon">${getSvgIcon(niche === 'restaurante' ? 'award' : (niche === 'salao' ? 'sparkles' : 'shield'), 28)}</div>
        <span class="ph-category">${escapeHtml(category)}</span>
        <strong class="ph-title">${escapeHtml(label)}</strong>
        <span class="ph-badge">${escapeHtml(badgeText)}</span>
      </div>
    </div>
  `;
}

