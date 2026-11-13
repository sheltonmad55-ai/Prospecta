import { NextResponse } from 'next/server';
import { requireActivePlan, AppError, supabaseConfigured, supabaseAdmin } from '@/server/auth';
import { db, now } from '@/server/db';
import { sanitizeGeneratedHtml } from '@/server/html-sanitizer';
import { renderSiteTemplate, type SiteContent } from '@/server/site-template';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActivePlan(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'approve';

    let row: any = null;

    if (supabaseConfigured()) {
      try {
        const client = supabaseAdmin();
        if (client) {
          const { data } = await client
            .from('generated_sites')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) row = data;
        }
      } catch (err) {
        console.warn('[Supabase site patch lookup]:', err);
      }
    }

    if (!row) {
      row = db().prepare(`
        SELECT * FROM generated_sites WHERE id = ? AND user_id = ?
      `).get(id, user.id) as any;
    }

    if (!row) {
      return NextResponse.json({ error: 'Site não encontrado.' }, { status: 404 });
    }

    const timestamp = now();
    const isApprove = action === 'approve';
    const newStatus = isApprove ? 'approved' : 'draft';

    if (isApprove) {
      const placeholdersPending = row.placeholders_pending || 0;
      if (placeholdersPending > 0) {
        return NextResponse.json({
          error: `Não é possível aprovar este site enquanto houver ${placeholdersPending} campo(s) de exemplo pendentes. Confirme os dados primeiro.`
        }, { status: 400 });
      }
    }

    let updatedHtml = row.html;
    if (row.content) {
      const content = (typeof row.content === 'string' ? JSON.parse(row.content) : row.content) as SiteContent;
      updatedHtml = renderSiteTemplate(content, !isApprove);
    } else if (row.html) {
      updatedHtml = sanitizeGeneratedHtml(row.html, !isApprove);
    }

    // Atualiza no Supabase
    if (supabaseConfigured()) {
      try {
        const client = supabaseAdmin();
        if (client) {
          await client.from('generated_sites').update({
            html: updatedHtml,
            status: newStatus,
            updated_at: timestamp
          }).eq('id', id).eq('user_id', user.id);
        }
      } catch (err) {
        console.warn('[Supabase patch update error]:', err);
      }
    }

    // Atualiza no SQLite
    try {
      db().prepare(`
        UPDATE generated_sites 
        SET html = ?, status = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(updatedHtml, newStatus, timestamp, id, user.id);
    } catch {}

    return NextResponse.json({
      success: true,
      site: {
        id,
        userId: user.id,
        slug: row.slug,
        businessName: row.business_name,
        niche: row.niche,
        sourceData: typeof row.source_data === 'string' ? JSON.parse(row.source_data || '{}') : row.source_data,
        images: typeof row.images === 'string' ? JSON.parse(row.images || '[]') : row.images,
        html: updatedHtml,
        status: newStatus,
        createdAt: row.created_at,
        updatedAt: timestamp
      }
    });
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json({ error: error.message || 'Erro ao atualizar o site.' }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActivePlan(request);
    const { id } = await context.params;

    // Remove no Supabase
    if (supabaseConfigured()) {
      try {
        const client = supabaseAdmin();
        if (client) {
          await client.from('site_versions').delete().eq('site_id', id);
          await client.from('generated_sites').delete().eq('id', id).eq('user_id', user.id);
        }
      } catch (err) {
        console.warn('[Supabase site delete error]:', err);
      }
    }

    // Remove no SQLite
    try {
      db().prepare('DELETE FROM generated_sites WHERE id = ? AND user_id = ?').run(id, user.id);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json({ error: error.message || 'Erro ao apagar o site.' }, { status });
  }
}
