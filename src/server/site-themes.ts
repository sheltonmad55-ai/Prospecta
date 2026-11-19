/**
 * Biblioteca de Temas Oficiais do Módulo "Criar Site" da Prospecta.
 * Criada e refinada com base nos 6 sites reais de produção em Moçambique:
 * 1. OdontoArt Maputo (Editorial Champagne & Linho)
 * 2. Pro-Dente 2 Alto Maé (Navy & Cyan Clínico)
 * 3. Yes Sir Dental Clinic Group (Verde Floresta & Dourado Nobre)
 * 4. Vitalmed Clinic Matola (Azul Hospitalar & Confiança Médica)
 * 5. DentalHome Consultórios (Royal Navy & Cyan Vibrante)
 * 6. Dental Care Clínicas (Esmeralda & Saúde Oral)
 */

export type SiteThemeId =
  | 'odontoart-champagne'    // OdontoArt: Editorial champagne/terracota e linho
  | 'prodente-navy-cyan'      // Pro-Dente 2: Azul marinho com ciano clínico
  | 'yessir-green-gold'       // Yes Sir: Verde nobre com tipografia editorial
  | 'vitalmed-blue'           // Vitalmed: Azul cerúleo hospitalar com Fraunces serif
  | 'dentalhome-royal'        // DentalHome: Azul royal profundo com ciano elétrico
  | 'dentalcare-emerald'      // Dental Care: Esmeralda moderno com fundo claro
  | 'moderno-escuro'          // Lounge / Restaurante (ex: Jymmys Grill)
  | 'clinica-premium'         // Alias de compatibilidade
  | 'claro-elegante';         // Alias de compatibilidade

export interface ThemeColors {
  bgPage: string;
  bgSurface: string;
  bgSubtle: string;
  bgWarmTint?: string;
  borderFine: string;
  borderFocus: string;
  textTitle: string;
  textBody: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  primarySubtle: string;
  primaryRgb: string;
  accent: string;
  colorWhatsapp: string;
  colorWhatsappHover: string;
  shadowCard: string;
  shadowHover: string;
}

export interface SiteThemeConfig {
  id: SiteThemeId;
  name: string;
  referenceSite: string;
  description: string;
  fontEditorial: string;
  fontClean: string;
  googleFontsUrl: string;
  defaultColors: ThemeColors;
  radiusCard: string;
  radiusButton: string;
  headerStyle: 'glass-light' | 'glass-dark' | 'solid-white';
}

export const SITE_THEMES: Record<SiteThemeId, SiteThemeConfig> = {
  // 1. ODONTOART MAPUTO (Editorial Champagne & Linho)
  'odontoart-champagne': {
    id: 'odontoart-champagne',
    name: 'Champagne Editorial (Inspirado em OdontoArt)',
    referenceSite: 'https://odontoart-maputo.surge.sh/',
    description: 'Paleta editorial nobre em champagne amadeirado, linho suave e tipografia serifada de alto padrão.',
    fontEditorial: "'Playfair Display', Georgia, serif",
    fontClean: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    radiusCard: '16px',
    radiusButton: '9999px',
    headerStyle: 'glass-light',
    defaultColors: {
      bgPage: '#FAF8F5',
      bgSurface: '#FFFFFF',
      bgSubtle: '#F4EFEA',
      bgWarmTint: '#F8F5F0',
      borderFine: '#EAE3DB',
      borderFocus: '#A37F62',
      textTitle: '#2B2623',
      textBody: '#6B625B',
      textMuted: '#8E847C',
      primary: '#A37F62',
      primaryDark: '#8C684D',
      primarySubtle: '#F6F1EC',
      primaryRgb: '163, 127, 98',
      accent: '#25D366',
      colorWhatsapp: '#25D366',
      colorWhatsappHover: '#1EBE5D',
      shadowCard: '0 4px 24px rgba(43, 38, 35, 0.05)',
      shadowHover: '0 12px 36px rgba(43, 38, 35, 0.09)'
    }
  },

  // 2. PRO-DENTE 2 ALTO MAÉ (Navy & Cyan Clínico)
  'prodente-navy-cyan': {
    id: 'prodente-navy-cyan',
    name: 'Azul Tecnológico & Ciano (Inspirado em Pro-Dente 2)',
    referenceSite: 'https://prodente-mz.surge.sh/',
    description: 'Azul marinho profundo com ciano antisséptico refrescante e tipografia geométrica Outfit.',
    fontEditorial: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    fontClean: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap',
    radiusCard: '14px',
    radiusButton: '12px',
    headerStyle: 'solid-white',
    defaultColors: {
      bgPage: '#F8FAFC',
      bgSurface: '#FFFFFF',
      bgSubtle: '#E6F7F5',
      bgWarmTint: '#F0FAF9',
      borderFine: '#E2E8F0',
      borderFocus: '#00A896',
      textTitle: '#0B2545',
      textBody: '#334155',
      textMuted: '#64748B',
      primary: '#00A896',
      primaryDark: '#028073',
      primarySubtle: '#E6F7F5',
      primaryRgb: '0, 168, 150',
      accent: '#25D366',
      colorWhatsapp: '#25D366',
      colorWhatsappHover: '#1EBE5D',
      shadowCard: '0 4px 20px rgba(11, 37, 69, 0.06)',
      shadowHover: '0 12px 32px rgba(11, 37, 69, 0.12)'
    }
  },

  // 3. YES SIR DENTAL CLINIC GROUP (Verde Floresta Nobre)
  'yessir-green-gold': {
    id: 'yessir-green-gold',
    name: 'Verde Prestígio & Editorial (Inspirado em Yes Sir)',
    referenceSite: 'https://yessir-dental.surge.sh/',
    description: 'Verde institucional acolhedor com Playfair Display editorial e toques de sofisticação clínica.',
    fontEditorial: "'Playfair Display', Georgia, serif",
    fontClean: "'Plus Jakarta Sans', -apple-system, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    radiusCard: '16px',
    radiusButton: '9999px',
    headerStyle: 'glass-light',
    defaultColors: {
      bgPage: '#F9FBF8',
      bgSurface: '#FFFFFF',
      bgSubtle: '#F0FDF4',
      bgWarmTint: '#EAF7E9',
      borderFine: '#E2E8F0',
      borderFocus: '#3A8A1C',
      textTitle: '#0D2114',
      textBody: '#374151',
      textMuted: '#6B7280',
      primary: '#3A8A1C',
      primaryDark: '#2C6C14',
      primarySubtle: '#F0FDF4',
      primaryRgb: '58, 138, 28',
      accent: '#25D366',
      colorWhatsapp: '#25D366',
      colorWhatsappHover: '#1EBE5D',
      shadowCard: '0 4px 20px rgba(13, 33, 20, 0.05)',
      shadowHover: '0 12px 34px rgba(13, 33, 20, 0.09)'
    }
  },

  // 4. VITALMED CLINIC MATOLA (Azul Hospitalar & Fraunces Serif)
  'vitalmed-blue': {
    id: 'vitalmed-blue',
    name: 'Azul Hospitalar & Confiança (Inspirado em Vitalmed)',
    referenceSite: 'https://vitalmed-clinic.surge.sh/',
    description: 'Azul cerúleo profundo com tipografia médica humanizada Fraunces e foco em convênios e confiança.',
    fontEditorial: "'Fraunces', Georgia, serif",
    fontClean: "'Plus Jakarta Sans', -apple-system, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    radiusCard: '14px',
    radiusButton: '10px',
    headerStyle: 'solid-white',
    defaultColors: {
      bgPage: '#F8FAFC',
      bgSurface: '#FFFFFF',
      bgSubtle: '#E8F5FA',
      bgWarmTint: '#F0F9FF',
      borderFine: '#E2E8F0',
      borderFocus: '#007EA7',
      textTitle: '#0B3B4F',
      textBody: '#334155',
      textMuted: '#64748B',
      primary: '#007EA7',
      primaryDark: '#005F7E',
      primarySubtle: '#E8F5FA',
      primaryRgb: '0, 126, 167',
      accent: '#25D366',
      colorWhatsapp: '#25D366',
      colorWhatsappHover: '#1EBE5D',
      shadowCard: '0 4px 20px rgba(11, 59, 79, 0.05)',
      shadowHover: '0 12px 32px rgba(11, 59, 79, 0.1)'
    }
  },

  // 5. DENTALHOME CONSULTÓRIOS (Royal Navy & Cyan Vibrante)
  'dentalhome-royal': {
    id: 'dentalhome-royal',
    name: 'Azul Royal & Ciano Elétrico (Inspirado em DentalHome)',
    referenceSite: 'https://dentalhome-mz.surge.sh/',
    description: 'Azul marinho imperial com ciano vibrante, transmitindo excelência técnica e unidades múltiplas.',
    fontEditorial: "'Fraunces', Georgia, serif",
    fontClean: "'Plus Jakarta Sans', -apple-system, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    radiusCard: '16px',
    radiusButton: '12px',
    headerStyle: 'solid-white',
    defaultColors: {
      bgPage: '#F9FAFB',
      bgSurface: '#FFFFFF',
      bgSubtle: 'rgba(36, 157, 226, 0.1)',
      bgWarmTint: '#F0F9FF',
      borderFine: '#E5E7EB',
      borderFocus: '#020D9A',
      textTitle: '#01074D',
      textBody: '#374151',
      textMuted: '#6B7280',
      primary: '#020D9A',
      primaryDark: '#01074D',
      primarySubtle: 'rgba(2, 13, 154, 0.08)',
      primaryRgb: '2, 13, 154',
      accent: '#249DE2',
      colorWhatsapp: '#25D366',
      colorWhatsappHover: '#1EBE5D',
      shadowCard: '0 4px 20px rgba(2, 13, 154, 0.06)',
      shadowHover: '0 12px 36px rgba(2, 13, 154, 0.12)'
    }
  },

  // 6. DENTAL CARE CLÍNICAS (Esmeralda & Saúde Oral)
  'dentalcare-emerald': {
    id: 'dentalcare-emerald',
    name: 'Esmeralda Clínico & Luminoso (Inspirado em Dental Care)',
    referenceSite: 'https://clinicasdentalcare.surge.sh/',
    description: 'Verde esmeralda médico vivo com marinho corporativo, cartões arredondados e estética limpa.',
    fontEditorial: "'Outfit', sans-serif",
    fontClean: "'Plus Jakarta Sans', -apple-system, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    radiusCard: '16px',
    radiusButton: '9999px',
    headerStyle: 'solid-white',
    defaultColors: {
      bgPage: '#F8FAFC',
      bgSurface: '#FFFFFF',
      bgSubtle: '#ECFDF5',
      bgWarmTint: '#D1FAE5',
      borderFine: '#E2E8F0',
      borderFocus: '#059669',
      textTitle: '#0F172A',
      textBody: '#334155',
      textMuted: '#64748B',
      primary: '#059669',
      primaryDark: '#047857',
      primarySubtle: '#ECFDF5',
      primaryRgb: '5, 150, 105',
      accent: '#10B981',
      colorWhatsapp: '#25D366',
      colorWhatsappHover: '#1EBE5D',
      shadowCard: '0 4px 20px rgba(5, 150, 105, 0.06)',
      shadowHover: '0 12px 32px rgba(5, 150, 105, 0.12)'
    }
  },

  // 7. MODERNO ESCURO (Lounge / Restaurantes / Bares)
  'moderno-escuro': {
    id: 'moderno-escuro',
    name: '7. Moderno Escuro (Lounge, Bar & Restaurante)',
    referenceSite: 'https://prospecta-mz.vercel.app/s/jymmys-grill-and-bar-7d4dae4309f5',
    description: 'Grafite profundo com toques âmbar e alto contraste para restaurantes, gastronomia e lounges noturnos.',
    fontEditorial: "'Playfair Display', Georgia, serif",
    fontClean: "'Plus Jakarta Sans', -apple-system, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    radiusCard: '18px',
    radiusButton: '14px',
    headerStyle: 'glass-dark',
    defaultColors: {
      bgPage: '#0A0E17',
      bgSurface: '#121826',
      bgSubtle: '#1A2338',
      bgWarmTint: '#161F33',
      borderFine: 'rgba(255, 255, 255, 0.09)',
      borderFocus: '#EAB308',
      textTitle: '#F8FAFC',
      textBody: '#CBD5E1',
      textMuted: '#94A3B8',
      primary: '#EAB308',
      primaryDark: '#CA8A04',
      primarySubtle: 'rgba(234, 179, 8, 0.12)',
      primaryRgb: '234, 179, 8',
      accent: '#25D366',
      colorWhatsapp: '#25D366',
      colorWhatsappHover: '#1EBE5D',
      shadowCard: '0 8px 30px rgba(0, 0, 0, 0.35)',
      shadowHover: '0 16px 44px rgba(0, 0, 0, 0.55)'
    }
  },

  // ALIASES DE COMPATIBILIDADE RETROATIVA
  get 'clinica-premium'() {
    return this['odontoart-champagne'];
  },
  get 'claro-elegante'() {
    return this['dentalcare-emerald'];
  }
};

/**
 * Detecta automaticamente o tema mais adequado com base na URL de referência fornecida
 */
export function matchThemeFromReferenceUrl(url?: string): SiteThemeId | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('odontoart')) return 'odontoart-champagne';
  if (lower.includes('prodente')) return 'prodente-navy-cyan';
  if (lower.includes('yessir')) return 'yessir-green-gold';
  if (lower.includes('vitalmed')) return 'vitalmed-blue';
  if (lower.includes('dentalhome')) return 'dentalhome-royal';
  if (lower.includes('dentalcare') || lower.includes('clinicasdentalcare')) return 'dentalcare-emerald';
  return null;
}

export function hexToRgb(hex: string): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2) || '00', 16);
  const g = parseInt(clean.substring(2, 4) || '00', 16);
  const b = parseInt(clean.substring(4, 6) || '00', 16);
  return `${r}, ${g}, ${b}`;
}

export function shadeHexColor(hex: string, percent: number): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 0 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
