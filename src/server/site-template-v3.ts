/**
 * Renderizador Moderno e Profissional de Templates de Sites (V3).
 * Implementa a biblioteca com mais de 12 secções modulares, 3 temas de alto padrão (OdontoArt, Claro e Moderno Escuro),
 * variáveis CSS responsivas, suporte a fotos ou marcadores gráficos intencionais,
 * e visibilidade garantida por defeito (sem bugs de IntersectionObserver).
 */

import {
  type SiteThemeId,
  SITE_THEMES,
  hexToRgb,
  shadeHexColor
} from './site-themes';
import {
  escapeHtml,
  cleanPhoneForWa,
  parseInternationalPhone,
  getSvgIcon,
  renderPlaceholderPattern
} from './site-components';
import { OFFICIAL_WHATSAPP_SVG } from './site-template';
import {
  normalizeSiteModel,
  getDefaultSectionsOrder,
  TYPOGRAPHY_PRESETS,
  type TypographyPresetId,
  type SiteGlobalElements,
  type SiteSectionConfig
} from './site-operations';

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
  role?: string;
  exemplo?: boolean;
}

export interface SiteStepItem {
  number: string;
  title: string;
  description: string;
}

export interface SiteDifferenceItem {
  title: string;
  description: string;
  metric?: string;
}

export interface SiteFaqItem {
  question: string;
  answer: string;
}

export interface SiteContentV3 {
  themeId?: SiteThemeId;
  businessName: string;
  niche?: string;
  tagline: string;
  heroVariant?: 'split' | 'centered' | 'banner';
  servicesVariant?: 'cards-icon' | 'minimal-list';
  aboutVariant?: 'split-quote' | 'features-box';
  heroHeadline: string;
  heroSubheadline: string;
  heroBadge?: string;
  aboutTitle?: string;
  aboutText: string;
  servicesTitle?: string;
  servicesSubtitle?: string;
  services: SiteServiceItem[];
  differentialsTitle?: string;
  differentials?: SiteDifferenceItem[];
  stepsTitle?: string;
  stepsSubtitle?: string;
  steps?: SiteStepItem[];
  images?: string[];
  galleryTitle?: string;
  gallerySubtitle?: string;
  reviewsTitle?: string;
  reviews?: SiteReviewItem[];
  faqTitle?: string;
  faq?: SiteFaqItem[];
  address: string;
  openingHours: string;
  phone: string;
  whatsappNumber: string;
  whatsappMessage?: string;
  primaryColor?: string;
  mapsEmbedUrl?: string;
  hiddenSections?: string[];
  placeholdersPending?: number;
  hasExampleData?: boolean;
  global?: Partial<SiteGlobalElements>;
  sectionsOrder?: string[];
  sections?: Record<string, SiteSectionConfig>;
}

export function renderSiteTemplateV3(rawContent: SiteContentV3 | any, isDraft = false, isEditorMode = false): string {
  const content = normalizeSiteModel(rawContent);

  // 1. Determina o Tema e as Cores CSS
  const rawThemeId = (content.themeId || '') as string;
  const selectedThemeId: SiteThemeId = (rawThemeId in SITE_THEMES)
    ? (rawThemeId as SiteThemeId)
    : (content.niche === 'restaurante' ? 'moderno-escuro' : 'clinica-premium');

  const theme = SITE_THEMES[selectedThemeId];
  let customPrimary = content.primaryColor && content.primaryColor.startsWith('#')
    ? content.primaryColor
    : theme.defaultColors.primary;

  const primaryRgb = hexToRgb(customPrimary);
  const primaryDark = shadeHexColor(customPrimary, -18);
  const primarySubtle = `rgba(${primaryRgb}, 0.12)`;

  const c = {
    ...theme.defaultColors,
    primary: customPrimary,
    primaryDark,
    primarySubtle,
    primaryRgb
  };

  const businessName = escapeHtml(content.businessName || 'Empresa Local');
  const tagline = escapeHtml(content.tagline || 'Excelência & Cuidado Personalizado');
  const heroHeadline = escapeHtml(content.heroHeadline || content.businessName || 'Atendimento de Excelência');
  const heroSubheadline = escapeHtml(content.heroSubheadline || content.tagline || 'Referência e confiança ao seu serviço.');
  const aboutText = escapeHtml(content.aboutText || '');
  const address = escapeHtml(content.address || 'Maputo, Moçambique');
  const openingHours = escapeHtml(content.openingHours || 'Segunda a Sábado');
  const phone = escapeHtml(content.phone || '+258 84 000 0000');
  const parsedPhone = parseInternationalPhone(content.phone || content.whatsappNumber || '+258 84 000 0000');
  const waPhone = parsedPhone.digitsWithCountry || cleanPhoneForWa(content.whatsappNumber || content.phone || '');
  const rawWaMsg = content.whatsappMessage || `Olá! Encontrei o website oficial da ${content.businessName} e gostaria de agendar um atendimento.`;
  const encodedWaMsg = encodeURIComponent(rawWaMsg);
  const waLink = `https://wa.me/${waPhone}?text=${encodedWaMsg}`;
  // Link de chamada SEMPRE tel:+<número com indicativo>
  const telLink = parsedPhone.telLink || `tel:+${waPhone}`;

  const embedAddress = encodeURIComponent(content.address || content.businessName || 'Maputo');
  const embedMapUrl = content.mapsEmbedUrl || `https://www.google.com/maps?q=${embedAddress}&hl=pt&z=15&output=embed`;

  const images = Array.isArray(content.images) ? content.images.filter(Boolean) : [];
  const services = Array.isArray(content.services) ? content.services : [];
  const reviews = Array.isArray(content.reviews) ? content.reviews : [];
  const hiddenSections = new Set(content.hiddenSections || []);

  // Determinação das Variantes de Layout Estrutural com base no Tema ou no Conteúdo
  let heroVariant: 'split' | 'centered' | 'banner' = content.heroVariant || 'split';
  let servicesVariant: 'cards-icon' | 'minimal-list' = content.servicesVariant || 'cards-icon';
  let aboutVariant: 'split-quote' | 'features-box' = content.aboutVariant || 'split-quote';

  // Se não foi definido explicitamente, cada tema possui o seu layout característico
  if (!content.heroVariant) {
    if (selectedThemeId === 'prodente-navy-cyan' || selectedThemeId === 'dentalhome-royal') {
      heroVariant = 'centered';
    } else if (selectedThemeId === 'yessir-green-gold' || selectedThemeId === 'dentalcare-emerald' || selectedThemeId === 'moderno-escuro') {
      heroVariant = 'banner';
    } else {
      heroVariant = 'split'; // odontoart-champagne, vitalmed-blue
    }
  }

  if (!content.servicesVariant) {
    if (selectedThemeId === 'yessir-green-gold' || selectedThemeId === 'vitalmed-blue' || selectedThemeId === 'dentalcare-emerald') {
      servicesVariant = 'minimal-list';
    } else {
      servicesVariant = 'cards-icon';
    }
  }

  if (!content.aboutVariant) {
    if (selectedThemeId === 'vitalmed-blue' || selectedThemeId === 'dentalhome-royal' || selectedThemeId === 'dentalcare-emerald') {
      aboutVariant = 'features-box';
    } else {
      aboutVariant = 'split-quote';
    }
  }

  const isRestaurante = (content.niche || '').toLowerCase().includes('restaurante') ||
                        (content.niche || '').toLowerCase().includes('bar') ||
                        (content.niche || '').toLowerCase().includes('grill') ||
                        (content.niche || '').toLowerCase().includes('lounge');

  const isSalao = (content.niche || '').toLowerCase().includes('salao') ||
                  (content.niche || '').toLowerCase().includes('estetica') ||
                  (content.niche || '').toLowerCase().includes('cabelo');

  const isOficina = (content.niche || '').toLowerCase().includes('oficina') ||
                    (content.niche || '').toLowerCase().includes('auto') ||
                    (content.niche || '').toLowerCase().includes('mecanic');

  // Fallback Inteligente de Diferenciais por Nicho (marcado com Exemplo se não veio do utilizador)
  let differentials: SiteDifferenceItem[] = [];
  let isExampleDifferentials = false;

  if (content.differentials && content.differentials.length > 0) {
    differentials = content.differentials;
  } else {
    isExampleDifferentials = true;
    if (isRestaurante) {
      differentials = [
        { metric: '100% Fresco', title: 'Ingredientes Selecionados', description: 'Carnes de primeira e mariscos frescos preparados no ponto com sabor autêntico.' },
        { metric: 'Carta Especial', title: 'Bar & Cocktails de Assinatura', description: 'Cocktails artesanais, seleção de vinhos e bebidas geladas para brindar.' },
        { metric: 'Reserva Direta', title: 'Mesa Garantida Sem Esperas', description: 'Reserve o seu espaço diretamente pelo WhatsApp de forma rápida e confirmada.' }
      ];
    } else if (isSalao) {
      differentials = [
        { metric: 'Alta Gama', title: 'Produtos Profissionais', description: 'Tratamentos capilares e corporais com marcas consagradas e seguras.' },
        { metric: 'Especialistas', title: 'Cuidado Personalizado', description: 'Profissionais dedicados a valorizar a sua beleza e o seu bem-estar.' },
        { metric: 'Pontualidade', title: 'Atendimento com Hora Marcada', description: 'Respeito total ao seu tempo e conforto numa atmosfera relaxante.' }
      ];
    } else if (isOficina) {
      differentials = [
        { metric: 'Precisão', title: 'Diagnóstico Computadorizado', description: 'Deteção rápida e exata de qualquer anomalia técnica ou mecânica.' },
        { metric: 'Garantia', title: 'Peças Genuínas Certificadas', description: 'Qualidade comprovada e segurança total para o seu veículo.' },
        { metric: 'Transparência', title: 'Orçamento Prévio Claro', description: 'Aprovação de valores antes do início do serviço, sem surpresas na fatura.' }
      ];
    } else {
      differentials = [
        { metric: '100%', title: 'Atendimento Humanizado', description: 'Cuidado atencioso e acompanhamento individualizado para cada paciente.' },
        { metric: 'Biosegurança', title: 'Padrão Rigoroso de Higiene', description: 'Protocolos estritos de esterilização e conforto em todas as etapas.' },
        { metric: 'Ágil', title: 'Agendamento Direto e Simples', description: 'Sem filas e com comunicação rápida e transparente via WhatsApp.' }
      ];
    }
  }

  // Passos por Nicho
  const steps: SiteStepItem[] = content.steps && content.steps.length > 0
    ? content.steps
    : isRestaurante
    ? [
        { number: '01', title: 'Escolha o Dia & Hora', description: 'Selecione a data pretendida e o número de pessoas para a sua visita.' },
        { number: '02', title: 'Confirmação no WhatsApp', description: 'A nossa equipa reserva a melhor mesa e esclarece preferências de menu.' },
        { number: '03', title: 'Aproveite a Experiência', description: 'Chegue, desfrute dos nossos cortes e cocktails num ambiente acolhedor.' }
      ]
    : [
        { number: '01', title: 'Primeiro Contacto', description: 'Envie uma mensagem curta pelo WhatsApp com a sua necessidade ou preferência de horário.' },
        { number: '02', title: 'Agendamento Imediato', description: 'A nossa equipa confirma a data e esclarece qualquer dúvida sem complicação.' },
        { number: '03', title: 'Atendimento Dedicado', description: 'Receba uma experiência confortável com profissionais especializados e atenciosos.' }
      ];

  // Verificação de aprovação formal do site
  const isApproved = content.status === 'approved' || !isDraft;

  // Verificação estrita de dados de exemplo pendentes (Ponto 2)
  const hasPendingData = !isApproved && Boolean(
    (content.placeholders_pending || 0) > 0 ||
    (content.placeholdersPending || 0) > 0 ||
    content.hasExampleData ||
    isExampleDifferentials ||
    (Array.isArray(content.differentials) && content.differentials.some((d: any) => d.exemplo)) ||
    (Array.isArray(content.services) && content.services.some((s: any) => s.exemplo))
  );

  // A etiqueta Prévia e o aviso ficam estritamente protegidos se houver dados pendentes
  const shouldShowDraftBadge = !isApproved && (hasPendingData ? true : (isDraft && content.global?.showDraftBadge !== false));

  const faqList: SiteFaqItem[] = content.faq && content.faq.length > 0
    ? content.faq
    : [
        { question: 'Como faço para agendar um horário?', answer: 'Basta clicar em qualquer botão de WhatsApp nesta página para falar diretamente connosco e escolher a melhor data.' },
        { question: 'Quais são as formas de pagamento disponíveis?', answer: 'Aceitamos M-Pesa, E-Mola, cartões de débito/crédito e transferência bancária local.' },
        { question: 'Existe estacionamento ou facilidade de acesso?', answer: `Sim, o nosso espaço em ${address} possui localização de fácil acesso com segurança no local.` }
      ];

  // Determinação de Tipografia Curada
  const customTypo = content.customTypography && TYPOGRAPHY_PRESETS[content.customTypography as TypographyPresetId];
  const activeGoogleFontsUrl = customTypo ? customTypo.googleFontsUrl : theme.googleFontsUrl;
  const activeFontEditorial = customTypo ? customTypo.editorialFont : theme.fontEditorial;
  const activeFontClean = customTypo ? customTypo.cleanFont : theme.fontClean;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} | Website Oficial</title>
  ${isDraft ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="description" content="' + escapeHtml(content.tagline || businessName) + '">'}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${activeGoogleFontsUrl}" rel="stylesheet">
  <style>
    :root {
      --bg-page: ${c.bgPage};
      --bg-surface: ${c.bgSurface};
      --bg-subtle: ${c.bgSubtle};
      --bg-warm-tint: ${c.bgWarmTint || c.bgSubtle};
      --border-fine: ${c.borderFine};
      --border-focus: ${c.borderFocus};
      --text-title: ${c.textTitle};
      --text-body: ${c.textBody};
      --text-muted: ${c.textMuted};
      --primary: ${c.primary};
      --primary-dark: ${c.primaryDark};
      --primary-subtle: ${c.primarySubtle};
      --primary-rgb: ${c.primaryRgb};
      --accent: ${c.accent};
      --color-wa: ${c.colorWhatsapp};
      --color-wa-hover: ${c.colorWhatsappHover};
      --shadow-card: ${c.shadowCard};
      --shadow-hover: ${c.shadowHover};
      --font-editorial: ${activeFontEditorial};
      --font-clean: ${activeFontClean};
      --radius-card: ${theme.radiusCard};
      --radius-btn: ${theme.radiusButton};
      --max-w: 1140px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-clean);
      background-color: var(--bg-page);
      color: var(--text-body);
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 96px;
    }
    a { color: inherit; text-decoration: none; }
    .container { max-width: var(--max-w); margin: 0 auto; padding: 0 24px; }

    /* VISIBILIDADE GARANTIDA POR DEFEITO (Sem bugs de opacidade zero) */
    .section, .fade-in-section {
      opacity: 1;
      transform: none;
    }

    /* Animação progressiva opcional apenas se JS e CSS suportarem */
    @media (prefers-reduced-motion: no-preference) {
      .js-animated {
        opacity: 0;
        transform: translateY(18px);
        transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .js-animated.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* TOPBAR HEADER ELEGANTE - Sem sobreposição */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: ${theme.id === 'moderno-escuro' ? 'rgba(10, 14, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)'};
      border-bottom: 1px solid var(--border-fine);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .topbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 72px;
      gap: 16px;
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0; /* Previne transbordo e sobreposição */
      flex: 1;
    }
    .brand-symbol {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary);
      flex-shrink: 0;
      box-shadow: 0 0 0 4px var(--primary-subtle);
    }
    .brand-title {
      font-family: var(--font-editorial);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-title);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.02em;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .btn-top-wa {
      background: var(--color-wa);
      color: #052E16;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 9px 18px;
      border-radius: var(--radius-btn);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 10px rgba(37, 211, 102, 0.2);
    }
    .btn-top-wa:hover {
      background: var(--color-wa-hover);
      transform: translateY(-1px);
    }

    /* BADGE DE PRÉVIA DISCRETA NO CANTO SUPERIOR */
    .badge-previa-tag {
      font-size: 0.7rem;
      font-weight: 800;
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FCD34D;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    /* HERO SECTION REFINADO */
    .hero {
      padding: 72px 0 60px;
      position: relative;
    }
    /* HERO VARIANTE 1: SPLIT */
    .hero-split {
      display: grid;
      grid-template-columns: 1fr;
      gap: 40px;
      align-items: center;
    }
    @media (min-width: 900px) {
      .hero-split { grid-template-columns: 1.15fr 0.85fr; gap: 64px; }
      .hero { padding: 96px 0 80px; }
    }

    /* HERO VARIANTE 2: CENTERED (Pro-Dente / DentalHome) */
    .hero-centered {
      text-align: center;
      max-width: 860px;
      margin: 0 auto;
      padding: 60px 0 40px;
    }
    .hero-centered .hero-eyebrow {
      margin-left: auto;
      margin-right: auto;
    }
    .hero-centered .hero-subtitle {
      margin-left: auto;
      margin-right: auto;
    }
    .hero-centered .hero-btns {
      justify-content: center;
      margin-bottom: 36px;
    }
    .hero-trust-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 24px;
      padding: 16px 24px;
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-card);
    }
    .htb-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-title);
    }
    .htb-item span.dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--primary);
    }

    /* HERO VARIANTE 3: BANNER EDITORIAL (Yes Sir / Dental Care / Moderno Escuro) */
    .hero-banner {
      background: linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-page) 100%);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 48px 36px;
      box-shadow: var(--shadow-card);
      position: relative;
      overflow: hidden;
    }
    @media (min-width: 900px) {
      .hero-banner { padding: 64px 56px; }
    }
    .hero-banner-inner {
      position: relative;
      z-index: 2;
      max-width: 720px;
    }
    .hero-banner-glow {
      position: absolute;
      top: -20%;
      right: -10%;
      width: 420px;
      height: 420px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(var(--primary-rgb), 0.14) 0%, transparent 70%);
      pointer-events: none;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--primary-subtle);
      border: 1px solid rgba(var(--primary-rgb), 0.25);
      color: var(--primary-dark);
      font-size: 0.8rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .hero-title {
      font-family: var(--font-editorial);
      font-size: clamp(2.1rem, 5vw, 3.4rem);
      font-weight: 700;
      color: var(--text-title);
      line-height: 1.18;
      letter-spacing: -0.03em;
      margin-bottom: 20px;
    }
    .hero-subtitle {
      font-size: 1.1rem;
      color: var(--text-body);
      line-height: 1.65;
      margin-bottom: 36px;
      max-width: 580px;
    }
    .hero-btns {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      align-items: center;
    }
    .btn-cta-hero {
      background: var(--color-wa);
      color: #052E16;
      font-weight: 700;
      font-size: 1rem;
      padding: 16px 30px;
      border-radius: var(--radius-btn);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 10px 28px rgba(37, 211, 102, 0.28);
      transition: all 0.25s ease;
    }
    .btn-cta-hero:hover {
      background: var(--color-wa-hover);
      transform: translateY(-2px);
      box-shadow: 0 14px 34px rgba(37, 211, 102, 0.35);
    }
    .btn-cta-call {
      background: var(--bg-surface);
      color: var(--text-title);
      border: 1px solid var(--border-fine);
      font-weight: 600;
      font-size: 0.95rem;
      padding: 15px 24px;
      border-radius: var(--radius-btn);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: var(--shadow-card);
    }
    .btn-cta-call:hover {
      border-color: var(--border-focus);
      transform: translateY(-1px);
    }

    /* CARD VISUAL HERO */
    .hero-visual-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 30px;
      box-shadow: var(--shadow-hover);
      position: relative;
    }
    .hvc-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #15803D;
      margin-bottom: 16px;
    }
    .hvc-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22C55E;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
    }

    /* VARIANTE DE SERVIÇOS 2: MINIMAL-LIST (Clínicas de Precisão e Consultórios) */
    .services-minimal-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    @media (min-width: 768px) {
      .services-minimal-list { grid-template-columns: 1fr 1fr; }
    }
    .min-service-row {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 24px 26px;
      display: flex;
      gap: 18px;
      align-items: flex-start;
      transition: all 0.2s ease;
      box-shadow: var(--shadow-card);
    }
    .min-service-row:hover {
      border-color: var(--border-focus);
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
    }
    .min-service-idx {
      font-family: var(--font-editorial);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--primary);
      opacity: 0.85;
      line-height: 1;
      padding-top: 2px;
      flex-shrink: 0;
    }
    .min-service-content {
      flex: 1;
    }
    .min-service-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-title);
      margin-bottom: 6px;
    }
    .min-service-desc {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.55;
    }

    /* VARIANTES DA SECÇÃO SOBRE NÓS */
    .about-split-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 36px;
      align-items: center;
    }
    @media (min-width: 860px) {
      .about-split-layout {
        grid-template-columns: 0.95fr 1.05fr;
        gap: 56px;
      }
    }
    .about-quote-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-left: 4px solid var(--primary);
      border-radius: var(--radius-card);
      padding: 36px 32px;
      box-shadow: var(--shadow-card);
    }
    .about-quote-text {
      font-family: var(--font-editorial);
      font-size: clamp(1.2rem, 2.5vw, 1.5rem);
      font-style: italic;
      color: var(--text-title);
      line-height: 1.45;
      margin-bottom: 20px;
    }
    .about-features-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 40px 32px;
      box-shadow: var(--shadow-card);
    }
    .af-pillar {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      margin-top: 20px;
    }
    .af-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(var(--primary-rgb), 0.12);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-weight: 700;
    }

    /* EDIÇÃO DIRETA INLINE NO MODO DRAFT */
    [contenteditable="true"] {
      outline: none;
      border-radius: 4px;
      transition: background 0.15s ease, box-shadow 0.15s ease;
      cursor: text;
    }
    [contenteditable="true"]:hover {
      background: rgba(var(--primary-rgb), 0.06);
    }
    [contenteditable="true"]:focus {
      background: rgba(var(--primary-rgb), 0.1);
      box-shadow: 0 0 0 2px var(--primary);
    }

    /* SEÇÕES GENÉRICAS */
    .section-wrap {
      padding: 80px 0;
      border-top: 1px solid var(--border-fine);
    }
    .section-head {
      text-align: center;
      max-width: 680px;
      margin: 0 auto 52px;
    }
    .section-tag {
      display: inline-block;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--primary);
      margin-bottom: 12px;
    }
    .section-title {
      font-family: var(--font-editorial);
      font-size: clamp(1.8rem, 3.5vw, 2.5rem);
      font-weight: 700;
      color: var(--text-title);
      letter-spacing: -0.02em;
      line-height: 1.25;
      margin-bottom: 14px;
    }
    .section-desc {
      font-size: 1.05rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* GRID DE DIFERENCIAIS */
    .diff-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }
    .diff-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 32px 28px;
      box-shadow: var(--shadow-card);
      transition: all 0.25s ease;
    }
    .diff-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-hover);
      border-color: var(--border-focus);
    }
    .diff-metric {
      font-family: var(--font-editorial);
      font-size: 2.2rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 8px;
    }
    .diff-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-title);
      margin-bottom: 8px;
    }
    .diff-text {
      font-size: 0.925rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* GRID DE SERVIÇOS */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }
    .service-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 34px 30px;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
      transition: all 0.25s ease;
    }
    .service-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-hover);
      border-color: var(--border-focus);
    }
    .service-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: var(--primary-subtle);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .service-title {
      font-family: var(--font-editorial);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-title);
      margin-bottom: 10px;
      letter-spacing: -0.01em;
    }
    .service-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 20px;
      flex-grow: 1;
    }
    .service-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--primary);
      font-weight: 700;
      font-size: 0.875rem;
      transition: gap 0.2s ease;
    }
    .service-card:hover .service-action {
      gap: 10px;
    }

    /* PASSOS "COMO FUNCIONA" */
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 28px;
    }
    .step-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 32px 26px;
      position: relative;
    }
    .step-num {
      font-family: var(--font-editorial);
      font-size: 2.4rem;
      font-weight: 700;
      color: var(--primary);
      opacity: 0.8;
      line-height: 1;
      margin-bottom: 16px;
    }
    .step-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-title);
      margin-bottom: 8px;
    }
    .step-desc {
      font-size: 0.925rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* GALERIA & PLACEHOLDERS REFINADOS */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }
    .gallery-photo {
      width: 100%;
      height: 240px;
      object-fit: cover;
      border-radius: var(--radius-card);
      border: 1px solid var(--border-fine);
      box-shadow: var(--shadow-card);
    }
    .elegant-placeholder {
      background: linear-gradient(135deg, var(--bg-surface), var(--bg-subtle));
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      height: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      box-shadow: var(--shadow-card);
      position: relative;
      overflow: hidden;
    }
    .ph-icon {
      color: var(--primary);
      margin-bottom: 12px;
    }
    .ph-category {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--primary);
      margin-bottom: 6px;
    }
    .ph-title {
      display: block;
      font-family: var(--font-editorial);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-title);
      margin-bottom: 8px;
    }
    .ph-badge {
      display: inline-block;
      font-size: 0.75rem;
      color: var(--text-muted);
      background: rgba(var(--primary-rgb), 0.08);
      padding: 3px 10px;
      border-radius: 9999px;
    }

    /* DEPOIMENTOS */
    .reviews-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }
    .review-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 32px 28px;
      box-shadow: var(--shadow-card);
    }
    .review-stars {
      color: #F59E0B;
      display: flex;
      gap: 4px;
      margin-bottom: 14px;
    }
    .review-text {
      font-size: 0.95rem;
      line-height: 1.65;
      color: var(--text-body);
      font-style: italic;
      margin-bottom: 18px;
    }
    .review-author {
      font-weight: 700;
      color: var(--text-title);
      font-size: 0.925rem;
    }
    .review-role {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    /* FORMULÁRIO DE WHATSAPP ELEGANTE */
    .wa-box-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 44px 36px;
      max-width: 680px;
      margin: 0 auto;
      box-shadow: var(--shadow-hover);
    }
    .form-row {
      margin-bottom: 20px;
    }
    .form-lbl {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-title);
      margin-bottom: 8px;
    }
    .form-ctrl {
      width: 100%;
      background: var(--bg-subtle);
      border: 1px solid var(--border-fine);
      color: var(--text-title);
      padding: 13px 16px;
      border-radius: 10px;
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s ease;
    }
    .form-ctrl:focus {
      border-color: var(--color-wa);
      background: var(--bg-surface);
      box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.15);
    }
    .btn-submit-wa {
      width: 100%;
      background: var(--color-wa);
      color: #052E16;
      font-weight: 700;
      font-size: 1.05rem;
      padding: 16px;
      border-radius: var(--radius-btn);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(37, 211, 102, 0.25);
      transition: all 0.2s ease;
      margin-top: 10px;
    }
    .btn-submit-wa:hover {
      background: var(--color-wa-hover);
      transform: translateY(-2px);
    }

    /* FAQ ACCORDION */
    .faq-grid {
      max-width: 760px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .faq-item {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: 12px;
      padding: 22px 24px;
      box-shadow: var(--shadow-card);
    }
    .faq-q {
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--text-title);
      margin-bottom: 8px;
    }
    .faq-a {
      font-size: 0.95rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* LOCALIZAÇÃO E MAPA */
    .contact-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 32px;
      align-items: stretch;
    }
    @media (min-width: 860px) {
      .contact-grid { grid-template-columns: 1fr 1fr; }
    }
    .contact-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      padding: 36px 32px;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .c-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .c-icon {
      color: var(--primary);
      flex-shrink: 0;
      margin-top: 3px;
    }
    .c-label {
      font-size: 0.78rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .c-value {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-title);
    }
    .map-embed {
      width: 100%;
      height: 100%;
      min-height: 320px;
      border: 1px solid var(--border-fine);
      border-radius: var(--radius-card);
      background: var(--bg-surface);
      box-shadow: var(--shadow-card);
    }

    /* BARRA FIXA - APENAS EM DISPOSITIVOS MÓVEIS (Oculta em Desktop) */
    .sticky-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: ${theme.id === 'moderno-escuro' ? 'rgba(10, 14, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)'};
      border-top: 1px solid var(--border-fine);
      padding: 12px 18px;
      display: flex;
      gap: 12px;
      z-index: 999;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    @media (min-width: 769px) {
      .sticky-bar {
        display: none !important;
      }
      body {
        padding-bottom: 0 !important;
      }
    }
    .sticky-btn-wa {
      flex: 2;
      background: var(--color-wa);
      color: #052E16;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 12px 18px;
      border-radius: var(--radius-btn);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(37, 211, 102, 0.25);
    }
    .sticky-btn-call {
      flex: 1;
      background: var(--bg-subtle);
      color: var(--text-title);
      font-weight: 600;
      font-size: 0.95rem;
      padding: 12px 16px;
      border-radius: var(--radius-btn);
      border: 1px solid var(--border-fine);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .footer {
      padding: 50px 0 24px;
      text-align: center;
      border-top: 1px solid var(--border-fine);
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    /* CARTÕES DE SERVIÇO EXPANDIDOS */
    .cards-large .service-card {
      padding: 44px 34px !important;
      min-height: 230px !important;
    }
    .cards-large .service-title {
      font-size: 1.35rem !important;
      margin-bottom: 12px !important;
    }
    .cards-large .service-desc {
      font-size: 1.05rem !important;
      line-height: 1.65 !important;
    }
    .cards-large .min-service-row {
      padding: 34px 32px !important;
    }
    .cards-large .min-service-title {
      font-size: 1.25rem !important;
    }
    .cards-large .min-service-desc {
      font-size: 1.02rem !important;
    }

    /* AJUSTES RESPONSIVOS DE 390px A 1280px */
    @media (max-width: 600px) {
      .topbar-inner { height: 64px; }
      .brand-title { font-size: 1.05rem; max-width: 160px; }
      .btn-top-wa span { display: none; }
      .btn-top-wa { padding: 9px 12px; }
      .hero { padding: 48px 0 36px; }
      .section-wrap { padding: 56px 0; }
      .wa-box-card { padding: 28px 20px; }
    }
  </style>
</head>
<body>

  ${hasPendingData ? `
  <!-- FAIXA PROTEGIDA DE DADOS DE EXEMPLO (NÃO PODE SER DESLIGADA ENQUANTO HOUVER DADOS PENDENTES) -->
  <aside class="warning-example-banner" style="background:#FFFBEB; border-bottom:1px solid #FCD34D; color:#92400E; font-size:0.8rem; font-weight:700; text-align:center; padding:10px 16px; display:flex; align-items:center; justify-content:center; gap:8px;">
    <span>⚠️ Prévia: dados de exemplo a confirmar antes da publicação.</span>
  </aside>
  ` : ''}

  <!-- CABEÇALHO TOPBAR LIVRE DE SOBREPOSIÇÕES -->
  <header class="topbar">
    <div class="container topbar-inner">
      <div class="brand-wrap">
        <span class="brand-symbol"></span>
        <span class="brand-title" title="${businessName}" ${isEditorMode ? 'contenteditable="true"' : ''}>${businessName}</span>
      </div>
      <div class="topbar-actions">
        ${shouldShowDraftBadge ? '<span class="badge-previa-tag">Prévia</span>' : ''}
        ${content.global?.showHeaderWa !== false ? `
          <a href="#agendamento" class="btn-top-wa">
            ${OFFICIAL_WHATSAPP_SVG}
            <span>${escapeHtml(content.global?.headerWaText || 'Falar no WhatsApp')}</span>
          </a>
        ` : ''}
      </div>
    </div>
  </header>

  <main>
    ${(content.sectionsOrder || getDefaultSectionsOrder()).map((secId: string) => {
      const sec = content.sections?.[secId];
      if (sec && sec.visible === false) return '';

      // --- SECÇÃO: HERO ---
      if (secId === 'hero') {
        const heroStyles = content.sections?.hero?.styleOverrides || {};
        const heroBg = heroStyles.bg ? `background: ${heroStyles.bg} !important;` : '';
        const heroColor = heroStyles.textColor ? `color: ${heroStyles.textColor} !important;` : '';
        const heroExtraStyle = (heroBg || heroColor) ? `style="${heroBg} ${heroColor} border-radius: var(--radius-card); padding: 48px 32px; margin-top: 24px;"` : '';

        return `
        <section class="hero container" ${heroExtraStyle}>
          ${heroVariant === 'centered' ? `
            <div class="hero-centered">
              <div class="hero-eyebrow">
                ${getSvgIcon('sparkles', 16)}
                <span ${isEditorMode ? 'contenteditable="true"' : ''}>${tagline}</span>
              </div>
              <h1 class="hero-title" ${isEditorMode ? 'contenteditable="true"' : ''} style="${heroColor}">${heroHeadline}</h1>
              <p class="hero-subtitle" ${isEditorMode ? 'contenteditable="true"' : ''} style="${heroColor}">${heroSubheadline}</p>
              <div class="hero-btns">
                ${content.global?.showHeroWa !== false ? `
                  <a href="#agendamento" class="btn-cta-hero">
                    ${OFFICIAL_WHATSAPP_SVG}
                    <span>${escapeHtml(content.global?.heroWaText || (isRestaurante ? 'Reservar no WhatsApp' : 'Agendar no WhatsApp'))}</span>
                  </a>
                ` : ''}
                ${content.global?.showCallButton !== false ? `
                  <a href="${telLink}" class="btn-cta-call">
                    ${getSvgIcon('phone', 18)}
                    <span>${escapeHtml(content.global?.callButtonText || phone)}</span>
                  </a>
                ` : ''}
              </div>
              <div class="hero-trust-bar">
                <div class="htb-item"><span class="dot"></span> <span>Confirmação Imediata</span></div>
                <div class="htb-item"><span class="dot"></span> <span>${address}</span></div>
                <div class="htb-item"><span class="dot"></span> <span>${openingHours}</span></div>
              </div>
            </div>
          ` : heroVariant === 'banner' ? `
            <div class="hero-banner" ${heroBg ? `style="${heroBg}"` : ''}>
              <div class="hero-banner-glow"></div>
              <div class="hero-banner-inner">
                <div class="hero-eyebrow">
                  ${getSvgIcon('sparkles', 16)}
                  <span ${isEditorMode ? 'contenteditable="true"' : ''}>${tagline}</span>
                </div>
                <h1 class="hero-title" ${isEditorMode ? 'contenteditable="true"' : ''} style="${heroColor}">${heroHeadline}</h1>
                <p class="hero-subtitle" ${isEditorMode ? 'contenteditable="true"' : ''} style="${heroColor}">${heroSubheadline}</p>
                <div class="hero-btns">
                  ${content.global?.showHeroWa !== false ? `
                    <a href="#agendamento" class="btn-cta-hero">
                      ${OFFICIAL_WHATSAPP_SVG}
                      <span>${escapeHtml(content.global?.heroWaText || (isRestaurante ? 'Reservar no WhatsApp' : 'Falar no WhatsApp'))}</span>
                    </a>
                  ` : ''}
                  ${content.global?.showCallButton !== false ? `
                    <a href="${telLink}" class="btn-cta-call">
                      ${getSvgIcon('phone', 18)}
                      <span>${escapeHtml(content.global?.callButtonText || phone)}</span>
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>
          ` : `
            <div class="hero-split">
              <div>
                <div class="hero-eyebrow">
                  ${getSvgIcon('sparkles', 16)}
                  <span ${isEditorMode ? 'contenteditable="true"' : ''}>${tagline}</span>
                </div>
                <h1 class="hero-title" ${isEditorMode ? 'contenteditable="true"' : ''} style="${heroColor}">${heroHeadline}</h1>
                <p class="hero-subtitle" ${isEditorMode ? 'contenteditable="true"' : ''} style="${heroColor}">${heroSubheadline}</p>
                <div class="hero-btns">
                  ${content.global?.showHeroWa !== false ? `
                    <a href="#agendamento" class="btn-cta-hero">
                      ${OFFICIAL_WHATSAPP_SVG}
                      <span>${escapeHtml(content.global?.heroWaText || (isRestaurante ? 'Reservar no WhatsApp' : 'Agendar no WhatsApp'))}</span>
                    </a>
                  ` : ''}
                  ${content.global?.showCallButton !== false ? `
                    <a href="${telLink}" class="btn-cta-call">
                      ${getSvgIcon('phone', 18)}
                      <span>${escapeHtml(content.global?.callButtonText || phone)}</span>
                    </a>
                  ` : ''}
                </div>
              </div>

              ${content.global?.showHeroVisualCard !== false ? `
              <div class="hero-visual-card">
                <div class="hvc-badge">
                  <span class="hvc-pulse"></span>
                  <span>${isRestaurante ? 'Mesa Garantida & Atendimento Confirmado' : 'Atendimento Rápido e Confirmado'}</span>
                </div>
                <strong style="display:block; font-family:var(--font-editorial); font-size:1.4rem; color:var(--text-title); margin-bottom:8px;">
                  ${businessName}
                </strong>
                <p style="font-size:0.95rem; color:var(--text-muted); line-height:1.6; margin-bottom:20px;">
                  ${isRestaurante ? 'Ambiente relaxado, localização nobre em ' + address + ' e reservas diretas no WhatsApp.' : 'Ambiente climatizado, localização estratégica em ' + address + ' e confirmação de horários diretamente no WhatsApp.'}
                </p>
                <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:var(--bg-subtle); border-radius:10px; border:1px solid var(--border-fine);">
                  <div style="color:var(--primary); font-size:1.2rem;">⏱️</div>
                  <div style="font-size:0.875rem;">
                    <strong style="color:var(--text-title); display:block;">Horário de Funcionamento</strong>
                    <span style="color:var(--text-muted);">${openingHours}</span>
                  </div>
                </div>
              </div>
              ` : ''}
            </div>
          `}
        </section>
        `;
      }

      // --- SECÇÃO: DIFERENCIAIS ---
      if (secId === 'differentials') {
        return `
        <section class="section-wrap" style="background:var(--bg-warm-tint);">
          <div class="container">
            <div class="diff-grid">
              ${differentials.map(d => `
                <div class="diff-card">
                  <div class="diff-metric">${escapeHtml(d.metric || '★')} ${isExampleDifferentials ? '<span style="font-size:0.65rem; background:#D97706; color:#FFFFFF; padding:2px 6px; border-radius:4px; vertical-align:middle; font-family:var(--font-clean); font-weight:700;">Exemplo</span>' : ''}</div>
                  <h3 class="diff-title" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(d.title)}</h3>
                  <p class="diff-text" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(d.description)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
        `;
      }

      // --- SECÇÃO: SOBRE ---
      if (secId === 'about') {
        const text = sec?.content || aboutText;
        if (!text) return '';
        return `
        <section class="section-wrap">
          <div class="container">
            ${aboutVariant === 'features-box' ? `
              <div class="about-features-card">
                <div class="section-head" style="margin-bottom:32px; text-align:left;">
                  <span class="section-tag">${isRestaurante ? 'A Nossa História' : 'A Nossa Missão'}</span>
                  <h2 class="section-title" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(sec?.title || 'Excelência, Cuidado e Confiança')}</h2>
                  <p class="section-desc" style="max-width:100%; margin-bottom:28px;" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(text)}</p>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:20px;">
                  <div class="af-pillar">
                    <div class="af-icon">✓</div>
                    <div>
                      <strong style="color:var(--text-title); display:block; margin-bottom:4px;">Atendimento Dedicado</strong>
                      <span style="font-size:0.875rem; color:var(--text-muted);">Acompanhamento cuidadoso e atenção total a cada solicitação.</span>
                    </div>
                  </div>
                  <div class="af-pillar">
                    <div class="af-icon">✓</div>
                    <div>
                      <strong style="color:var(--text-title); display:block; margin-bottom:4px;">Padrão Comprovado</strong>
                      <span style="font-size:0.875rem; color:var(--text-muted);">Compromisso contínuo com resultados de alta qualidade.</span>
                    </div>
                  </div>
                  <div class="af-pillar">
                    <div class="af-icon">✓</div>
                    <div>
                      <strong style="color:var(--text-title); display:block; margin-bottom:4px;">Comunicação Transparente</strong>
                      <span style="font-size:0.875rem; color:var(--text-muted);">Informações claras e resposta rápida em todos os canais.</span>
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="about-split-layout">
                <div class="about-quote-box">
                  <p class="about-quote-text">"${isRestaurante ? 'A melhor gastronomia nasce do respeito aos ingredientes frescos e da alegria de bem receber.' : 'A verdadeira excelência reside no cuidado atencioso, na precisão técnica e no respeito pelo seu tempo.'}"</p>
                  <span style="font-size:0.85rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.06em;">${businessName} &bull; Padrão Oficial</span>
                </div>
                <div>
                  <span class="section-tag">${isRestaurante ? 'A Nossa Casa' : 'A Nossa Missão'}</span>
                  <h2 class="section-title" style="margin-bottom:20px;" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(sec?.title || 'Dedicação e Proximidade')}</h2>
                  <p class="section-desc" style="line-height:1.7;" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(text)}</p>
                </div>
              </div>
            `}
          </div>
        </section>
        `;
      }

      // --- SECÇÃO: SERVIÇOS (OU DUPLICADOS: SERVIÇOS 2, PACOTES, ETC.) ---
      if (secId.startsWith('services')) {
        const items = (sec?.content && Array.isArray(sec.content) && sec.content.length > 0) ? sec.content : services;
        if (!items || items.length === 0) return '';
        const title = sec?.title || content.servicesTitle || (isRestaurante ? 'Especialidades da Casa' : 'Serviços Pensados para Si');
        const subtitle = sec?.subtitle || content.servicesSubtitle || (isRestaurante ? 'Pratos nobres, marisco e cocktails preparados com excelência.' : 'Tratamento de alto nível com profissionais capacitados e materiais certificados.');
        const isCardsLarge = sec?.styleOverrides?.cardSize === 'large';

        return `
        <section class="section-wrap ${isCardsLarge ? 'cards-large' : ''}" style="background:var(--bg-surface);">
          <div class="container">
            <div class="section-head">
              <span class="section-tag">${isRestaurante ? 'Menu & Sabores' : 'Especialidades'}</span>
              <h2 class="section-title" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(title)}</h2>
              <p class="section-desc" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(subtitle)}</p>
            </div>

            ${servicesVariant === 'minimal-list' ? `
              <div class="services-minimal-list">
                ${items.map((s: any, idx: number) => `
                  <div class="min-service-row">
                    <div class="min-service-idx">${String(idx + 1).padStart(2, '0')}</div>
                    <div class="min-service-content">
                      <h3 class="min-service-title" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(s.title)}</h3>
                      <p class="min-service-desc" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(s.description)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="services-grid">
                ${items.map((s: any) => `
                  <div class="service-card">
                    <div class="service-icon-wrap">
                      ${getSvgIcon(s.icon || 'star', 26)}
                    </div>
                    <h3 class="service-title" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(s.title)}</h3>
                    <p class="service-desc" ${isEditorMode ? 'contenteditable="true"' : ''}>${escapeHtml(s.description)}</p>
                    <a href="#agendamento" class="service-action">
                      <span>${isRestaurante ? 'Saber mais' : 'Saber disponibilidade'}</span>
                      <span>→</span>
                    </a>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </section>
        `;
      }

      // --- SECÇÃO: PASSOS ---
      if (secId === 'steps') {
        const stepItems = (sec?.content && Array.isArray(sec.content) && sec.content.length > 0) ? sec.content : steps;
        return `
        <section class="section-wrap">
          <div class="container">
            <div class="section-head">
              <span class="section-tag">Simples e Eficaz</span>
              <h2 class="section-title">Como Funciona o Seu Agendamento</h2>
              <p class="section-desc">Transparência do primeiro clique até ao final do atendimento.</p>
            </div>
            <div class="steps-grid">
              ${stepItems.map((st: any) => `
                <div class="step-card">
                  <div class="step-num">${escapeHtml(st.number)}</div>
                  <h3 class="step-title">${escapeHtml(st.title)}</h3>
                  <p class="step-desc">${escapeHtml(st.description)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
        `;
      }

      // --- SECÇÃO: GALERIA ---
      if (secId === 'gallery') {
        return `
        <section class="section-wrap" style="background:var(--bg-warm-tint);">
          <div class="container">
            <div class="section-head">
              <span class="section-tag">${isRestaurante ? 'Ambiente & Experiência' : isSalao ? 'O Nosso Estúdio' : isOficina ? 'Oficina & Instalações' : 'Espaço & Instalações'}</span>
              <h2 class="section-title">${isRestaurante ? 'O Nosso Espaço & Conforto' : isSalao ? 'Ambiente Acolhedor & Exclusivo' : isOficina ? 'Espaço Técnico & Equipamentos' : 'Instalações Confortáveis & Higienizadas'}</h2>
              <p class="section-desc">Um espaço pensado para o seu bem-estar, comodidade e melhor atendimento.</p>
            </div>
            <div class="gallery-grid">
              ${images.length > 0 ? (
                images.map((img: string) => `
                  <img src="${escapeHtml(img)}" alt="${businessName}" class="gallery-photo" loading="lazy">
                `).join('')
              ) : (
                `
                  ${renderPlaceholderPattern(isRestaurante ? 'Salão Principal & Lounge' : isSalao ? 'Salão Principal de Atendimento' : isOficina ? 'Área de Elevadores & Mecânica' : 'Gabinete Principal de Atendimento', 'Espaço', content.niche)}
                  ${renderPlaceholderPattern(isRestaurante ? 'Área de Mesas & Esplanada' : isSalao ? 'Bancadas & Lavatórios Relaxantes' : isOficina ? 'Diagnóstico & Eletrónica Auto' : 'Sala de Espera Climatizada', 'Conforto', content.niche)}
                  ${renderPlaceholderPattern(isRestaurante ? 'Bar & Cozinha Equipada' : isSalao ? 'Produtos & Cuidados Profissionais' : isOficina ? 'Ferramentas de Precisão & Peças' : 'Esterilização & Biossegurança', isRestaurante ? 'Qualidade' : isOficina ? 'Garantia' : 'Padrão Rigoroso', content.niche)}
                `
              )}
            </div>
          </div>
        </section>
        `;
      }

      // --- SECÇÃO: AVALIAÇÕES (SÓ SE FORNECIDAS E REAIS) ---
      if (secId === 'reviews') {
        const reviewItems = (sec?.content && Array.isArray(sec.content) && sec.content.length > 0) ? sec.content : reviews;
        if (!reviewItems || reviewItems.length === 0) return '';
        return `
        <section class="section-wrap">
          <div class="container">
            <div class="section-head">
              <span class="section-tag">Opinião de Quem Confia</span>
              <h2 class="section-title">Depoimentos dos Nossos Clientes</h2>
              <p class="section-desc">A satisfação de quem já passou pelo nosso atendimento.</p>
            </div>
            <div class="reviews-grid">
              ${reviewItems.map((r: any) => `
                <div class="review-card">
                  <div class="review-stars">★★★★★</div>
                  <p class="review-text">"${escapeHtml(r.comment)}"</p>
                  <div class="review-author">${escapeHtml(r.author)}</div>
                  <div class="review-role">${escapeHtml(r.role || 'Cliente Verificado')}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
        `;
      }

      // --- SECÇÃO: FORMULÁRIO WHATSAPP ---
      if (secId === 'wa_form') {
        if (content.global?.showWaForm === false) return '';
        return `
        <section id="agendamento" class="section-wrap" style="background:var(--bg-surface);">
          <div class="container">
            <div class="wa-box-card">
              <div style="text-align:center; margin-bottom:28px;">
                <span class="section-tag">Atendimento Imediato</span>
                <h2 class="section-title" style="margin-bottom:8px;">${escapeHtml(sec?.title || 'Falar com a Nossa Equipa')}</h2>
                <p class="section-desc" style="margin-bottom:0;">Preencha os campos abaixo para abrir o WhatsApp com a mensagem pronta.</p>
              </div>

              <form id="waForm" onsubmit="event.preventDefault(); sendWa();">
                <div class="form-row">
                  <label class="form-lbl" for="waNome">O seu Nome Completo</label>
                  <input type="text" id="waNome" class="form-ctrl" placeholder="Ex: Carlos Tembe" required>
                </div>

                <div class="form-row">
                  <label class="form-lbl" for="waServico">Serviço Pretendido</label>
                  <select id="waServico" class="form-ctrl">
                    ${services.map((s: any) => `<option value="${escapeHtml(s.title)}">${escapeHtml(s.title)}</option>`).join('')}
                    <option value="Informações Gerais">Outras Informações / Dúvida</option>
                  </select>
                </div>

                <div class="form-row">
                  <label class="form-lbl" for="waData">Dia ou Período Preferencial</label>
                  <input type="text" id="waData" class="form-ctrl" placeholder="Ex: Esta Quinta-feira às 14h / Sábado de manhã">
                </div>

                <div class="form-row">
                  <label class="form-lbl" for="waMsg">Mensagem Adicional (Opcional)</label>
                  <textarea id="waMsg" class="form-ctrl" rows="2" placeholder="Ex: Gostaria de saber valores e disponibilidade..."></textarea>
                </div>

                <button type="submit" class="btn-submit-wa">
                  ${OFFICIAL_WHATSAPP_SVG}
                  <span>${escapeHtml(content.global?.formWaText || 'Conversar com a Equipa no WhatsApp')}</span>
                </button>
              </form>
            </div>
          </div>
        </section>
        `;
      }

      // --- SECÇÃO: FAQ ---
      if (secId === 'faq') {
        const faqs = (sec?.content && Array.isArray(sec.content) && sec.content.length > 0) ? sec.content : faqList;
        return `
        <section class="section-wrap">
          <div class="container">
            <div class="section-head">
              <span class="section-tag">Esclarecimentos</span>
              <h2 class="section-title">Perguntas Frequentes</h2>
              <p class="section-desc">Tudo o que precisa de saber antes da sua visita.</p>
            </div>
            <div class="faq-grid">
              ${faqs.map((item: any) => `
                <div class="faq-item">
                  <div class="faq-q">${escapeHtml(item.question)}</div>
                  <div class="faq-a">${escapeHtml(item.answer)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
        `;
      }

      // --- SECÇÃO: LOCALIZAÇÃO & MAPA ---
      if (secId === 'location') {
        const showMap = content.global?.showMap !== false;
        return `
        <section class="section-wrap" style="background:var(--bg-warm-tint);">
          <div class="container">
            <div class="section-head">
              <span class="section-tag">Venha Visitar-nos</span>
              <h2 class="section-title">Onde Estamos Localizados</h2>
              <p class="section-desc">Acesso conveniente com estacionamento e segurança.</p>
            </div>
            <div class="contact-grid" style="${!showMap ? 'grid-template-columns: 1fr; max-width: 600px; margin: 0 auto;' : ''}">
              <div class="contact-card">
                <div class="c-item">
                  <div class="c-icon">${getSvgIcon('map-pin', 24)}</div>
                  <div>
                    <div class="c-label">Endereço Físico</div>
                    <div class="c-value">${address}</div>
                  </div>
                </div>

                <div class="c-item">
                  <div class="c-icon">${getSvgIcon('clock', 24)}</div>
                  <div>
                    <div class="c-label">Horários de Atendimento</div>
                    <div class="c-value">${openingHours}</div>
                  </div>
                </div>

                ${content.global?.showCallButton !== false ? `
                <div class="c-item">
                  <div class="c-icon">${getSvgIcon('phone', 24)}</div>
                  <div>
                    <div class="c-label">Contacto Telefónico</div>
                    <div class="c-value"><a href="${telLink}" style="color:var(--primary);">${phone}</a></div>
                  </div>
                </div>
                ` : ''}

                <div style="padding-top:12px; border-top:1px solid var(--border-fine);">
                  <a href="${waLink}" target="_blank" rel="noopener" class="btn-top-wa" style="width:100%; justify-content:center;">
                    ${OFFICIAL_WHATSAPP_SVG}
                    <span>Abrir Conversa WhatsApp</span>
                  </a>
                </div>
              </div>

              ${showMap ? `
              <div class="map-wrap">
                <iframe src="${embedMapUrl}" class="map-embed" allowfullscreen="" loading="lazy"></iframe>
              </div>
              ` : ''}
            </div>
          </div>
        </section>
        `;
      }

      return '';
    }).join('\n')}
  </main>

  <!-- RODAPÉ COMPLETO -->
  ${content.global?.showFooter !== false ? `
  <footer class="footer container">
    <div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:12px;">
      <span class="brand-symbol"></span>
      <strong style="color:var(--text-title); font-family:var(--font-editorial); font-size:1.1rem;">${businessName}</strong>
    </div>
    <p>&copy; ${new Date().getFullYear()} ${businessName}. Todos os direitos reservados. Website oficial mobile-first.</p>
  </footer>
  ` : ''}

  <!-- BARRA FIXA MOBILE FLUTUANTE (WhatsApp + Ligar) -->
  ${content.global?.showStickyBar !== false ? `
  <div class="sticky-bar">
    ${content.global?.showStickyWa !== false ? `
      <a href="#agendamento" class="sticky-btn-wa">
        ${OFFICIAL_WHATSAPP_SVG}
        <span>${escapeHtml(content.global?.stickyWaText || 'WhatsApp')}</span>
      </a>
    ` : ''}
    ${content.global?.showCallButton !== false ? `
      <a href="${telLink}" class="sticky-btn-call">
        ${getSvgIcon('phone', 18)}
        <span>${escapeHtml(content.global?.callButtonText || 'Ligar')}</span>
      </a>
    ` : ''}
  </div>
  ` : ''}

  <script>
    function sendWa() {
      var nome = (document.getElementById('waNome') || {}).value || '';
      var servico = (document.getElementById('waServico') || {}).value || '';
      var dataHora = (document.getElementById('waData') || {}).value || '';
      var msg = (document.getElementById('waMsg') || {}).value || '';
      
      var texto = 'Olá! O meu nome é ' + nome + '.';
      if (servico) texto += ' Gostaria de agendar / saber mais sobre ' + servico + '.';
      if (dataHora) texto += ' Horário pretendido: ' + dataHora + '.';
      if (msg) texto += ' ' + msg;
      
      var url = 'https://wa.me/${waPhone}?text=' + encodeURIComponent(texto);
      window.open(url, '_blank');
    }
  </script>

  ${isEditorMode ? `
  <script>
    // Suporte a Edição Direta sem Custo na Prévia (postMessage com o Editor da Prospecta)
    document.addEventListener('input', function(e) {
      var target = e.target;
      if (target && target.isContentEditable) {
        var key = target.classList.contains('hero-title') ? 'heroHeadline'
          : target.classList.contains('hero-subtitle') ? 'heroSubheadline'
          : target.classList.contains('diff-title') ? 'diffTitle'
          : target.classList.contains('diff-text') ? 'diffText'
          : 'customText';
        if (window.parent) {
          window.parent.postMessage({
            type: 'PROSPECTA_INLINE_EDIT',
            field: key,
            value: target.innerText.trim()
          }, '*');
        }
      }
    });
  </script>
  ` : ''}
</body>
</html>`;
}

