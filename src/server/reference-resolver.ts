import dns from 'node:dns/promises';
import { AppError } from './auth';

export interface ReferenceSiteData {
  url: string;
  title?: string;
  description?: string;
  colorHint?: string;
  styleHint?: string;
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
 * Resolve e extrai pistas de estilo de um website de referência com proteção estrita contra SSRF.
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

  // Fetch seguro com timeout de 3.5s e limite de tamanho
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

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
      return { url: parsed.toString() };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return { url: parsed.toString() };
    }

    // Lê no máximo os primeiros 60KB
    const reader = res.body?.getReader();
    if (!reader) return { url: parsed.toString() };

    let html = '';
    const decoder = new TextDecoder('utf-8');
    while (html.length < 60000) {
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

    return {
      url: parsed.toString(),
      title,
      description,
      colorHint
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { url: parsed.toString() };
    }
    return { url: parsed.toString() };
  }
}

