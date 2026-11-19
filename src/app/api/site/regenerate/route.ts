import { NextResponse } from 'next/server';
import { requireActivePlan, credits, AppError, supabaseConfigured, supabaseAdmin } from '@/server/auth';
import { db, now } from '@/server/db';
import {
  SITE_REGENERATION_CREDIT_COST,
  type SiteSourceData,
  type GeneratedSite
} from '@/lib/site-constants';
import { generateSiteHtml } from '@/server/site-ai';
import { persistSiteAndVersion, consumeCreditsPersistent } from '@/server/site-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Módulo temporariamente fora do ar para manutenção e atualização
    if (true as boolean) {
      return NextResponse.json({
        error: 'O Criador de Sites está temporariamente em manutenção e atualização. Estará disponível em breve.'
      }, { status: 503 });
    }

    const user = await requireActivePlan(request);

    // Em produção, falha de forma estritamente fechada se a infraestrutura Supabase não estiver pronta
    if (process.env.NODE_ENV === 'production' && !supabaseConfigured()) {
      return NextResponse.json({
        error: 'Serviço de base de dados e créditos indisponível em ambiente de produção.'
      }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const { siteId, instructions = '', sourceDataUpdates } = body;

    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json({ error: 'ID do site obrigatório.' }, { status: 400 });
    }

    // 1. Busca site existente no Supabase ou SQLite local
    let row: any = null;
    let currentVersion = 1;

    if (supabaseConfigured()) {
      try {
        const client = supabaseAdmin();
        if (client) {
          const { data, error } = await (client as any)
            .from('generated_sites')
            .select('*')
            .eq('id', siteId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            row = {
              id: data.id,
              user_id: data.user_id,
              slug: data.slug,
              business_name: data.business_name,
              niche: data.niche,
              source_data: typeof data.source_data === 'string' ? data.source_data : JSON.stringify(data.source_data),
              images: typeof data.images === 'string' ? data.images : JSON.stringify(data.images),
              html: data.html,
              current_version: data.current_version || 1
            };
            currentVersion = (data.current_version || 1) + 1;
          }
        }
      } catch (err) {
        console.warn('[Supabase site lookup in regenerate]:', err);
      }
    }

    if (!row) {
      row = db().prepare(`
        SELECT * FROM generated_sites WHERE id = ? AND user_id = ?
      `).get(siteId, user.id) as any;
      currentVersion = 2;
    }

    if (!row) {
      return NextResponse.json({ error: 'Site não encontrado.' }, { status: 404 });
    }

    // 2. Verificação de créditos para regeneração
    const currentCredits = credits(user.workspaceId);
    if (currentCredits.available < SITE_REGENERATION_CREDIT_COST) {
      return NextResponse.json({
        error: `Créditos insuficientes para regeneração. Requer ${SITE_REGENERATION_CREDIT_COST} créditos (tem ${currentCredits.available} disponíveis).`
      }, { status: 402 });
    }

    let sourceData = JSON.parse(row.source_data || '{}') as SiteSourceData;
    if (sourceDataUpdates && typeof sourceDataUpdates === 'object') {
      sourceData = { ...sourceData, ...sourceDataUpdates };
    }
    const images = JSON.parse(row.images || '[]') as string[];

    // 3. Chamada da IA com instruções
    const result = await generateSiteHtml({
      userId: user.id,
      sourceData,
      images,
      instructions,
      isRegeneration: true
    });

    const timestamp = now();

    // 4. Gravação persistente (actualiza generated_sites e adiciona nova linha em site_versions)
    await persistSiteAndVersion({
      siteId,
      userId: user.id,
      slug: row.slug,
      businessName: row.business_name,
      niche: row.niche,
      sourceData,
      images,
      content: result.content,
      html: result.html,
      version: currentVersion,
      instructions: instructions || 'Regeneração com ajustes',
      isLegacy: false,
      status: 'draft'
    });

    // 5. Dedução estrita e persistente de créditos no Supabase
    await consumeCreditsPersistent(
      user,
      SITE_REGENERATION_CREDIT_COST,
      `Ajuste e regeneração de site para ${sourceData.businessName}`,
      siteId
    );

    const updatedSite: GeneratedSite = {
      id: siteId,
      userId: user.id,
      slug: row.slug,
      businessName: row.business_name,
      niche: row.niche,
      sourceData,
      images,
      html: result.html,
      status: 'draft',
      createdAt: row.created_at || timestamp,
      updatedAt: timestamp
    };

    return NextResponse.json({
      success: true,
      site: updatedSite,
      missingFields: result.missingFields,
      creditsRemaining: Math.max(0, currentCredits.available - SITE_REGENERATION_CREDIT_COST)
    });
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erro ao regenerar o site.' }, { status });
  }
}
