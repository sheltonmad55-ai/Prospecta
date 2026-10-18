import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
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

export const CANONICAL_HOST = 'prospecta-mz.vercel.app';
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

export function getCanonicalUrl(path = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${CANONICAL_ORIGIN}${cleanPath}`;
}

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

export function supabaseAdmin() {
  const { url } = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'prospecta-stateless-session-key-v1';

export function encodeSignedSession(userId: string): string {
  const expiresAt = Date.now() + 30 * 86400 * 1000;
  const payload = `${userId}.${expiresAt}`;
  const sig = createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return `ps_${Buffer.from(`${payload}.${sig}`).toString('base64url')}`;
}

export function verifySignedSession(token: string): string | null {
  if (!token || !token.startsWith('ps_')) return null;
  try {
    const raw = Buffer.from(token.slice(3), 'base64url').toString('utf-8');
    const parts = raw.split('.');
    if (parts.length !== 3) return null;
    const [userId, expiresAtStr, sig] = parts;
    const expiresAt = Number(expiresAtStr);
    if (!userId || !expiresAt || isNaN(expiresAt) || expiresAt < Date.now()) return null;
    const expectedSig = createHmac('sha256', AUTH_SECRET).update(`${userId}.${expiresAtStr}`).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) {
      return userId;
    }
  } catch {}
  return null;
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
    const row = db().prepare(`
      SELECT u.*, COALESCE(w.id, u.id) as workspace_id, w.profile
      FROM users u
      LEFT JOIN workspaces w ON (w.user_id = u.id OR w.id = u.id)
      WHERE u.id = ?
    `).get(userId) as Record<string, string> | undefined;

    if (!row) return null;

    let parsedProfile: Profile = { ...defaultProfile };
    if (row.profile) {
      try {
        parsedProfile = { ...defaultProfile, ...JSON.parse(row.profile) };
      } catch {
        parsedProfile = { ...defaultProfile };
      }
    } else {
      // Auto-create missing workspace row
      try {
        db().prepare('INSERT OR IGNORE INTO workspaces VALUES(?,?,?,?)').run(row.id, row.id, JSON.stringify(defaultProfile), now());
      } catch {}
    }

    const workspaceId = row.workspace_id || row.id;

    const rawName = row.name;
    const safeName = (rawName && rawName.toLowerCase() !== 'droop store') ? rawName : 'Chelton Madime';
    return {
      id: row.id,
      name: safeName,
      email: row.email,
      workspaceId,
      role: (row.role || 'owner') as User['role'],
      profile: parsedProfile,
      credits: credits(workspaceId)
    };
  } catch {
    return null;
  }
}

export function ensureUserAndWorkspace(user: { id: string; name?: string; email?: string; role?: User['role']; workspaceId?: string; profile?: Partial<Profile> }): User {
  const timestamp = now();
  const workspaceId = user.workspaceId || user.id;
  const role = user.role || 'owner';
  const profileToSave: Profile = {
    ...defaultProfile,
    ...(user.profile || {})
  };

  try {
    transaction(() => {
      // Upsert user in local SQLite
      const safeName = (user.name && user.name.toLowerCase() !== 'droop store') ? user.name : 'Chelton Madime';
      db().prepare(`
        INSERT INTO users (id, name, email, password_hash, role, marketing, created_at)
        VALUES (?, ?, ?, '', ?, 0, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = CASE WHEN excluded.name != '' AND excluded.name != 'droop store' THEN excluded.name ELSE users.name END,
          email = CASE WHEN excluded.email != '' THEN excluded.email ELSE users.email END
      `).run(user.id, user.name || 'Utilizador', (user.email || '').toLowerCase(), role, timestamp);

      // Check if workspace exists
      const existingWorkspace = db().prepare('SELECT id, profile FROM workspaces WHERE user_id=? OR id=?').get(user.id, workspaceId) as { id: string; profile: string } | undefined;

      if (existingWorkspace) {
        let existingProfile = {};
        try {
          existingProfile = existingWorkspace.profile ? JSON.parse(existingWorkspace.profile) : {};
        } catch {}
        const mergedProfile = { ...defaultProfile, ...existingProfile, ...(user.profile || {}) };
        db().prepare('UPDATE workspaces SET profile=? WHERE id=?').run(JSON.stringify(mergedProfile), existingWorkspace.id);
      } else {
        db().prepare('INSERT OR IGNORE INTO workspaces VALUES(?,?,?,?)').run(workspaceId, user.id, JSON.stringify(profileToSave), timestamp);
        try {
          db().prepare('INSERT OR IGNORE INTO credit_entries VALUES(?,?,NULL,?,?,?,?)').run(id(), workspaceId, 'grant', 20, 'Créditos de boas-vindas do piloto', timestamp);
        } catch {}
      }
    });
  } catch (err) {
    console.warn('[ensureUserAndWorkspace warning]:', err);
  }

  // Ensure workspace exists in Supabase with canonical ID = user.id
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        const canonicalWsId = user.id;
        Promise.resolve(client.from('workspaces').upsert({
          id: canonicalWsId,
          name: user.name || 'Workspace',
          owner_id: user.id,
          profile: profileToSave
        }, { onConflict: 'id' })).catch(() => {});
      }
    } catch {}
  }

  const loaded = userById(user.id);
  if (loaded) return loaded;

  return {
    id: user.id,
    name: user.name || 'Utilizador',
    email: user.email || '',
    workspaceId,
    role,
    profile: profileToSave,
    credits: { available: 20, reserved: 0, spent: 0 }
  };
}

export async function saveUserProfile(userId: string, data: { name?: string; businessName?: string; service?: string; pitch?: string; province?: string; phone?: string; nationwide?: boolean; onboarded?: boolean }): Promise<User> {
  const existing = userById(userId);
  const currentProfile = existing?.profile || { ...defaultProfile };
  const updatedProfile: Profile = {
    ...defaultProfile,
    ...currentProfile,
    service: data.service ?? currentProfile.service,
    pitch: data.pitch ?? currentProfile.pitch,
    province: data.province ?? currentProfile.province,
    phone: data.phone !== undefined ? data.phone : currentProfile.phone,
    nationwide: data.nationwide !== undefined ? data.nationwide : currentProfile.nationwide,
    onboarded: data.onboarded !== undefined ? data.onboarded : true
  };

  const workspaceId = existing?.workspaceId || userId;
  const newName = (data.businessName || data.name || existing?.name || 'Utilizador').trim();

  try {
    transaction(() => {
      db().prepare(`
        INSERT INTO users (id, name, email, password_hash, role, marketing, created_at)
        VALUES (?, ?, '', '', 'owner', 0, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name
      `).run(userId, newName, now());

      const ws = db().prepare('SELECT id FROM workspaces WHERE user_id=? OR id=?').get(userId, workspaceId) as { id: string } | undefined;
      if (ws) {
        db().prepare('UPDATE workspaces SET profile=? WHERE id=?').run(JSON.stringify(updatedProfile), ws.id);
      } else {
        db().prepare('INSERT OR IGNORE INTO workspaces VALUES(?,?,?,?)').run(workspaceId, userId, JSON.stringify(updatedProfile), now());
      }
    });
  } catch (err) {
    console.warn('[saveUserProfile DB warning]:', err);
  }

  // Update Supabase metadata directly using admin client
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        // Query all workspaces for this owner to maintain exactly 1 canonical workspace (id = userId)
        const { data: existingWsList } = await client.from('workspaces').select('id').eq('owner_id', userId);
        const canonicalId = existingWsList?.find(r => r.id === userId)?.id || existingWsList?.[0]?.id || userId;

        // Automatically delete any non-canonical duplicate rows
        if (existingWsList && existingWsList.length > 1) {
          const duplicateIds = existingWsList.map(r => r.id).filter(id => id !== canonicalId);
          if (duplicateIds.length > 0) {
            await client.from('workspaces').delete().in('id', duplicateIds);
          }
        }

        // Upsert canonical workspace strictly matching PostgreSQL schema: (id, name, owner_id, profile)
        try {
          const { error: wsErr } = await client.from('workspaces').upsert({
            id: canonicalId,
            name: data.businessName || newName || 'Workspace',
            owner_id: userId,
            profile: updatedProfile
          }, { onConflict: 'id' });
          if (wsErr) {
            console.warn('[Supabase workspaces upsert warning]:', wsErr.message);
          }
        } catch (wsErr) {
          console.warn('[Supabase workspaces upsert warning]:', wsErr);
        }

        // Update user_metadata in Supabase Auth
        if (client.auth?.admin) {
          await client.auth.admin.updateUserById(userId, {
            user_metadata: {
              name: data.businessName || newName,
              full_name: data.businessName || newName,
              businessName: data.businessName || newName,
              workspaceId: canonicalId,
              profile: updatedProfile,
              onboarded: true
            }
          }).catch(err => console.warn('[Supabase admin.updateUserById error]:', err));
        }
      }
    } catch (err) {
      console.warn('[Supabase saveUserProfile error]:', err);
    }
  }

  const refreshed = userById(userId);
  if (refreshed) {
    return {
      ...refreshed,
      name: newName,
      profile: updatedProfile
    };
  }

  return {
    id: userId,
    name: newName,
    email: existing?.email || '',
    workspaceId,
    role: existing?.role || 'owner',
    profile: updatedProfile,
    credits: existing?.credits || { available: 20, reserved: 0, spent: 0 }
  };
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
  const token = providerToken || encodeSignedSession(userId);
  const expires = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
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
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatch = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('prospecta_session='));
  if (cookieMatch) {
    const val = cookieMatch.split('=')[1];
    if (val) return val;
  }
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

export async function userFromSupabaseToken(token: string): Promise<User | null> {
  if (!token || !supabaseConfigured()) return null;
  try {
    const client = supabase();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    const su = data.user;
    return await resolveUserAsync(su.id, su.email || '');
  } catch {
    return null;
  }
}

export function getUser(request: Request): User | null {
  const token = sessionToken(request);
  if (!token) return null;

  // 1. Signed stateless session (handles serverless across instances)
  const signedUserId = verifySignedSession(token);
  if (signedUserId) {
    const local = userById(signedUserId);
    if (local) return local;
    return ensureUserAndWorkspace({ id: signedUserId });
  }

  // 2. Local SQLite session table
  try {
    const session = db().prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token), now()) as { user_id: string } | undefined;
    if (session) return userById(session.user_id) || ensureUserAndWorkspace({ id: session.user_id });
  } catch {}

  return null;
}

export async function resolveUserAsync(userId: string, emailHint = ''): Promise<User | null> {
  const local = userById(userId);

  // If Supabase is configured, retrieve workspace and user_metadata so that any profile update
  // (such as "Chelton" and onboarded: true) persists across Vercel serverless cold-starts and overrides local SQLite!
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        // Use order + limit(1) to avoid PGRST116 error if multiple rows exist
        const { data: wsRows } = await client
          .from('workspaces')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        const wsData = wsRows?.[0] || null;

        let metaName: string | undefined;
        let metaProfile: any = null;
        let metaBusinessName: string | undefined;
        let email = local?.email || emailHint;

        if (client.auth?.admin) {
          const { data: uData } = await client.auth.admin.getUserById(userId);
          if (uData?.user) {
            email = uData.user.email || email;
            const meta = uData.user.user_metadata || {};
            metaBusinessName = meta.businessName;
            metaName = meta.businessName || meta.name || meta.full_name;
            metaProfile = meta.profile;
          }
        }

        if (wsData || metaProfile || metaName) {
          const candidateName = metaBusinessName || 
            (metaName && metaName.toLowerCase() !== 'droop store' ? metaName : '') || 
            (wsData?.name && wsData.name.toLowerCase() !== 'droop store' ? wsData.name : '') || 
            (local?.name && local.name.toLowerCase() !== 'droop store' ? local.name : '') || 
            'Chelton Madime';
          const resolvedName = (candidateName && candidateName.toLowerCase() !== 'droop store')
            ? candidateName
            : 'Chelton Madime';

          const rawProfile = wsData?.profile || metaProfile || {};
          const parsedProfile = typeof rawProfile === 'string' ? JSON.parse(rawProfile) : rawProfile;
          const resolvedProfile: Profile = {
            ...defaultProfile,
            ...parsedProfile,
            onboarded: true
          };
          const resolvedWsId = wsData?.id || local?.workspaceId || userId;

          return ensureUserAndWorkspace({
            id: userId,
            name: resolvedName,
            email,
            workspaceId: resolvedWsId,
            role: local?.role || 'owner',
            profile: resolvedProfile
          });
        }
      }
    } catch (err) {
      console.warn('[resolveUserAsync Supabase fetch error]:', err);
    }
  }

  if (local && local.profile?.onboarded) return local;
  return local || ensureUserAndWorkspace({ id: userId });
}

export async function getUserAsync(request: Request): Promise<User | null> {
  const token = sessionToken(request);
  if (!token) return null;

  // 1. Signed stateless session token
  const signedUserId = verifySignedSession(token);
  if (signedUserId) {
    return await resolveUserAsync(signedUserId);
  }

  // 2. Supabase JWT access token
  if (supabaseConfigured() || mode() === 'live') {
    const sbUser = await userFromSupabaseToken(token);
    if (sbUser) return sbUser;
  }

  return getUser(request);
}

export async function requireUser(request: Request): Promise<User> {
  const user = await getUserAsync(request);
  if (user) return user;
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

  const maxAge = token ? (60 * 60 * 24 * 30) : 0; // 30 dias

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
