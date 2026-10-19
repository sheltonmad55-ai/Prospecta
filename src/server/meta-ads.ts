/**
 * Meta Ad Library (Biblioteca de Anúncios) Integration Helper
 * 
 * Permite verificar programaticamente se uma empresa moçambicana tem anúncios
 * ativos no Facebook e Instagram através da Meta Graph API (Ad Library).
 * 
 * Requisitos para modo automático:
 * - Definir META_AD_LIBRARY_ACCESS_TOKEN no .env.local (token de app do developers.facebook.com)
 * 
 * Se o token ainda não estiver configurado (durante o processo de aprovação de identidade da Meta),
 * a função retorna de forma segura com status não verificado e fornece o link direto de 1 clique.
 */

export interface MetaAdCheckResult {
  hasActiveAds: boolean;
  activeCount: number;
  checkedViaApi: boolean;
  directUrl: string;
  error?: string;
}

export function getMetaAdLibrarySearchUrl(businessName: string): string {
  const clean = (businessName || '').trim();
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=MZ&q=${encodeURIComponent(clean)}`;
}

export async function checkMetaAds(businessName: string): Promise<MetaAdCheckResult> {
  const clean = (businessName || '').trim();
  const directUrl = getMetaAdLibrarySearchUrl(clean);
  const token = process.env.META_AD_LIBRARY_ACCESS_TOKEN;

  if (!token || !clean) {
    return {
      hasActiveAds: false,
      activeCount: 0,
      checkedViaApi: false,
      directUrl
    };
  }

  try {
    const url = new URL('https://graph.facebook.com/v20.0/ads_archive');
    url.searchParams.set('search_terms', clean);
    url.searchParams.set('ad_reached_countries', "['MZ']");
    url.searchParams.set('ad_active_status', 'ACTIVE');
    url.searchParams.set('ad_type', 'ALL');
    url.searchParams.set('access_token', token);

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      return {
        hasActiveAds: false,
        activeCount: 0,
        checkedViaApi: false,
        directUrl,
        error: `Meta API HTTP ${res.status}`
      };
    }

    const data = await res.json();
    const ads = Array.isArray(data?.data) ? data.data : [];
    return {
      hasActiveAds: ads.length > 0,
      activeCount: ads.length,
      checkedViaApi: true,
      directUrl
    };
  } catch (err: any) {
    return {
      hasActiveAds: false,
      activeCount: 0,
      checkedViaApi: false,
      directUrl,
      error: err?.message || 'Falha de comunicação com Meta'
    };
  }
}
