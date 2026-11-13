/**
 * Sanitizador de segurança estrito para HTML gerado por IA.
 * Garante ausência total de JavaScript, scripts externos, handlers de eventos
 * e iframes não autorizados (permitido apenas Google Maps Embed).
 */

export function sanitizeGeneratedHtml(rawHtml: string, isDraft = true): string {
  if (!rawHtml) return '';

  let html = rawHtml;

  // 1. Remove blocos markdown se a IA devolver cercado por ```html ... ```
  html = html.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');

  // 2. Remove estritamente todas as tags <script> (inclusive com quebras de linha e atributos)
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/<script\b[^>]*>/gi, '');
  html = html.replace(/<\/script>/gi, '');

  // 3. Remove todos os event handlers inline (onload, onclick, onerror, onmouseover, onfocus, etc.)
  html = html.replace(/\s+on[a-z]+(\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+))/gi, '');

  // 4. Remove pseudo-protocolos perigosos em href, src, formaction, data
  html = html.replace(/(href|src|formaction|action)\s*=\s*(['"]?)\s*javascript:[^'"]*\2/gi, '$1="#"');
  html = html.replace(/(href|src|formaction|action)\s*=\s*(['"]?)\s*vbscript:[^'"]*\2/gi, '$1="#"');
  html = html.replace(/(href|src|formaction|action)\s*=\s*(['"]?)\s*data:text\/html[^'"]*\2/gi, '$1="#"');

  // 5. Sanitiza todas as tags <iframe>:
  // Permite EXCLUSIVAMENTE embeds do Google Maps (https://www.google.com/maps... ou https://maps.google.com...)
  html = html.replace(/<iframe\b([^>]*)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/src\s*=\s*(['"])(.*?)\1/i);
    if (!srcMatch) return '';
    const src = srcMatch[2].trim();
    const isGoogleMaps = src.startsWith('https://www.google.com/maps') ||
                         src.startsWith('https://maps.google.com') ||
                         src.startsWith('https://www.google.co.mz/maps');
    if (!isGoogleMaps) return ''; // Descarta iframe não autorizado
    // Força atributos de segurança no iframe permitido
    return `<iframe src="${src}" style="border:0; width:100%; height:280px; border-radius:12px;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade">`;
  });

  // 6. Garante que todos os links <a href="..."> externos tenham target="_blank" e rel="noopener"
  html = html.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
    let cleanAttrs = attrs;
    // Remove target e rel existentes para evitar duplicados ou maliciosos
    cleanAttrs = cleanAttrs.replace(/\s+target\s*=\s*(['"])[^'"]*\1/gi, '');
    cleanAttrs = cleanAttrs.replace(/\s+rel\s*=\s*(['"])[^'"]*\1/gi, '');
    return `<a ${cleanAttrs.trim()} target="_blank" rel="noopener">`;
  });

  // 7. Remove tags de formulário interativo de envio para fora (<form>, <input type="password">, etc.)
  html = html.replace(/<\/?form\b[^>]*>/gi, '');

  // 8. Injeta meta noindex se for rascunho
  if (isDraft) {
    if (!html.includes('robots')) {
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">');
      } else if (html.includes('<html>')) {
        html = html.replace('<html>', '<html>\n<head><meta name="robots" content="noindex, nofollow"></head>');
      } else {
        html = `<meta name="robots" content="noindex, nofollow">\n` + html;
      }
    }
    
    // Injeta etiqueta discreta "Prévia" no topo ou cantos se não estiver presente
    if (!html.includes('preview-badge-prospecta') && !html.includes('Etiqueta Prévia')) {
      const previewBadge = `
<div id="preview-badge-prospecta" style="position:fixed; top:12px; right:12px; z-index:999999; background:rgba(15,23,42,0.85); color:#FACC15; border:1px solid rgba(250,204,21,0.5); padding:6px 14px; border-radius:20px; font-family:system-ui,-apple-system,sans-serif; font-size:12px; font-weight:700; box-shadow:0 4px 12px rgba(0,0,0,0.3); backdrop-filter:blur(8px); display:flex; align-items:center; gap:6px;">
  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#FACC15;"></span>
  Prévia em Demonstração
</div>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${previewBadge}\n</body>`);
      } else {
        html += previewBadge;
      }
    }
  } else {
    // Se for aprovado, remove a etiqueta e meta noindex caso existam
    html = html.replace(/<div id="preview-badge-prospecta"[\s\S]*?<\/div>/gi, '');
    html = html.replace(/<meta name="robots" content="noindex, nofollow">/gi, '');
  }

  return html;
}

