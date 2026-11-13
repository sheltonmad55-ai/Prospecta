import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireActivePlan, AppError, supabaseAdmin, supabaseConfigured } from '@/server/auth';
import {
  SITE_MAX_IMAGES,
  SITE_MAX_IMAGE_SIZE_BYTES,
  SITE_ALLOWED_IMAGE_TYPES
} from '@/lib/site-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireActivePlan(request);
    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return NextResponse.json({ error: 'Nenhum ficheiro recebido.' }, { status: 400 });
    }

    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhuma imagem selecionada.' }, { status: 400 });
    }

    if (files.length > SITE_MAX_IMAGES) {
      return NextResponse.json(
        { error: `Permitido no máximo ${SITE_MAX_IMAGES} imagens por site.` },
        { status: 400 }
      );
    }

    const uploadedUrls: string[] = [];
    const client = supabaseConfigured() ? supabaseAdmin() : null;

    for (const file of files) {
      if (!(file instanceof File)) continue;

      if (!SITE_ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de ficheiro inválido (${file.name}). Apenas JPG, PNG e WEBP são permitidos.` },
          { status: 400 }
        );
      }

      if (file.size > SITE_MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `O ficheiro ${file.name} excede o limite máximo de 2 MB.` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${randomUUID()}.${ext}`;
      const storagePath = `sites/${user.id}/${fileName}`;

      let fileUrl = '';

      if (client && client.storage) {
        try {
          const bucketName = 'site-assets';
          // Tenta garantir que o bucket existe (se não existir, cria público)
          const { data: buckets } = await client.storage.listBuckets();
          const bucketExists = buckets?.some(b => b.name === bucketName);
          if (!bucketExists) {
            await client.storage.createBucket(bucketName, { public: true });
          }

          const { error: uploadErr } = await client.storage
            .from(bucketName)
            .upload(storagePath, buffer, {
              contentType: file.type,
              upsert: true
            });

          if (!uploadErr) {
            const { data: publicUrlData } = client.storage
              .from(bucketName)
              .getPublicUrl(storagePath);
            fileUrl = publicUrlData.publicUrl;
          } else {
            console.warn('[Supabase Storage upload warning]:', uploadErr);
          }
        } catch (stErr) {
          console.warn('[Supabase Storage error]:', stErr);
        }
      }

      // Fallback seguro caso o bucket do Supabase falhe ou não tenha permissão de escrita direta
      if (!fileUrl) {
        const base64 = buffer.toString('base64');
        fileUrl = `data:${file.type};base64,${base64}`;
      }

      uploadedUrls.push(fileUrl);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length
    });
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json({ error: error.message || 'Erro ao carregar imagens.' }, { status });
  }
}

