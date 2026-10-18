import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { getSupabaseEnv, userById, createUser } from '@/server/auth';
import { readFlowCookie, consumeGoogleFlow, recordConsent } from '@/server/google-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error') || requestUrl.searchParams.get('error_description');

  if (error) {
    console.error('[Google OAuth Callback Error]:', error);
    return NextResponse.redirect(new URL('/login?auth_error=google_failed', requestUrl.origin));
  }

  if (!code) {
    console.error('[Google OAuth Callback]: Nenhum código de autorização recebido na URL.');
    return NextResponse.redirect(new URL('/login?auth_error=google_missing_code', requestUrl.origin));
  }

  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    console.error('[Google OAuth Callback]: Credenciais Supabase não configuradas (NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY).');
    return NextResponse.redirect(new URL('/login?auth_error=google_not_configured', requestUrl.origin));
  }

  // Coletar verifier PKCE dos cookies ou do fluxo guardado
  const storageValues: Record<string, string> = {};

  // 1. Ler dos cookies da requisição
  const projectRef = new URL(url).hostname.split('.')[0] || 'app';
  const cookieHeader = request.headers.get('cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const [rawK, rawV] = part.trim().split('=');
    if (!rawK || !rawV) continue;
    try {
      const k = decodeURIComponent(rawK);
      const v = decodeURIComponent(rawV);
      if (k.includes('verifier') || k.includes('auth-token') || k === 'prospecta_pkce' || k === 'prospecta_oauth_verifier') {
        storageValues[k] = v;
      }
    } catch {
      // Ignorar cookies malformados
    }
  }

  // 2. Tentar ler do fluxo de cookie SQLite se presente
  try {
    const flowToken = readFlowCookie(request);
    if (flowToken) {
      const flow = consumeGoogleFlow(request);
      if (flow?.storage) {
        const parsed = JSON.parse(flow.storage);
        Object.assign(storageValues, parsed);
      }
    }
  } catch (flowErr) {
    // Não-bloqueante se o verifier já estiver no cookie
  }

  // Garantir chaves padrão que o Supabase GoTrue procura
  const foundVerifier = storageValues['prospecta-oauth-code-verifier'] ||
                        storageValues['prospecta_pkce'] ||
                        storageValues[`sb-${projectRef}-auth-token-code-verifier`] ||
                        storageValues['supabase.auth.token-code-verifier'];

  if (foundVerifier) {
    storageValues[`sb-${projectRef}-auth-token-code-verifier`] = foundVerifier;
    storageValues['prospecta-oauth-code-verifier'] = foundVerifier;
    storageValues['supabase.auth.token-code-verifier'] = foundVerifier;
  }

  const client = createClient(url, key, {
    auth: {
      flowType: 'pkce',
      storageKey: storageValues['prospecta-oauth-code-verifier'] ? 'prospecta-oauth' : undefined,
      storage: {
        getItem: (k) => storageValues[k] ?? null,
        setItem: (k, v) => { storageValues[k] = v; },
        removeItem: (k) => { delete storageValues[k]; }
      }
    }
  });

  let session: any = null;
  let user: any = null;

  try {
    const exchangeResult = await client.auth.exchangeCodeForSession(code);
    if (exchangeResult.error || !exchangeResult.data?.session) {
      console.error('[Google OAuth Callback]: Falha ao trocar código por sessão:', exchangeResult.error?.message || exchangeResult.error);
      return NextResponse.redirect(new URL('/login?auth_error=google_exchange_failed', requestUrl.origin));
    }
    session = exchangeResult.data.session;
    user = exchangeResult.data.user;
  } catch (err: any) {
    console.error('[Google OAuth Callback]: Erro de conexão durante troca de sessão:', err?.message || err);
    return NextResponse.redirect(new URL('/login?auth_error=google_exchange_failed', requestUrl.origin));
  }

  if (!session || !user) {
    console.error('[Google OAuth Callback]: Sessão ou utilizador nulo retornado pelo Supabase.');
    return NextResponse.redirect(new URL('/login?auth_error=google_empty_session', requestUrl.origin));
  }

  // Cria e atualiza o workspace/perfil do utilizador no Supabase caso seja primeiro acesso
  const metadata = user.user_metadata || {};
  const rawName = metadata.businessName || (metadata.full_name && metadata.full_name.toLowerCase() !== 'droop store' ? metadata.full_name : '') || (metadata.name && metadata.name.toLowerCase() !== 'droop store' ? metadata.name : '') || 'Chelton Madime';
  const name = typeof rawName === 'string' ? rawName.trim().slice(0, 100) : 'Chelton Madime';
  const email = (user.email || `${user.id}@prospecta.mz`).toLowerCase();

  if (!metadata.workspaceId || !metadata.profile) {
    try {
      await client.auth.updateUser({
        data: {
          name,
          workspaceId: user.id,
          role: metadata.role || 'owner',
          credits: metadata.credits || { available: 20, reserved: 0, spent: 0 },
          profile: {
            service: 'Criação de websites',
            pitch: '',
            province: 'Maputo Cidade',
            phone: '',
            nationwide: true,
            onboarded: false,
            ...(metadata.profile || {})
          }
        }
      });
    } catch (metaErr) {
      console.warn('[Google OAuth Callback]: Não foi possível atualizar metadados no Supabase:', metaErr);
    }
  }

  // Garantir criação local para cache consistente e isolamento
  try {
    const existing = userById(user.id);
    if (!existing) {
      createUser(name, email, randomBytes(32).toString('hex'), false, 'owner', user.id);
      recordConsent(user.id, false, 'google');
    }
  } catch (localErr) {
    console.warn('[Google OAuth Callback]: Registo local secundário:', localErr);
  }

  // Redireciona com sucesso para /?view=radar com cookies gravados explicitamente
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const destination = new URL('/?view=radar', requestUrl.origin);
  const response = NextResponse.redirect(destination, { status: 303 });

  const cookieOptions = {
    path: '/',
    sameSite: 'lax' as const,
    secure: isProd,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7 // 7 dias
  };

  // Grava cookies de sessão
  response.cookies.set('prospecta_session', session.access_token, cookieOptions);
  response.cookies.set('sb-access-token', session.access_token, cookieOptions);
  if (session.refresh_token) {
    response.cookies.set('sb-refresh-token', session.refresh_token, cookieOptions);
  }

  // Limpa cookies transitórios de fluxo
  response.cookies.set('prospecta_oauth', '', { path: '/', maxAge: 0 });
  response.cookies.set('prospecta_oauth', '', { path: '/api/auth', maxAge: 0 });
  response.cookies.set('prospecta_pkce', '', { path: '/', maxAge: 0 });
  response.cookies.set('prospecta_oauth_verifier', '', { path: '/', maxAge: 0 });

  return response;
}
