import { getSiteBySlugPersistent } from '@/server/site-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const cleanSlug = (slug || '').trim().toLowerCase();

  if (!cleanSlug) {
    return new Response('Slug inválido.', { status: 400 });
  }

  // Busca o site persistente no servidor com chave de serviço (sem acesso anónimo à BD)
  const site = await getSiteBySlugPersistent(cleanSlug);

  if (!site || !site.html) {
    return new Response(
      `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Página não encontrada</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0B0F19; color: #F8FAFC; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
    .card { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 40px 24px; max-width: 420px; }
    h1 { font-size: 20px; margin: 0 0 8px; color: #E2E8F0; }
    p { font-size: 14px; color: #94A3B8; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Prévia não encontrada</h1>
    <p>O link solicitado pode ter expirado ou sido removido.</p>
  </div>
</body>
</html>`,
      {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  const isDraft = site.status === 'draft';
  const finalHtml = site.html;

  // Content-Security-Policy com Sandbox ajustado aos scripts do template:
  // frame-ancestors restrito exclusivamente ao domínio oficial de produção da Prospecta e ambiente local controlado
  const isDev = process.env.NODE_ENV !== 'production';
  const allowedAncestors = [
    "'self'",
    "https://prospecta-mz.vercel.app",
    isDev ? "http://localhost:* http://127.0.0.1:*" : ""
  ].filter(Boolean).join(' ');

  const cspHeader = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src https: data:",
    "frame-src https://www.google.com https://maps.google.com https://www.google.co.mz",
    `frame-ancestors ${allowedAncestors}`,
    "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox"
  ].join('; ');

  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': cspHeader,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': isDraft ? 'no-store, no-cache, must-revalidate' : 'public, max-age=3600'
  };

  return new Response(finalHtml, {
    status: 200,
    headers
  });
}
