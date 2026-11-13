/**
 * Resolução e extração estrita de URLs do Google Maps.
 * NÃO utiliza API do Google Maps nem efetua web scraping de HTML.
 * Extrai apenas metadados explícitos contidos na estrutura do próprio URL.
 */

export interface ResolvedMapsData {
  originalUrl: string;
  resolvedUrl?: string;
  extractedName?: string;
  coordinates?: { lat: number; lng: number };
  embedMapUrl?: string;
  needsProfileText: boolean;
}

export async function resolveGoogleMapsUrl(inputUrl: string): Promise<ResolvedMapsData> {
  const trimmed = (inputUrl || '').trim();
  if (!trimmed) {
    return { originalUrl: '', needsProfileText: true };
  }

  let finalUrl = trimmed;

  // Resolve links curtos (maps.app.goo.gl ou goo.gl/maps) via redirect HTTP (sem scraping de corpo)
  if (trimmed.includes('goo.gl') || trimmed.includes('maps.app.goo.gl')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(trimmed, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      clearTimeout(timeoutId);
      finalUrl = res.url || trimmed;
    } catch {
      // Se HEAD falhar, tenta com GET sem ler corpo
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 6000);
        const res2 = await fetch(trimmed, {
          method: 'GET',
          redirect: 'manual',
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        const loc = res2.headers.get('location');
        if (loc) finalUrl = loc;
      } catch {
        finalUrl = trimmed;
      }
    }
  }

  let extractedName: string | undefined;
  let coordinates: { lat: number; lng: number } | undefined;

  try {
    const urlObj = new URL(finalUrl);

    // Formato 1: /maps/place/Nome+da+Empresa/@lat,lng,zoom/...
    const placeMatch = urlObj.pathname.match(/\/maps\/place\/([^/@?]+)/i);
    if (placeMatch && placeMatch[1]) {
      const rawName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
      if (rawName && !rawName.match(/^-?\d+\.\d+,-?\d+\.\d+$/)) {
        extractedName = rawName;
      }
    }

    // Formato 2: query param 'q' ou 'query'
    if (!extractedName) {
      const q = urlObj.searchParams.get('q') || urlObj.searchParams.get('query');
      if (q) {
        const rawQ = decodeURIComponent(q.replace(/\+/g, ' ')).trim();
        // Se for coordenadas puras, não é o nome
        if (!rawQ.match(/^-?\d+\.\d+,-?\d+\.\d+$/)) {
          extractedName = rawQ;
        }
      }
    }

    // Coordenadas: @(-?\d+\.\d+),(-?\d+\.\d+)
    const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates = { lat, lng };
      }
    } else {
      // Coordenadas em parâmetro q=-25.96,32.58
      const q = urlObj.searchParams.get('q');
      if (q) {
        const qCoordMatch = q.match(/^(-?\d+\.\d+),(-?\d+\.\d+)$/);
        if (qCoordMatch) {
          const lat = parseFloat(qCoordMatch[1]);
          const lng = parseFloat(qCoordMatch[2]);
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates = { lat, lng };
          }
        }
      }
    }
  } catch {
    // URL malformado
  }

  const embedMapUrl = coordinates
    ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&hl=pt&z=15&output=embed`
    : extractedName
    ? `https://www.google.com/maps?q=${encodeURIComponent(extractedName)}&hl=pt&z=15&output=embed`
    : undefined;

  return {
    originalUrl: trimmed,
    resolvedUrl: finalUrl !== trimmed ? finalUrl : undefined,
    extractedName,
    coordinates,
    embedMapUrl,
    needsProfileText: !extractedName
  };
}

