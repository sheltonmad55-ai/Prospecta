import { NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
import { requireActivePlan, credits, AppError } from '@/server/auth';
import { db, now } from '@/server/db';
import {
  SITE_GENERATION_CREDIT_COST,
  type SiteSourceData,
  type GeneratedSite
} from '@/lib/site-constants';
import { generateSiteHtml } from '@/server/site-ai';
import { persistSiteAndVersion, consumeCreditsPersistent } from '@/server/site-persistence';
import { resolveReferenceSite } from '@/server/reference-resolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function generateSlug(name: string): string {
  const clean = (name || 'site')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  // Sufixo criptograficamente aleatório de 12 caracteres (impossível de adivinhar)
  const suffix = randomBytes(6).toString('hex');
  return `${clean || 'empresa'}-${suffix}`;
}

export async function POST(request: Request) {
  try {
    const user = await requireActivePlan(request);
    const body = await request.json().catch(() => ({}));
    const sourceData = (body.sourceData || {}) as SiteSourceData;
    const images = Array.isArray(body.images) ? body.images.slice(0, 10) : [];

    if (!sourceData.businessName || sourceData.businessName.trim().length < 2) {
      return NextResponse.json({ error: 'O nome da empresa é obrigatório.' }, { status: 400 });
    }

    // 1. Verificação prévia e rigorosa de saldo de créditos ANTES de qualquer chamada de IA
    const currentCredits = credits(user.workspaceId);
    if (currentCredits.available < SITE_GENERATION_CREDIT_COST) {
      return NextResponse.json({
        error: `Créditos insuficientes. A geração de site requer ${SITE_GENERATION_CREDIT_COST} créditos (tem ${currentCredits.available} disponíveis).`
      }, { status: 402 });
    }

    // 2. Se houver link de site de referência, resolve com proteção estrita contra SSRF
    let resolvedReference: import('@/server/reference-resolver').ReferenceSiteData | null = null;
    if (sourceData.referenceSiteUrl) {
      try {
        resolvedReference = await resolveReferenceSite(sourceData.referenceSiteUrl);
        if (resolvedReference?.colorHint && !sourceData.primaryColor) {
          sourceData.primaryColor = resolvedReference.colorHint;
        } else if (resolvedReference?.dominantColors?.[0] && !sourceData.primaryColor) {
          sourceData.primaryColor = resolvedReference.dominantColors[0];
        }
      } catch (err: any) {
        console.warn('[Reference site resolution note]:', err.message);
      }
    }

    // 3. Geração de slug criptográfico seguro
    let slug = generateSlug(sourceData.businessName);
    let attempts = 0;
    while (attempts < 5) {
      const exists = db().prepare('SELECT id FROM generated_sites WHERE slug = ?').get(slug);
      if (!exists) break;
      slug = generateSlug(sourceData.businessName);
      attempts++;
    }

    // 4. Chamada da IA isolada (se falhar, lança erro e NENHUM crédito é debitado)
    const result = await generateSiteHtml({
      userId: user.id,
      sourceData,
      images,
      instructions: body.instructions || '',
      referenceData: resolvedReference
    });

    const siteId = randomUUID();
    const timestamp = now();
    const niche = sourceData.niche || 'outro';
    const template = (sourceData.style as string) || 'moderno';
    const placeholdersPending = result.missingFields.length;

    // 5. Gravação persistente no Supabase (generated_sites + site_versions)
    await persistSiteAndVersion({
      siteId,
      userId: user.id,
      slug,
      businessName: sourceData.businessName.trim(),
      niche,
      sourceData,
      images,
      content: result.content,
      html: result.html,
      version: 1,
      instructions: 'Criação inicial de website',
      isLegacy: false,
      status: 'draft'
    });

    // 6. Dedução atómica de créditos (RPC no Postgres) APENAS após sucesso
    await consumeCreditsPersistent(
      user,
      SITE_GENERATION_CREDIT_COST,
      `Criação de site de demonstração para ${sourceData.businessName}`,
      siteId
    );

    const createdSite: GeneratedSite = {
      id: siteId,
      userId: user.id,
      slug,
      businessName: sourceData.businessName.trim(),
      niche,
      sourceData,
      images,
      html: result.html,
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    return NextResponse.json({
      success: true,
      site: createdSite,
      missingFields: result.missingFields,
      placeholdersPending,
      creditsRemaining: Math.max(0, currentCredits.available - SITE_GENERATION_CREDIT_COST)
    });
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erro ao gerar o site da empresa.' }, { status });
  }
}
