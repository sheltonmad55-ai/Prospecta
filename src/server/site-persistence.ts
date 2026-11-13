/**
 * Camada de persistência para o módulo "Criar site".
 * Garante que em produção na Vercel (onde o sistema de ficheiros local é efémero)
 * todos os dados essenciais sejam lidos e gravados no Supabase:
 * - generated_sites
 * - site_versions (histórico de gerações/ajustes)
 * - rate limiting persistente (site_rate_limits)
 * - cache persistente de pedidos idênticos (site_cache)
 * - consumo e reembolso atómico de créditos (user_metadata, workspaces e credit_entries)
 */

import { supabaseAdmin, supabaseConfigured, AppError } from './auth';
import type { User } from '../lib/contracts';
import { db, now } from './db';
import type { SiteContent } from './site-template';
import { renderSiteTemplate } from './site-template';
import { sanitizeGeneratedHtml } from './html-sanitizer';
import type { GeneratedSite, SiteSourceData } from '../lib/site-constants';

export interface SiteRecord {
  id: string;
  userId: string;
  slug: string;
  businessName: string;
  niche: string;
  sourceData: SiteSourceData;
  images: string[];
  content?: SiteContent | null;
  html?: string | null;
  isLegacy: boolean;
  status: 'draft' | 'approved';
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 1. RATE LIMIT PERSISTENTE NO SUPABASE (5 gerações por hora por utilizador)
 */
export async function enforcePersistentRateLimit(
  userId: string,
  limit = 5,
  windowMs = 60 * 60 * 1000
): Promise<void> {
  const key = `site_gen:${userId}`;
  const nowMs = Date.now();
  const resetAtIso = new Date(nowMs + windowMs).toISOString();

  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        // Consulta o registo de rate limit
        const { data: row, error: selectErr } = await client
          .from('site_rate_limits')
          .select('count, reset_at')
          .eq('key', key)
          .maybeSingle();

        if (selectErr && selectErr.code !== 'PGRST116') {
          console.warn('[Supabase rate limit select error]:', selectErr.message);
        }

        if (row && new Date(row.reset_at).getTime() > nowMs) {
          if (row.count >= limit) {
            throw new AppError(
              'Limite de 5 gerações por hora atingido para proteger os recursos. Tente novamente mais tarde.',
              429
            );
          }
          // Incrementa
          await client
            .from('site_rate_limits')
            .update({ count: row.count + 1 })
            .eq('key', key);
          return;
        } else {
          // Cria ou reinicia janela
          await client
            .from('site_rate_limits')
            .upsert({
              key,
              count: 1,
              reset_at: resetAtIso
            }, { onConflict: 'key' });
          return;
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn('[enforcePersistentRateLimit Supabase fallback to sqlite]:', err);
    }
  }

  // Fallback local SQLite
  try {
    const row = db().prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?').get(key) as { count: number; reset_at: number } | undefined;
    if (row && row.reset_at > nowMs) {
      if (row.count >= limit) {
        throw new AppError('Limite de 5 gerações por hora atingido. Aguarde um momento.', 429);
      }
      db().prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').run(key);
    } else {
      db().prepare('INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count=1, reset_at=excluded.reset_at').run(key, nowMs + windowMs);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
  }
}

/**
 * 2. CACHE PERSISTENTE DE PEDIDOS IDÊNTICOS NO SUPABASE
 */
export async function getPersistentSiteCache(
  inputHash: string,
  userId: string
): Promise<{ content: SiteContent; html: string } | null> {
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        const { data, error } = await client
          .from('site_cache')
          .select('content, html')
          .eq('input_hash', inputHash)
          .eq('user_id', userId)
          .maybeSingle();

        if (data && data.content) {
          return {
            content: data.content as SiteContent,
            html: data.html || renderSiteTemplate(data.content as SiteContent, true)
          };
        }
      }
    } catch (err) {
      console.warn('[getPersistentSiteCache Supabase warning]:', err);
    }
  }

  // Fallback local SQLite
  try {
    const cached = db().prepare(`
      SELECT html, source_data FROM generated_sites 
      WHERE user_id = ? AND json_extract(source_data, '$.inputHash') = ? 
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, inputHash) as { html: string; source_data: string } | undefined;

    if (cached && cached.html) {
      const sData = JSON.parse(cached.source_data || '{}');
      return {
        content: sData._cached_content || null,
        html: cached.html
      };
    }
  } catch {}

  return null;
}

export async function setPersistentSiteCache(
  inputHash: string,
  userId: string,
  content: SiteContent,
  html: string
): Promise<void> {
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        await client.from('site_cache').upsert({
          input_hash: inputHash,
          user_id: userId,
          content,
          html,
          created_at: now()
        }, { onConflict: 'input_hash' });
      }
    } catch (err) {
      console.warn('[setPersistentSiteCache Supabase warning]:', err);
    }
  }
}

/**
 * 3. GRAVAÇÃO PERSISTENTE DE SITE E VERSÃO (generated_sites + site_versions)
 */
export async function persistSiteAndVersion(params: {
  siteId: string;
  userId: string;
  slug: string;
  businessName: string;
  niche: string;
  sourceData: SiteSourceData;
  images: string[];
  content: SiteContent;
  html: string;
  version: number;
  instructions?: string;
  isLegacy?: boolean;
  status?: 'draft' | 'approved';
}): Promise<void> {
  const timestamp = now();
  const status = params.status || 'draft';
  const isLegacy = params.isLegacy || false;

  // A. Gravar no Supabase (Persistência Real)
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        // 1. Tabela generated_sites
        const { error: siteErr } = await client.from('generated_sites').upsert({
          id: params.siteId,
          user_id: params.userId,
          slug: params.slug,
          business_name: params.businessName,
          niche: params.niche,
          source_data: params.sourceData,
          images: params.images,
          content: params.content,
          html: params.html,
          is_legacy: isLegacy,
          status,
          current_version: params.version,
          created_at: timestamp,
          updated_at: timestamp
        }, { onConflict: 'id' });

        if (siteErr) {
          console.error('[Supabase persistSite error]:', siteErr.message);
        }

        // 2. Tabela site_versions (Histórico de versões e instruções)
        const { error: verErr } = await client.from('site_versions').insert({
          site_id: params.siteId,
          user_id: params.userId,
          version: params.version,
          instructions: params.instructions || (params.version === 1 ? 'Criação inicial' : 'Ajuste'),
          content: params.content,
          html: params.html,
          created_at: timestamp
        });

        if (verErr) {
          console.warn('[Supabase site_versions insert warning]:', verErr.message);
        }
      }
    } catch (err) {
      console.error('[persistSiteAndVersion Supabase fatal error]:', err);
    }
  }

  // B. Espelhar no SQLite local (para desenvolvimento e fallback rápido)
  try {
    db().prepare(`
      INSERT INTO generated_sites (
        id, user_id, slug, business_name, niche, source_data, images, html, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        business_name=excluded.business_name,
        niche=excluded.niche,
        source_data=excluded.source_data,
        images=excluded.images,
        html=excluded.html,
        status=excluded.status,
        updated_at=excluded.updated_at
    `).run(
      params.siteId,
      params.userId,
      params.slug,
      params.businessName,
      params.niche,
      JSON.stringify(params.sourceData),
      JSON.stringify(params.images),
      params.html,
      status,
      timestamp,
      timestamp
    );
  } catch (err) {
    console.warn('[persistSiteAndVersion local sqlite mirror warning]:', err);
  }
}

/**
 * 4. BUSCA DE SITE POR SLUG (Lê do Supabase primeiro em produção)
 */
export async function getSiteBySlugPersistent(slug: string): Promise<{
  id: string;
  businessName: string;
  content: SiteContent | null;
  html: string;
  isLegacy: boolean;
  status: 'draft' | 'approved';
} | null> {
  const cleanSlug = (slug || '').trim().toLowerCase();
  if (!cleanSlug) return null;

  // 1. Tenta buscar no Supabase
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        const { data, error } = await client
          .from('generated_sites')
          .select('id, business_name, content, html, is_legacy, status')
          .ilike('slug', cleanSlug)
          .maybeSingle();

        if (data) {
          const isLegacy = Boolean(data.is_legacy || (!data.content && data.html));
          const content = (data.content as SiteContent) || null;
          const isDraft = data.status === 'draft';

          // Se tem content em JSON, renderiza via template!
          let finalHtml = '';
          if (content && !isLegacy) {
            finalHtml = renderSiteTemplate(content, isDraft);
          } else if (data.html) {
            finalHtml = sanitizeGeneratedHtml(data.html, isDraft);
          }

          return {
            id: data.id,
            businessName: data.business_name,
            content,
            html: finalHtml,
            isLegacy,
            status: data.status as 'draft' | 'approved'
          };
        }
      }
    } catch (err) {
      console.warn('[getSiteBySlugPersistent Supabase warning]:', err);
    }
  }

  // 2. Fallback SQLite
  try {
    const site = db().prepare(`
      SELECT id, business_name, html, status, source_data
      FROM generated_sites 
      WHERE lower(slug) = ? 
      LIMIT 1
    `).get(cleanSlug) as { id: string; business_name: string; html: string; status: 'draft' | 'approved'; source_data?: string } | undefined;

    if (site && site.html) {
      let content: SiteContent | null = null;
      try {
        const sData = JSON.parse(site.source_data || '{}');
        if (sData._content) content = sData._content;
      } catch {}

      const isDraft = site.status === 'draft';
      const finalHtml = content ? renderSiteTemplate(content, isDraft) : sanitizeGeneratedHtml(site.html, isDraft);

      return {
        id: site.id,
        businessName: site.business_name,
        content,
        html: finalHtml,
        isLegacy: !content,
        status: site.status
      };
    }
  } catch {}

  return null;
}

/**
 * 5. CONSUMO ATÓMICO E PERSISTENTE DE CRÉDITOS NO SUPABASE VIA RPC
 */
export async function consumeCreditsPersistent(
  user: User,
  units: number,
  description: string,
  siteId: string
): Promise<void> {
  const timestamp = now();

  // A. Chama a RPC atómica no Postgres (Supabase)
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        const { data: rpcRes, error: rpcErr } = await client.rpc('consume_credits_atomic', {
          p_user_id: user.id,
          p_workspace_id: user.workspaceId || user.id,
          p_units: units,
          p_description: description,
          p_job_id: null
        });

        if (rpcErr) {
          console.warn('[consumeCreditsPersistent RPC error, attempting fallback]:', rpcErr.message);
        } else if (rpcRes && rpcRes.success === false) {
          throw new AppError(rpcRes.error || 'Créditos insuficientes.', 402);
        } else if (rpcRes && rpcRes.success === true) {
          // Sucesso garantido na transação atómica
          return;
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn('[consumeCreditsPersistent Supabase fallback]:', err);
    }
  }

  // B. Regista no SQLite local (dev)
  try {
    db().prepare(`
      INSERT INTO credit_entries (id, workspace_id, job_id, kind, units, description, created_at)
      VALUES (?, ?, ?, 'consume', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      user.workspaceId,
      siteId,
      units,
      description,
      timestamp
    );
  } catch (err) {
    console.warn('[consumeCreditsPersistent SQLite warning]:', err);
  }
}

/**
 * 6. REEMBOLSO ATÓMICO DE CRÉDITOS SE A OPERAÇÃO FALHAR
 */
export async function refundCreditsPersistent(
  user: User,
  units: number,
  reason: string,
  siteId: string
): Promise<void> {
  const timestamp = now();

  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        await client.rpc('refund_credits_atomic', {
          p_user_id: user.id,
          p_workspace_id: user.workspaceId || user.id,
          p_units: units,
          p_reason: reason,
          p_job_id: null
        });
        return;
      }
    } catch (err) {
      console.warn('[refundCreditsPersistent Supabase error]:', err);
    }
  }

  try {
    db().prepare(`
      INSERT INTO credit_entries (id, workspace_id, job_id, kind, units, description, created_at)
      VALUES (?, ?, ?, 'release', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      user.workspaceId,
      siteId,
      units,
      `Reembolso: ${reason}`,
      timestamp
    );
  } catch {}
}
