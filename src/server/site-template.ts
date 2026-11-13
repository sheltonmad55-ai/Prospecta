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

export function renderSiteTemplate(content: SiteContent, isDraft = false): string {
  const businessName = escapeHtml(content.businessName || 'Empresa Local');
  const tagline = escapeHtml(content.tagline || 'Excelência e Confiança');
  const heroHeadline = escapeHtml(content.heroHeadline || content.businessName || 'Bem-vindo ao nosso espaço');
  const heroSubheadline = escapeHtml(content.heroSubheadline || content.tagline || 'Serviços especializados com atendimento personalizado.');
  const aboutText = escapeHtml(content.aboutText || '');
  const address = escapeHtml(content.address || 'Moçambique');
  const openingHours = escapeHtml(content.openingHours || 'Segunda a Sábado');
  const phone = escapeHtml(content.phone || '+258 84 000 0000');
  const waPhone = cleanPhoneForWa(content.whatsappNumber || content.phone || '');
  const rawWaMsg = content.whatsappMessage || `Olá! Encontrei o vosso site da ${content.businessName} e gostaria de mais informações.`;
  const encodedWaMsg = encodeURIComponent(rawWaMsg);
  const waLink = `https://wa.me/${waPhone}?text=${encodedWaMsg}`;
  const telLink = `tel:${waPhone || phone.replace(/\s+/g, '')}`;

  const primaryColor = content.primaryColor && content.primaryColor.startsWith('#') ? content.primaryColor : '#0284C7';
  const style = content.style || 'moderno';
  const fontFamily = style === 'elegante' ? "'Playfair Display', Georgia, serif" : "system-ui, -apple-system, sans-serif";

  const embedAddress = encodeURIComponent(content.address || content.businessName || 'Moçambique');
  const embedMapUrl = content.mapsEmbedUrl || `https://www.google.com/maps?q=${embedAddress}&hl=pt&z=15&output=embed`;

  const images = Array.isArray(content.images) ? content.images.filter(Boolean) : [];
  const services = Array.isArray(content.services) ? content.services : [];
  const reviews = Array.isArray(content.reviews) ? content.reviews : [];

  const hasPlaceholders = (content.placeholdersPending && content.placeholdersPending > 0) || content.hasExampleData;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} | Website Oficial</title>
  ${isDraft ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="description" content="' + escapeHtml(content.tagline || businessName) + '">'}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${primaryColor};
      --primary-rgb: ${parseInt(primaryColor.slice(1, 3) || '02', 16)}, ${parseInt(primaryColor.slice(3, 5) || '84', 16)}, ${parseInt(primaryColor.slice(5, 7) || 'c7', 16)};
      --bg: #0B0F19;
      --surface: #131A2B;
      --surface-light: #1E293B;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --border: rgba(255, 255, 255, 0.08);
      --font-main: ${fontFamily};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-main);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 90px;
    }
    a { color: inherit; text-decoration: none; }
    .container { max-width: 1040px; margin: 0 auto; padding: 0 20px; }

    /* Faixa de Aviso de Dados de Exemplo na Prévia */
    .banner-placeholder {
      background: #D97706;
      color: #000;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: center;
      padding: 10px 16px;
      position: sticky;
      top: 0;
      z-index: 200;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
    
    /* Topbar */
    .topbar {
      border-bottom: 1px solid var(--border);
      background: rgba(11, 15, 25, 0.85);
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(12px);
    }
    .topbar-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
    }
    .brand { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; }
    .brand-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); display: inline-block; }
    .btn-top {
      background: #25D366;
      color: #0B0F19;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 8px 16px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    /* Hero */
    .hero {
      padding: 60px 0 40px;
      text-align: center;
    }
    .badge-tag {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(var(--primary-rgb), 0.12);
      border: 1px solid rgba(var(--primary-rgb), 0.3);
      color: #fff;
      font-size: 0.825rem;
      font-weight: 600;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .hero-title {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
      color: #fff;
    }
    .hero-subtitle {
      font-size: 1.05rem;
      color: var(--text-muted);
      max-width: 620px;
      margin: 0 auto 30px;
      line-height: 1.6;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-bottom: 40px;
    }
    .btn-cta-wa {
      background: #25D366;
      color: #0B0F19;
      font-weight: 700;
      font-size: 1rem;
      padding: 14px 28px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(37, 211, 102, 0.25);
    }
    .btn-cta-tel {
      background: var(--surface-light);
      color: #fff;
      font-weight: 600;
      font-size: 1rem;
      padding: 14px 24px;
      border-radius: 12px;
      border: 1px solid var(--border);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    /* Secções & Scroll Animation */
    .section { padding: 48px 0; border-top: 1px solid var(--border); }
    .fade-in-section {
      opacity: 0;
      transform: translateY(22px);
      transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .fade-in-section.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    @media (prefers-reduced-motion: reduce) {
      .fade-in-section {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }
    }

    .section-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.02em; }
    .section-desc { color: var(--text-muted); margin-bottom: 28px; font-size: 0.95rem; }
    
    /* Serviços Grid */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .service-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      position: relative;
    }
    .service-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(var(--primary-rgb), 0.15);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .service-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; }
    .service-text { font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; }

    /* Galeria de Fotos */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }
    .gallery-img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface);
    }

    /* Formulário "Falar no WhatsApp" Interativo */
    .wa-form-card {
      background: var(--surface);
      border: 1px solid rgba(37, 211, 102, 0.3);
      border-radius: 16px;
      padding: 28px;
      max-width: 640px;
      margin: 0 auto;
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    }
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: var(--text); }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      background: var(--surface-light);
      border: 1px solid var(--border);
      color: #fff;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: #25D366;
    }
    .btn-submit-wa {
      width: 100%;
      background: #25D366;
      color: #0B0F19;
      font-weight: 700;
      font-size: 1rem;
      padding: 14px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 12px;
    }

    /* Localização e Mapa */
    .contact-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
    @media (min-width: 768px) {
      .contact-layout { grid-template-columns: 1fr 1fr; }
    }
    .info-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
    }
    .info-item { display: flex; gap: 14px; margin-bottom: 20px; }
    .info-item:last-child { margin-bottom: 0; }
    .info-icon { color: var(--primary); flex-shrink: 0; margin-top: 2px; }
    .info-label { font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .info-val { font-size: 1rem; color: #fff; font-weight: 500; margin-top: 2px; }
    .map-frame { width: 100%; height: 260px; border: 0; border-radius: 14px; background: var(--surface); }

    /* Barra Fixa Mobile */
    .sticky-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(11, 15, 25, 0.95);
      border-top: 1px solid var(--border);
      padding: 12px 16px;
      display: flex;
      gap: 10px;
      z-index: 999;
      backdrop-filter: blur(12px);
    }
    .sticky-btn-wa {
      flex: 2;
      background: #25D366;
      color: #0B0F19;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 12px 16px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .sticky-btn-tel {
      flex: 1;
      background: var(--surface-light);
      color: #fff;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .badge-previa {
      position: fixed;
      top: 16px;
      right: 16px;
      background: rgba(245, 158, 11, 0.9);
      color: #000;
      font-weight: 800;
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 9999px;
      z-index: 1000;
    }

    .footer { padding: 40px 0 20px; text-align: center; color: var(--text-muted); font-size: 0.825rem; border-top: 1px solid var(--border); }
  </style>
</head>
<body>
  ${hasPlaceholders && isDraft ? `
    <div class="banner-placeholder">
      ⚠️ Este site contém dados de exemplo marcados. Confirme ou edite os dados para poder aprovar o site.
    </div>
  ` : ''}

  ${isDraft ? '<div class="badge-previa">PRÉVIA</div>' : ''}

  <header class="topbar">
    <div class="container topbar-content">
      <div class="brand">
        <span class="brand-dot"></span>
        <span>${businessName}</span>
      </div>
      <a href="#agendamento" class="btn-top">
        ${OFFICIAL_WHATSAPP_SVG}
        <span>Falar no WhatsApp</span>
      </a>
    </div>
  </header>

  <main>
    <!-- HERO -->
    <section class="hero container fade-in-section">
      <div class="badge-tag">${tagline}</div>
      <h1 class="hero-title">${heroHeadline}</h1>
      <p class="hero-subtitle">${heroSubheadline}</p>
      <div class="hero-actions">
        <a href="#agendamento" class="btn-cta-wa">
          ${OFFICIAL_WHATSAPP_SVG}
          <span>Conversar no WhatsApp</span>
        </a>
        <a href="${telLink}" class="btn-cta-tel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>${phone}</span>
        </a>
      </div>
    </section>

    <!-- SOBRE -->
    ${aboutText ? `
    <section class="section fade-in-section">
      <div class="container">
        <h2 class="section-title">Sobre Nós</h2>
        <p class="section-desc">${aboutText}</p>
      </div>
    </section>` : ''}

    <!-- SERVIÇOS -->
    <section class="section fade-in-section">
      <div class="container">
        <h2 class="section-title">Nossos Serviços & Especialidades</h2>
        <p class="section-desc">Atendimento profissional adaptado às suas necessidades.</p>
        <div class="services-grid">
          ${services.map((s, idx) => `
            <div class="service-card">
              <div class="service-icon">
                ${getServiceIconSvg(s.icon || (idx === 0 ? 'heart' : idx === 1 ? 'sparkles' : 'shield'))}
              </div>
              <h3 class="service-title">${escapeHtml(s.title)} ${s.exemplo ? '<span style="font-size:0.7rem; background:#D97706; color:#000; padding:2px 6px; border-radius:4px; margin-left:6px;">Exemplo</span>' : ''}</h3>
              <p class="service-text">${escapeHtml(s.description)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- FOTOS -->
    ${images.length > 0 ? `
    <section class="section fade-in-section">
      <div class="container">
        <h2 class="section-title">Galeria & Instalações</h2>
        <div class="gallery-grid">
          ${images.map(img => `
            <img src="${escapeHtml(img)}" alt="${businessName}" class="gallery-img" loading="lazy">
          `).join('')}
        </div>
      </div>
    </section>` : ''}

    <!-- FORMULÁRIO "FALAR NO WHATSAPP" COM TEXTO PRONTO -->
    <section id="agendamento" class="section fade-in-section">
      <div class="container">
        <div class="wa-form-card">
          <h2 class="section-title" style="text-align:center;">Falar no WhatsApp</h2>
          <p class="section-desc" style="text-align:center; margin-bottom:20px;">Preencha abaixo para iniciar uma conversa com a mensagem já pronta.</p>
          
          <form id="waForm" onsubmit="event.preventDefault(); sendWa();">
            <div class="form-group">
              <label class="form-label" for="waNome">O seu Nome</label>
              <input type="text" id="waNome" class="form-input" placeholder="Ex: Carlos Tembe" required>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="waServico">Serviço Pretendido</label>
              <select id="waServico" class="form-select">
                ${services.map(s => `<option value="${escapeHtml(s.title)}">${escapeHtml(s.title)}</option>`).join('')}
                <option value="Informações Gerais">Outras Informações</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="waData">Dia ou Horário Preferencial</label>
              <input type="text" id="waData" class="form-input" placeholder="Ex: Amanhã às 14h / Próxima Terça">
            </div>

            <div class="form-group">
              <label class="form-label" for="waMsg">Mensagem ou Dúvida (Opcional)</label>
              <textarea id="waMsg" class="form-textarea" rows="2" placeholder="Gostaria de saber preços e disponibilidade..."></textarea>
            </div>

            <button type="submit" class="btn-submit-wa">
              ${OFFICIAL_WHATSAPP_SVG}
              <span>Abrir WhatsApp com Mensagem Pronta</span>
            </button>
          </form>
        </div>
      </div>
    </section>

    <!-- LOCALIZAÇÃO & HORÁRIO -->
    <section class="section fade-in-section">
      <div class="container">
        <h2 class="section-title">Localização & Horário</h2>
        <div class="contact-layout">
          <div class="info-box">
            <div class="info-item">
              <div class="info-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div>
                <div class="info-label">Endereço</div>
                <div class="info-val">${address}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <div class="info-label">Horário de Atendimento</div>
                <div class="info-val">${openingHours}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div>
                <div class="info-label">Telefone Direto</div>
                <div class="info-val"><a href="${telLink}">${phone}</a></div>
              </div>
            </div>
          </div>

          <div class="map-box">
            <iframe src="${embedMapUrl}" class="map-frame" allowfullscreen="" loading="lazy"></iframe>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer container">
    <p>&copy; ${new Date().getFullYear()} ${businessName}. Todos os direitos reservados.</p>
  </footer>

  <!-- BARRA FIXA MOBILE (WHATSAPP + LIGAR) -->
  <div class="sticky-bar">
    <a href="#agendamento" class="sticky-btn-wa">
      ${OFFICIAL_WHATSAPP_SVG}
      <span>WhatsApp</span>
    </a>
    <a href="${telLink}" class="sticky-btn-tel">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      <span>Ligar</span>
    </a>
  </div>

  <script>
    // Envio do formulário do WhatsApp
    function sendWa() {
      var nome = (document.getElementById('waNome') || {}).value || '';
      var servico = (document.getElementById('waServico') || {}).value || '';
      var dataHora = (document.getElementById('waData') || {}).value || '';
      var msg = (document.getElementById('waMsg') || {}).value || '';
      
      var texto = 'Olá! O meu nome é ' + nome + '.';
      if (servico) texto += ' Gostaria de agendar / saber mais sobre ' + servico + '.';
      if (dataHora) texto += ' Dia/Horário preferencial: ' + dataHora + '.';
      if (msg) texto += ' ' + msg;
      
      var url = 'https://wa.me/${waPhone}?text=' + encodeURIComponent(texto);
      window.open(url, '_blank');
    }

    // Scroll Fade-in Animation com IntersectionObserver
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.fade-in-section').forEach(function(el) {
        observer.observe(el);
      });
    } else {
      document.querySelectorAll('.fade-in-section').forEach(function(el) {
        el.classList.add('is-visible');
      });
    }
  </script>
</body>
</html>`;
}
