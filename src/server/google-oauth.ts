import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { AppError, createSession, createUser, hash, userById } from './auth.ts';
import { db, id, now, transaction } from './db.ts';
import { mode } from './providers.ts';

const TERMS_VERSION = 'pilot-2026-10-16';
type Flow = { storage: string; intent: 'login' | 'register'; marketing: number };
type OAuthUser = { id: string; email?: string; email_confirmed_at?: string; user_metadata?: Record<string, unknown> };
export type OAuthProvider = {
  begin: (redirectTo: string) => Promise<{ url: string | null; error: boolean }>;
  exchange: (code: string) => Promise<{ user: OAuthUser | null; accessToken: string | null; error: boolean }>;
  verify: (token: string) => Promise<{ user: OAuthUser | null; error: boolean }>;
};
export type ProviderFactory = (values: Record<string, string>) => OAuthProvider;

export function publicOrigin(request: Request) {
  const url = new URL(process.env.APP_URL || new URL(request.url).origin);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new AppError('Configure APP_URL com HTTPS antes de activar o Google.', 503);
  return url.origin;
}
export function googleConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return mode() === 'live' && !!url && !!key;
}
function requireConfiguration() {
  if (!googleConfigured()) throw new AppError('O acesso com Google ainda não está activado neste ambiente. Pode continuar com e-mail e palavra-passe.', 503);
}
export function flowCookie(value: string, request: Request) {
  const isHttps = request.url.startsWith('https:') ||
    (process.env.APP_URL && process.env.APP_URL.startsWith('https:')) ||
    request.headers.get('x-forwarded-proto') === 'https' ||
    Boolean(process.env.VERCEL);
  return `prospecta_oauth=${value}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${value ? 300 : 0}${isHttps ? '; Secure' : ''}`;
}
function readFlowCookie(request: Request) {
  return request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith('prospecta_oauth='))?.slice('prospecta_oauth='.length) || '';
}
function provider(values: Record<string, string>): OAuthProvider {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;
  const client = createClient(url, key, { auth: {
    flowType: 'pkce', storageKey: 'prospecta-oauth', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
    storage: { getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = value; }, removeItem: key => { delete values[key]; } },
  } });
  return {
    async begin(redirectTo) { const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } }); return { url: data.url, error: !!error }; },
    async exchange(code) { const { data, error } = await client.auth.exchangeCodeForSession(code); return { user: data.user, accessToken: data.session?.access_token || null, error: !!error }; },
    async verify(token) { const { data, error } = await client.auth.getUser(token); return { user: data.user, error: !!error }; },
  };
}

export async function beginGoogleOAuth(request: Request, input: { intent: 'login' | 'register'; acceptedTerms: boolean; marketing: boolean }, factory: ProviderFactory = provider) {
  if (input.intent === 'register' && !input.acceptedTerms) throw new AppError('Aceite os termos e a política de privacidade para criar a conta.');
  requireConfiguration();
  const origin = publicOrigin(request);
  const values: Record<string, string> = {};
  const result = await factory(values).begin(origin + '/api/auth/callback');
  if (result.error || !result.url) throw new AppError('Não foi possível iniciar o acesso com Google. Tente novamente.', 502);
  const destination = new URL(result.url);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  if (destination.origin !== new URL(supabaseUrl).origin || !destination.pathname.endsWith('/auth/v1/authorize')) throw new AppError('O fornecedor devolveu uma ligação inválida.', 502);
  if (!Object.keys(values).some(key => key.endsWith('-code-verifier'))) throw new AppError('Não foi possível preparar a autenticação segura com Google.', 502);
  const token = randomBytes(32).toString('hex');
  transaction(() => {
    db().prepare('DELETE FROM oauth_flows WHERE expires_at<? OR used=1').run(now());
    db().prepare('INSERT INTO oauth_flows VALUES(?,?,?,?,?,0)').run(hash(token), JSON.stringify(values), input.intent, input.marketing ? 1 : 0, new Date(Date.now() + 300000).toISOString());
  });
  return { redirectUrl: result.url, cookie: flowCookie(token, request) };
}

export function consumeGoogleFlow(request: Request): Flow {
  const token = readFlowCookie(request);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new AppError('A sessão de acesso com Google não foi encontrada. Comece novamente.', 400);
  return transaction(() => {
    const row = db().prepare('SELECT storage,intent,marketing FROM oauth_flows WHERE token_hash=? AND used=0 AND expires_at>?').get(hash(token), now()) as Flow | undefined;
    if (!row) throw new AppError('A ligação de acesso com Google expirou ou já foi utilizada.', 400);
    db().prepare("UPDATE oauth_flows SET used=1,storage='{}' WHERE token_hash=?").run(hash(token));
    return row;
  });
}

export function recordConsent(userId: string, marketing: boolean, source: 'email' | 'google') {
  db().prepare('INSERT INTO user_consents VALUES(?,?,?,?,?,?)').run(id(), userId, TERMS_VERSION, marketing ? 1 : 0, source, now());
}

export async function completeGoogleOAuth(request: Request, code: string, factory: ProviderFactory = provider) {
  requireConfiguration();
  if (!code || code.length > 4096) throw new AppError('O código de acesso com Google é inválido.');
  const flow = consumeGoogleFlow(request);
  const client = factory(JSON.parse(flow.storage));
  const exchanged = await client.exchange(code);
  if (exchanged.error || !exchanged.user || !exchanged.accessToken) throw new AppError('Não foi possível concluir o acesso com Google. Comece novamente.', 401);
  const verified = await client.verify(exchanged.accessToken);
  if (verified.error || !verified.user?.email || verified.user.id !== exchanged.user.id || !verified.user.email_confirmed_at) throw new AppError('Não foi possível confirmar a conta Google.', 401);
  const identity = verified.user;
  const email = identity.email!.toLowerCase();
  const user = transaction(() => {
    const existing = userById(identity.id);
    if (existing) return existing;
    if (flow.intent !== 'register') throw new AppError('Crie primeiro a conta e aceite os termos para continuar com Google.', 409);
    if (db().prepare('SELECT id FROM users WHERE email=?').get(email)) throw new AppError('Este e-mail já pertence a outra conta. Entre pelo método utilizado anteriormente.', 409);
    const rawName = identity.user_metadata?.full_name || identity.user_metadata?.name;
    const name = typeof rawName === 'string' ? rawName.trim().slice(0, 100) || email.split('@')[0] : email.split('@')[0];
    // createUser owns its transaction; provision below after this read-only transaction.
    return { newIdentity: true as const, name };
  });
  let account;
  if ('newIdentity' in user) {
    account = createUser(user.name, email, randomBytes(32).toString('hex'), !!flow.marketing, 'owner', identity.id);
    recordConsent(account.id, !!flow.marketing, 'google');
  } else account = user;
  return { user: account, token: createSession(account.id, exchanged.accessToken) };
}
