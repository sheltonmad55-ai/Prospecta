import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { db, id, now, transaction } from './db.ts';
import { mode } from './providers.ts';
import type { Credits, Profile, User } from '../lib/contracts.ts';

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function checkPassword(password: string, stored: string) {
  const [salt, encoded] = stored.split(':');
  if (!salt || !encoded) return false;
  const buffer = Buffer.from(encoded, 'hex');
  return buffer.length === 64 && timingSafeEqual(buffer, scryptSync(password, salt, 64));
}

export const defaultProfile: Profile = {
  service: 'Criação de websites',
  pitch: '',
  province: '',
  phone: '',
  nationwide: true,
  onboarded: false
};

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, key };
}

export function supabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}

export function supabase() {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new AppError('Autenticação real não configurada. Defina as credenciais do Supabase (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY).', 503);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function credits(workspaceId: string): Credits {
  try {
    const rows = db().prepare('SELECT kind,COALESCE(SUM(units),0) as total FROM credit_entries WHERE workspace_id=? GROUP BY kind').all(workspaceId) as { kind: string; total: number }[];
    const sums = Object.fromEntries(rows.map(r => [r.kind, r.total]));
    const spent = sums.consume || 0;
    const reserved = (sums.reserve || 0) - (sums.release || 0) - spent;
    return { available: (sums.grant || 0) - spent - reserved, reserved, spent };
  } catch {
    return { available: 20, reserved: 0, spent: 0 };
  }
}

export function userById(userId: string): User | null {
  try {
    const row = db().prepare('SELECT u.*,w.id as workspace_id,w.profile FROM users u JOIN workspaces w ON w.user_id=u.id WHERE u.id=?').get(userId) as Record<string, string> | undefined;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      workspaceId: row.workspace_id,
      role: row.role as User['role'],
      profile: { ...defaultProfile, ...JSON.parse(row.profile || '{}') },
      credits: credits(row.workspace_id)
    };
  } catch {
    return null;
  }
}

export function createUser(name: string, email: string, password: string, marketing = false, role: 'owner' | 'admin' = 'owner', userId: string = id()) {
  try {
    return transaction(() => {
      const workspaceId = id();
      const timestamp = now();
      db().prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(userId, name, email.toLowerCase(), passwordHash(password), role, marketing ? 1 : 0, timestamp);
      db().prepare('INSERT INTO workspaces VALUES(?,?,?,?)').run(workspaceId, userId, JSON.stringify(defaultProfile), timestamp);
      db().prepare('INSERT INTO credit_entries VALUES(?,?,?,?,?,?,?)').run(id(), workspaceId, null, 'grant', 20, 'Créditos de boas-vindas do piloto', timestamp);
      return userById(userId)!;
    });
  } catch {
    return {
      id: userId,
      name,
      email: email.toLowerCase(),
      workspaceId: userId,
      role,
      profile: { ...defaultProfile },
      credits: { available: 20, reserved: 0, spent: 0 }
    };
  }
}

export function createSession(userId: string, providerToken?: string): string {
  const token = providerToken || randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
  try {
    db().exec('CREATE TABLE IF NOT EXISTS provider_sessions(token_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,access_token TEXT NOT NULL)');
    db().prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), userId, expires);
    if (providerToken) db().prepare('INSERT INTO provider_sessions VALUES(?,?)').run(hash(token), providerToken);
  } catch {
    // Non-blocking in serverless
  }
  return token;
}

export function sessionToken(request: Request): string {
  return request.headers.get('cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith('prospecta_session='))?.split('=')[1] || '';
}

export async function userFromSupabaseToken(token: string): Promise<User | null> {
  if (!token || !supabaseConfigured()) return null;
  try {
    const client = supabase();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    const su = data.user;

    const local = userById(su.id);
    if (local) return local;

    const email = su.email || '';
    const name = su.user_metadata?.name || su.user_metadata?.full_name || email.split('@')[0] || 'Utilizador';
    const role = (su.app_metadata?.role || su.user_metadata?.role || 'owner') as User['role'];
    const profile: Profile = {
      ...defaultProfile,
      ...(su.user_metadata?.profile || {}),
      phone: su.user_metadata?.phone || defaultProfile.phone
    };

    return {
      id: su.id,
      name,
      email,
      workspaceId: su.user_metadata?.workspaceId || su.id,
      role,
      profile,
      credits: su.user_metadata?.credits || { available: 20, reserved: 0, spent: 0 }
    };
  } catch {
    return null;
  }
}

export function getUser(request: Request): User | null {
  const token = sessionToken(request);
  if (!token) return null;
  try {
    const session = db().prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token), now()) as { user_id: string } | undefined;
    return session ? userById(session.user_id) : null;
  } catch {
    return null;
  }
}

export async function getUserAsync(request: Request): Promise<User | null> {
  const token = sessionToken(request);
  if (!token) return null;

  if (supabaseConfigured() || mode() === 'live') {
    const sbUser = await userFromSupabaseToken(token);
    if (sbUser) return sbUser;
  }

  return getUser(request);
}

export async function requireUser(request: Request): Promise<User> {
  const token = sessionToken(request);
  if (!token) throw new AppError('Entre na sua conta para continuar.', 401);

  if (supabaseConfigured() || mode() === 'live') {
    const sbUser = await userFromSupabaseToken(token);
    if (sbUser) return sbUser;
  }

  const localUser = getUser(request);
  if (localUser) return localUser;

  throw new AppError('Entre na sua conta para continuar.', 401);
}

export function cookie(token: string, request?: Request): string {
  const isProd = process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL) ||
    mode() === 'live';

  const isHttps = isProd ||
    Boolean(request && (
      request.url.startsWith('https:') ||
      request.headers.get('x-forwarded-proto') === 'https'
    )) ||
    Boolean(process.env.APP_URL && process.env.APP_URL.startsWith('https:'));

  const maxAge = token ? (60 * 60 * 24 * 7) : 0; // 7 days

  return `prospecta_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps ? '; Secure' : ''}`;
}

const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit = 35, windowMs = 60000) {
  const time = Date.now();
  const mem = memoryRateLimits.get(key);
  if (mem && mem.resetAt > time) {
    if (mem.count >= limit) throw new AppError('Muitos pedidos. Aguarde um momento antes de tentar novamente.', 429);
    mem.count += 1;
  } else {
    memoryRateLimits.set(key, { count: 1, resetAt: time + windowMs });
  }

  try {
    transaction(() => {
      const row = db().prepare('SELECT count,reset_at FROM rate_limits WHERE key=?').get(key) as { count: number; reset_at: number } | undefined;
      if (!row || row.reset_at < time) db().prepare('INSERT INTO rate_limits VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,reset_at=excluded.reset_at').run(key, 1, time + windowMs);
      else {
        if (row.count >= limit) throw new AppError('Muitos pedidos. Aguarde um momento antes de tentar novamente.', 429);
        db().prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').run(key);
      }
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
  }
}

export function audit(user: User, action: string, targetId: string) {
  try {
    db().prepare('INSERT INTO audit_events VALUES(?,?,?,?,?,?)').run(id(), user.id, user.workspaceId, action, targetId, now());
  } catch {
    // Non-blocking in serverless
  }
}
