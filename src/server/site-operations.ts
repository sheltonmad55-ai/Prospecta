/**
 * Motor de Operações e Modelo Unificado do Criador de Sites da Prospecta (Lovable-Style).
 * Motor de Operações e Modelo Unificado do Criador de Sites da Prospecta.
 * Permite edição granular por conversa: set, toggle, add_section, remove_section,
 * move_section, duplicate_section, rename, set_style, ask_clarification.
 */

import type { SiteThemeId } from './site-themes';
import { parseInternationalPhone } from './site-components';

export interface SiteGlobalElements {
  showHeaderWa: boolean;
  showHeroWa: boolean;
  showStickyWa: boolean;
  showCallButton: boolean;
  showStickyBar: boolean;
  showWaForm: boolean;
  showDraftBadge: boolean;
  showMap: boolean;
  showFooter: boolean;
  showHeroVisualCard: boolean;
  headerWaText: string;
  heroWaText: string;
  stickyWaText: string;
  callButtonText: string;
  callButtonPhone?: string;
  formWaText: string;
}

export interface SiteSectionStyleOverrides {
  bg?: string;
  textColor?: string;
  padding?: string;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: string;
  borderRadius?: string;
  cardSize?: 'normal' | 'large';
}

export interface SiteSectionConfig {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  visible: boolean;
  variant?: string;
  styleOverrides?: SiteSectionStyleOverrides;
  content?: any;
}

export type SiteOperation =
  | { op: 'set'; path: string; value: any }
  | { op: 'toggle'; target: string }
  | { op: 'set_typography'; typographyId: 'classica' | 'moderna' | 'elegante' | 'tecnica' | 'redonda' }
  | { op: 'add_section'; section: SiteSectionConfig; index?: number }
  | { op: 'remove_section'; id: string }
  | { op: 'move_section'; id?: string; fromIndex?: number; toIndex: number }
  | { op: 'duplicate_section'; id: string; newId?: string; newTitle?: string }
  | { op: 'rename'; target: string; newName: string }
  | { op: 'set_style'; target: string; styles: SiteSectionStyleOverrides }
  | { op: 'ask_clarification'; question: string; options?: string[] }
  | { op: 'need_custom_block'; reason: string; proposal: string };

export interface SiteOperationResult {
  updatedContent: any;
  appliedCount: number;
  errors: string[];
  explanation?: string;
  clarification?: {
    question: string;
    options?: string[];
  };
}

export type TypographyPresetId = 'classica' | 'moderna' | 'elegante' | 'tecnica' | 'redonda';

export interface TypographyPreset {
  id: TypographyPresetId;
  name: string;
  editorialFont: string;
  cleanFont: string;
  googleFontsUrl: string;
}

export const TYPOGRAPHY_PRESETS: Record<TypographyPresetId, TypographyPreset> = {
  moderna: {
    id: 'moderna',
    name: 'Moderna (Inter)',
    editorialFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cleanFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
  },
  classica: {
    id: 'classica',
    name: 'Clássica com Serifa (Playfair Display)',
    editorialFont: "'Playfair Display', Georgia, serif",
    cleanFont: "'Source Serif 4', Georgia, serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Source+Serif+4:wght@400;600&display=swap'
  },
  elegante: {
    id: 'elegante',
    name: 'Elegante (Cormorant Garamond)',
    editorialFont: "'Cormorant Garamond', Georgia, serif",
    cleanFont: "'Montserrat', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600&display=swap'
  },
  tecnica: {
    id: 'tecnica',
    name: 'Técnica & Estruturada (Outfit)',
    editorialFont: "'Outfit', sans-serif",
    cleanFont: "'Plus Jakarta Sans', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap'
  },
  redonda: {
    id: 'redonda',
    name: 'Amigável & Redonda (Poppins)',
    editorialFont: "'Poppins', sans-serif",
    cleanFont: "'Nunito', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap'
  }
};

export function getDefaultGlobalElements(phone = '+258 84 000 0000'): SiteGlobalElements {
  return {
    showHeaderWa: true,
    showHeroWa: true,
    showStickyWa: true,
    showCallButton: true,
    showStickyBar: true,
    showWaForm: true,
    showDraftBadge: true,
    showMap: true,
    showFooter: true,
    showHeroVisualCard: true,
    headerWaText: 'Falar no WhatsApp',
    heroWaText: 'Agendar no WhatsApp',
    stickyWaText: 'WhatsApp',
    callButtonText: phone,
    callButtonPhone: phone,
    formWaText: 'Conversar com a Equipa no WhatsApp'
  };
}

export function getDefaultSectionsOrder(): string[] {
  return [
    'hero',
    'differentials',
    'about',
    'services',
    'steps',
    'gallery',
    'reviews',
    'wa_form',
    'faq',
    'location'
  ];
}

/**
 * Garante que o modelo JSON possui as estruturas 'global', 'sectionsOrder' e 'sections'
 */
export function normalizeSiteModel(raw: any): any {
  if (!raw) return {};
  const content = { ...raw };

  if (!content.global) {
    content.global = getDefaultGlobalElements(content.phone);
  } else {
    content.global = { ...getDefaultGlobalElements(content.phone), ...content.global };
  }

  if (!Array.isArray(content.sectionsOrder) || content.sectionsOrder.length === 0) {
    content.sectionsOrder = getDefaultSectionsOrder();
  }

  if (!content.sections || typeof content.sections !== 'object') {
    content.sections = {};
  }

  // Mapeia secções existentes para o dicionário de secções se ainda não existirem
  const defaultMap: Record<string, Partial<SiteSectionConfig>> = {
    hero: {
      id: 'hero',
      type: 'hero',
      title: content.heroHeadline || content.businessName || 'Hero',
      subtitle: content.heroSubheadline,
      visible: true,
      variant: content.heroVariant || 'split'
    },
    differentials: {
      id: 'differentials',
      type: 'differentials',
      title: content.differentialsTitle || 'Diferenciais',
      visible: true,
      content: content.differentials || []
    },
    about: {
      id: 'about',
      type: 'about',
      title: content.aboutTitle || 'Sobre Nós',
      visible: Boolean(content.aboutText),
      content: content.aboutText || ''
    },
    services: {
      id: 'services',
      type: 'services',
      title: content.servicesTitle || 'Serviços & Especialidades',
      subtitle: content.servicesSubtitle,
      visible: true,
      variant: content.servicesVariant || 'cards-icon',
      content: content.services || []
    },
    steps: {
      id: 'steps',
      type: 'steps',
      title: content.stepsTitle || 'Como Funciona',
      visible: true,
      content: content.steps || []
    },
    gallery: {
      id: 'gallery',
      type: 'gallery',
      title: content.galleryTitle || 'O Nosso Espaço',
      visible: true,
      content: content.images || []
    },
    reviews: {
      id: 'reviews',
      type: 'reviews',
      title: content.reviewsTitle || 'Avaliações',
      visible: Array.isArray(content.reviews) && content.reviews.length > 0,
      content: content.reviews || []
    },
    wa_form: {
      id: 'wa_form',
      type: 'wa_form',
      title: 'Falar com a Nossa Equipa',
      visible: content.global.showWaForm !== false
    },
    faq: {
      id: 'faq',
      type: 'faq',
      title: content.faqTitle || 'Perguntas Frequentes',
      visible: true,
      content: content.faq || []
    },
    location: {
      id: 'location',
      type: 'location',
      title: 'Onde Estamos Localizados',
      visible: content.global.showMap !== false,
      content: {
        address: content.address,
        phone: content.phone,
        openingHours: content.openingHours,
        mapsEmbedUrl: content.mapsEmbedUrl
      }
    }
  };

  for (const key of Object.keys(defaultMap)) {
    if (!content.sections[key]) {
      content.sections[key] = {
        ...defaultMap[key],
        styleOverrides: {}
      };
    }
  }

  return content;
}

const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

const PROTECTED_FIELDS = [
  'status',
  'placeholders_pending',
  'id',
  'user_id',
  'userId',
  'credits',
  'created_at',
  'updated_at',
  'current_version',
  'is_legacy',
  'hasExampleData',
  'source_data'
];

export function isUnsafePath(path: string): boolean {
  const lower = path.toLowerCase();
  return FORBIDDEN_KEYS.some(k => lower.includes(k));
}

export function isProtectedField(path: string): boolean {
  const parts = path.split('.');
  return parts.some(p => PROTECTED_FIELDS.includes(p));
}

export function isExampleField(path: string): boolean {
  const parts = path.split('.');
  return parts.includes('exemplo') || parts.includes('isExample') || parts.includes('hasExampleData');
}

export function isValidSafeHref(href: string): boolean {
  if (typeof href !== 'string') return false;
  const trimmed = href.trim().toLowerCase();
  if (trimmed === '' || trimmed === '#' || trimmed.startsWith('#')) return true;
  if (trimmed.startsWith('https://') || trimmed.startsWith('tel:') || trimmed.startsWith('https://wa.me/')) {
    return true;
  }
  return false;
}

export function syncPhoneNumber(content: any, rawPhone: string, userCountryHint?: string) {
  const parsed = parseInternationalPhone(rawPhone, userCountryHint);
  content.phone = parsed.formattedDisplay || rawPhone;
  content.whatsappNumber = parsed.digitsWithCountry || rawPhone.replace(/\D/g, '');
  if (!content.global) content.global = {};
  content.global.callButtonPhone = parsed.formattedDisplay || rawPhone;
  content.global.callButtonText = parsed.formattedDisplay || rawPhone;

  if (content.sections?.location?.content) {
    content.sections.location.content.phone = parsed.formattedDisplay || rawPhone;
  }
}

/**
 * Valida se um caminho pertence à allowlist de propriedades modificáveis via operação 'set'
 */
export function isAllowedSetPath(path: string): boolean {
  if (isUnsafePath(path) || isProtectedField(path) || isExampleField(path)) {
    return false;
  }

  // Raízes diretas permitidas
  const allowedRoots = new Set([
    'businessName',
    'phone',
    'whatsappNumber',
    'address',
    'openingHours',
    'primaryColor',
    'themeId',
    'customTypography',
    'heroHeadline',
    'heroSubheadline',
    'aboutTitle',
    'aboutText',
    'servicesTitle',
    'servicesSubtitle',
    'differentialsTitle',
    'stepsTitle',
    'galleryTitle',
    'reviewsTitle',
    'faqTitle'
  ]);

  if (allowedRoots.has(path)) return true;

  // Propriedades de global.*
  if (path.startsWith('global.')) {
    const key = path.replace('global.', '');
    const allowedGlobals = new Set([
      'showHeaderWa',
      'showHeroWa',
      'showStickyWa',
      'showCallButton',
      'showStickyBar',
      'showWaForm',
      'showDraftBadge',
      'showMap',
      'showFooter',
      'showHeroVisualCard',
      'headerWaText',
      'heroWaText',
      'stickyWaText',
      'callButtonText',
      'callButtonPhone',
      'formWaText'
    ]);
    return allowedGlobals.has(key);
  }

  // Propriedades de sections.*
  if (path.startsWith('sections.')) {
    const parts = path.split('.');
    if (parts.length === 3) {
      const prop = parts[2];
      return ['visible', 'title', 'subtitle', 'variant'].includes(prop);
    }
    if (parts.length === 4 && parts[2] === 'styleOverrides') {
      const sKey = parts[3];
      return ['bg', 'textColor', 'padding', 'alignment', 'fontSize', 'borderRadius', 'cardSize'].includes(sKey);
    }
    return false;
  }

  return false;
}

/**
 * Aplica uma lista de operações ao modelo do site de forma pura e segura.
 */
export function applyOperations(rawContent: any, operations: SiteOperation[]): SiteOperationResult {
  const content = normalizeSiteModel(rawContent);
  let appliedCount = 0;
  const errors: string[] = [];
  let clarification: { question: string; options?: string[] } | undefined;

  for (const op of operations) {
    if (!op || typeof op !== 'object') continue;

    try {
      switch (op.op) {
        case 'set': {
          const { path, value } = op;
          if (!path || typeof path !== 'string') {
            errors.push('Operação set com path inválido.');
            break;
          }

          // 1. Bloqueio rigoroso de prototype pollution
          if (isUnsafePath(path)) {
            errors.push(`Bloqueio de segurança: caminho inseguro "${path}" rejeitado.`);
            break;
          }

          // 2. Bloqueio de campos protegidos (status, ids, créditos, etc.)
          if (isProtectedField(path)) {
            errors.push(`Bloqueio de integridade: o campo "${path}" é estritamente protegido e não pode ser alterado por IA.`);
            break;
          }

          // 3. Bloqueio de alteração de marcas "exemplo" via chat
          if (isExampleField(path)) {
            errors.push('A remoção de marcas de exemplo requer confirmação explícita no painel via botão "Confirmar que é verdade".');
            break;
          }

          // Bloqueio de desligar showDraftBadge se houver dados de exemplo pendentes
          if (path === 'global.showDraftBadge' && (value === false || value === 'false')) {
            const hasPendingData = Boolean(
              (content.placeholders_pending || 0) > 0 ||
              (content.placeholdersPending || 0) > 0 ||
              content.hasExampleData ||
              (Array.isArray(content.differentials) && content.differentials.some((d: any) => d.exemplo)) ||
              (Array.isArray(content.services) && content.services.some((s: any) => s.exemplo))
            );
            if (hasPendingData) {
              errors.push('Não é permitido ocultar o aviso de rascunho/exemplo enquanto existirem dados pendentes de confirmação.');
              break;
            }
          }

          // 4. Verificação de allowlist
          if (!isAllowedSetPath(path)) {
            errors.push(`Caminho não autorizado na allowlist: "${path}".`);
            break;
          }

          // 5. Validação de ligações (href / links)
          if (typeof value === 'string' && (path.includes('link') || path.includes('url') || path.includes('href'))) {
            if (!isValidSafeHref(value)) {
              errors.push(`Ligação recusada: apenas URLs https://, tel: ou https://wa.me/ são permitidas.`);
              break;
            }
          }

          // 6. Sincronização inteligente de telefone
          if (path === 'phone' || path === 'whatsappNumber' || path === 'global.callButtonPhone') {
            const phoneStr = String(value || '').trim();
            if (phoneStr.length > 35) {
              errors.push('Número de telefone demasiado longo (máximo 35 caracteres).');
              break;
            }
            syncPhoneNumber(content, phoneStr);
            appliedCount++;
            break;
          }

          // 7. Aplicação de propriedades autorizadas
          if (path.startsWith('global.')) {
            const key = path.replace('global.', '');
            if (typeof value === 'string' && value.length > 100) {
              errors.push(`Valor excessivo para "${path}".`);
              break;
            }
            content.global[key] = value;
            if (key === 'showCallButton' && value === false) {
              content.global.showCallButton = false;
            }
            appliedCount++;
          } else if (path === 'businessName') {
            const nameStr = String(value || '').trim();
            if (nameStr.length > 100) {
              errors.push('Nome da empresa excede o limite de 100 caracteres.');
              break;
            }
            content.businessName = nameStr;
            appliedCount++;
          } else if (path === 'themeId') {
            content.themeId = value as SiteThemeId;
            appliedCount++;
          } else if (path === 'primaryColor') {
            const colorStr = String(value || '').trim();
            if (!/^#[0-9a-fA-F]{3,8}$/.test(colorStr)) {
              errors.push(`Cor hexadecimal inválida: "${colorStr}". Formato esperado: #RRGGBB`);
              break;
            }
            content.primaryColor = colorStr;
            appliedCount++;
          } else if (path === 'customTypography') {
            if (!TYPOGRAPHY_PRESETS[value as TypographyPresetId]) {
              errors.push(`Tipografia inválida: ${value}.`);
              break;
            }
            content.customTypography = value;
            appliedCount++;
          } else if (path.startsWith('sections.')) {
            const parts = path.split('.');
            const secId = parts[1];
            const prop = parts.slice(2).join('.');
            if (content.sections[secId]) {
              if (prop === 'visible') content.sections[secId].visible = Boolean(value);
              else if (prop === 'title') {
                const titleStr = String(value || '').trim();
                if (titleStr.length > 120) {
                  errors.push('Título da secção demasiado longo (máximo 120 caracteres).');
                  break;
                }
                content.sections[secId].title = titleStr;
              } else if (prop === 'subtitle') {
                content.sections[secId].subtitle = String(value || '').slice(0, 250);
              } else if (prop === 'variant') {
                content.sections[secId].variant = String(value || '').slice(0, 50);
              } else if (prop.startsWith('styleOverrides.')) {
                const sKey = prop.replace('styleOverrides.', '');
                content.sections[secId].styleOverrides = content.sections[secId].styleOverrides || {};
                content.sections[secId].styleOverrides[sKey] = String(value || '').slice(0, 50);
              } else {
                content.sections[secId][prop] = value;
              }
              appliedCount++;
            } else {
              errors.push(`Secção não encontrada: ${secId}`);
            }
          } else {
            // Atribuição de raízes textuais permitidas
            content[path] = typeof value === 'string' ? value.slice(0, 300) : value;
            appliedCount++;
          }
          break;
        }

        case 'set_typography': {
          const { typographyId } = op;
          if (!typographyId || !TYPOGRAPHY_PRESETS[typographyId as TypographyPresetId]) {
            errors.push(`Tipografia inválida: "${typographyId}". Opções permitidas: classica, moderna, elegante, tecnica, redonda.`);
            break;
          }
          content.customTypography = typographyId;
          appliedCount++;
          break;
        }

        case 'toggle': {
          const target = op.target;
          if (!target || typeof target !== 'string') {
            errors.push('Operação toggle com target inválido.');
            break;
          }

          if (target === 'global.showDraftBadge') {
            const hasPendingData = Boolean(
              (content.placeholders_pending || 0) > 0 ||
              (content.placeholdersPending || 0) > 0 ||
              content.hasExampleData ||
              (Array.isArray(content.differentials) && content.differentials.some((d: any) => d.exemplo)) ||
              (Array.isArray(content.services) && content.services.some((s: any) => s.exemplo))
            );
            if (hasPendingData && content.global.showDraftBadge !== false) {
              errors.push('Não é permitido ocultar o aviso de rascunho/exemplo enquanto existirem dados pendentes de confirmação.');
              break;
            }
          }

          if (target.startsWith('global.')) {
            const key = target.replace('global.', '');
            content.global[key] = !content.global[key];
            appliedCount++;
          } else if (target.startsWith('sections.')) {
            const parts = target.split('.');
            const secId = parts[1];
            if (content.sections[secId]) {
              content.sections[secId].visible = !content.sections[secId].visible;
              appliedCount++;
            }
          } else if (content.sections[target]) {
            content.sections[target].visible = !content.sections[target].visible;
            appliedCount++;
          } else {
            errors.push(`Alvo de toggle não reconhecido: ${target}`);
          }
          break;
        }

        case 'rename': {
          const { target, newName } = op;
          if (!target || !newName) {
            errors.push('Operação rename com parâmetros em falta.');
            break;
          }
          if (target === 'businessName') {
            content.businessName = newName;
            appliedCount++;
          } else if (target.startsWith('sections.') || content.sections[target]) {
            const secId = target.replace('sections.', '');
            if (content.sections[secId]) {
              content.sections[secId].title = newName;
              if (secId === 'services') content.servicesTitle = newName;
              if (secId === 'about') content.aboutTitle = newName;
              appliedCount++;
            }
          } else if (target === 'button' || target === 'cta' || target === 'heroButton') {
            content.global.heroWaText = newName;
            appliedCount++;
          }
          break;
        }

        case 'set_style': {
          const { target, styles } = op;
          if (!target || !styles) {
            errors.push('Operação set_style inválida.');
            break;
          }
          const secId = target.replace('sections.', '');
          if (content.sections[secId]) {
            content.sections[secId].styleOverrides = {
              ...(content.sections[secId].styleOverrides || {}),
              ...styles
            };
            appliedCount++;
          } else if (target === 'hero') {
            content.sections.hero = content.sections.hero || { id: 'hero', type: 'hero', visible: true, styleOverrides: {} };
            content.sections.hero.styleOverrides = {
              ...(content.sections.hero.styleOverrides || {}),
              ...styles
            };
            appliedCount++;
          } else if (target === 'services_cards' || target === 'services') {
            content.sections.services = content.sections.services || { id: 'services', type: 'services', visible: true, styleOverrides: {} };
            content.sections.services.styleOverrides = {
              ...(content.sections.services.styleOverrides || {}),
              ...styles
            };
            appliedCount++;
          } else {
            errors.push(`Secção para set_style não encontrada: ${target}`);
          }
          break;
        }

        case 'move_section': {
          let fromIdx = op.fromIndex;
          const toIdx = op.toIndex;

          if (op.id && fromIdx === undefined) {
            fromIdx = content.sectionsOrder.indexOf(op.id);
          }

          if (fromIdx !== undefined && fromIdx >= 0 && toIdx >= 0 && toIdx < content.sectionsOrder.length) {
            const [moved] = content.sectionsOrder.splice(fromIdx, 1);
            content.sectionsOrder.splice(toIdx, 0, moved);
            appliedCount++;
          } else {
            errors.push('Índices de move_section fora dos limites.');
          }
          break;
        }

        case 'duplicate_section': {
          const { id, newId, newTitle } = op;
          if (!content.sections[id]) {
            errors.push(`Não é possível duplicar secção inexistente: ${id}`);
            break;
          }
          const generatedId = newId || `${id}_copy_${Date.now().toString(36).slice(-4)}`;
          const source = content.sections[id];
          const duplicated: SiteSectionConfig = {
            ...JSON.parse(JSON.stringify(source)),
            id: generatedId,
            title: newTitle || `${source.title} (Cópia)`
          };

          content.sections[generatedId] = duplicated;
          // Insere logo a seguir à secção original na ordem
          const origIdx = content.sectionsOrder.indexOf(id);
          if (origIdx >= 0) {
            content.sectionsOrder.splice(origIdx + 1, 0, generatedId);
          } else {
            content.sectionsOrder.push(generatedId);
          }
          appliedCount++;
          break;
        }

        case 'remove_section': {
          const id = op.id.replace('sections.', '');
          if (content.sections[id]) {
            content.sections[id].visible = false;
            // Se for mapa ou sticky bar, sincroniza flag global correspondente
            if (id === 'location' || id === 'map') content.global.showMap = false;
            appliedCount++;
          } else if (id === 'call_button' || id === 'call') {
            content.global.showCallButton = false;
            appliedCount++;
          } else if (id === 'sticky_bar') {
            content.global.showStickyBar = false;
            appliedCount++;
          } else {
            errors.push(`Secção não encontrada para remover: ${id}`);
          }
          break;
        }

        case 'add_section': {
          const { section, index } = op;
          if (!section || !section.id || !section.type) {
            errors.push('add_section requer secção com id e type.');
            break;
          }
          content.sections[section.id] = {
            ...section,
            visible: section.visible !== false,
            styleOverrides: section.styleOverrides || {}
          };
          if (typeof index === 'number' && index >= 0 && index <= content.sectionsOrder.length) {
            content.sectionsOrder.splice(index, 0, section.id);
          } else {
            content.sectionsOrder.push(section.id);
          }
          appliedCount++;
          break;
        }

        case 'ask_clarification': {
          clarification = {
            question: op.question,
            options: op.options
          };
          break;
        }

        case 'need_custom_block': {
          clarification = {
            question: `${op.reason} Gostaria que eu criasse um bloco personalizado para isto? (${op.proposal})`,
            options: ['Sim, criar bloco personalizado', 'Não, manter como está']
          };
          break;
        }

        default:
          errors.push(`Operação desconhecida: ${(op as any).op}`);
      }
    } catch (opErr: any) {
      errors.push(`Falha ao executar operação ${(op as any).op}: ${opErr.message}`);
    }
  }

  // Sincroniza campos de compatibilidade de volta ao topo do objeto
  if (content.sections.services) {
    content.servicesTitle = content.sections.services.title;
    content.services = content.sections.services.content || content.services;
  }
  if (content.sections.about) {
    content.aboutTitle = content.sections.about.title;
    content.aboutText = content.sections.about.content || content.aboutText;
  }

  return {
    updatedContent: content,
    appliedCount,
    errors,
    clarification
  };
}

