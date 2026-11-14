import dns from 'node:dns/promises';
import { AppError } from './auth';

export interface ReferenceSiteData {
  url: string;
  title?: string;
  description?: string;
  colorHint?: string;
  styleHint?: string;
  dominantColors: string[];
  sections: string[];
  toneKeywords: string[];
  competitorPhrases: string[];
  hasGallery: boolean;
  hasTestimonials: boolean;
  hasMap: boolean;
  hasFaq: boolean;
}

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;

  // IPv4 checks
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Cloud Metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 0) return true; // 0.0.0.0/8
  }

  // IPv6 check
  if (ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true;

  return false;
}

/**
 * Resolve e extrai pistas de estilo e estrutura de um website de referência com proteção estrita contra SSRF.
 */
export async function resolveReferenceSite(rawUrl: string): Promise<ReferenceSiteData | null> {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new AppError('O link do site de referência é inválido.', 400);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('Apenas links HTTP ou HTTPS são permitidos para referência.', 400);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Bloqueio de hosts especiais e metadata
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.includes('metadata.google.internal') ||
    hostname.includes('169.254.169.254')
  ) {
    throw new AppError('Endereço de referência não permitido por motivos de segurança.', 403);
  }

  // Resolução DNS para validação de IP
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        throw new AppError('Endereço IP interno ou privado não permitido.', 403);
      }
    }
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError('Não foi possível resolver o domínio do site de referência.', 400);
  }

  // Fetch seguro com timeout de 4s e limite de tamanho
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const defaultEmpty: ReferenceSiteData = {
    url: parsed.toString(),
    dominantColors: [],
    sections: ['hero'],
    toneKeywords: [],
    competitorPhrases: [],
    hasGallery: false,
    hasTestimonials: false,
    hasMap: false,
    hasFaq: false
  };

  try {
    const res = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Prospecta-Bot/1.0 (+https://prospecta-mz.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return defaultEmpty;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return defaultEmpty;
    }

    // Lê no máximo os primeiros 80KB
    const reader = res.body?.getReader();
    if (!reader) return defaultEmpty;

    let html = '';
    const decoder = new TextDecoder('utf-8');
    while (html.length < 80000) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});

    // Extrai título e meta description
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : undefined;

    // Detecta cor primária (theme-color)
    const colorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    const colorHint = colorMatch ? colorMatch[1].trim() : undefined;

    // Cores dominantes extraídas
    const colorRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    const rawColors = [...html.matchAll(colorRegex)].map(m => `#${m[1].toUpperCase()}`);
    // Filtrar cores comuns sem graça (preto puro #000, branco puro #FFF) se houver outras cores
    const filteredColors = rawColors.filter(c => !['#000', '#000000', '#FFF', '#FFFFFF'].includes(c));
    const dominantColors = [...new Set(filteredColors.length > 0 ? filteredColors : rawColors)].slice(0, 5);

    // Detectar secções presentes
    const hasGallery = /gallery|galeria|photos|fotos|images|imagens/i.test(html);
    const hasTestimonials = /testimonial|depoimento|avaliacao|avaliações|review|cliente/i.test(html);
    const hasMap = /maps\.google|google\.com\/maps|iframe.*map|mapa|localização/i.test(html);
    const hasFaq = /faq|perguntas|frequentes|duvidas/i.test(html);

    const sections: string[] = ['hero'];
    if (/servicos|serviços|services|cardapio|menu|especialidades/i.test(html)) sections.push('services');
    if (hasGallery) sections.push('gallery');
    if (hasTestimonials) sections.push('testimonials');
    if (hasFaq) sections.push('faq');
    if (hasMap) sections.push('map');

    // Extrair h1 e h2 para frases de posicionamento do concorrente
    const headingRegex = /<h[12][^>]*>([^<]{5,80})<\/h[12]>/gi;
    const competitorPhrases = [...html.matchAll(headingRegex)]
      .map(m => m[1].replace(/\s+/g, ' ').trim())
      .filter(p => p.length > 5 && !p.toLowerCase().includes('menu') && !p.toLowerCase().includes('navigation'))
      .slice(0, 5);

    // Identificar tom de escrita
    const toneKeywords: string[] = [];
    if (/premium|luxo|exclusivo|requinte|sofisticad/i.test(html)) toneKeywords.push('premium e sofisticado');
    if (/rapido|urgente|já|agora|imediato/i.test(html)) toneKeywords.push('direto e com urgência');
    if (/familia|família|acolhedor|amigo|carinho/i.test(html)) toneKeywords.push('familiar e acolhedor');
    if (/líder|especialista|qualidade|garantia|profissional/i.test(html)) toneKeywords.push('profissional e de autoridade');
    if (toneKeywords.length === 0) toneKeywords.push('moderno e comercial');

    return {
      url: parsed.toString(),
      title,
      description,
      colorHint,
      dominantColors,
      sections,
      toneKeywords,
      competitorPhrases,
      hasGallery,
      hasTestimonials,
      hasMap,
      hasFaq
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return defaultEmpty;
  }
}
