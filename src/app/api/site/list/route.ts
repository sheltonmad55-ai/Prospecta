import { NextResponse } from 'next/server';
import { requireActivePlan, AppError, supabaseConfigured, supabaseAdmin } from '@/server/auth';
import { db } from '@/server/db';
import type { GeneratedSite } from '@/lib/site-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireActivePlan(request);

    // 1. Tenta buscar diretamente do Supabase (produção)
    if (supabaseConfigured()) {
      try {
        const client = supabaseAdmin();
        if (client) {
          const { data: sbSites, error } = await client
            .from('generated_sites')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (sbSites && Array.isArray(sbSites)) {
            const sites: GeneratedSite[] = sbSites.map(s => ({
              id: s.id,
              userId: s.user_id,
              slug: s.slug,
              businessName: s.business_name,
              niche: s.niche,
              sourceData: typeof s.source_data === 'string' ? JSON.parse(s.source_data || '{}') : s.source_data,
              content: s.content ? (typeof s.content === 'string' ? JSON.parse(s.content) : s.content) : (typeof s.source_data === 'string' ? JSON.parse(s.source_data || '{}') : s.source_data),
              images: typeof s.images === 'string' ? JSON.parse(s.images || '[]') : s.images,
              html: s.html,
              status: s.status || 'draft',
              createdAt: s.created_at,
              updatedAt: s.updated_at || s.created_at
            }));

            return NextResponse.json({ success: true, sites });
          }
        }
      } catch (err) {
        console.warn('[listSites Supabase error, falling back to sqlite]:', err);
      }
    }

    // 2. Fallback SQLite local
    const rows = db().prepare(`
      SELECT * FROM generated_sites 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(user.id) as any[];

    const sites: GeneratedSite[] = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      slug: r.slug,
      businessName: r.business_name,
      niche: r.niche,
      sourceData: JSON.parse(r.source_data || '{}'),
      content: r.content ? JSON.parse(r.content) : JSON.parse(r.source_data || '{}'),
      images: JSON.parse(r.images || '[]'),
      html: r.html,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return NextResponse.json({
      success: true,
      sites
    });
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json({ error: error.message || 'Erro ao listar sites.' }, { status });
  }
}
