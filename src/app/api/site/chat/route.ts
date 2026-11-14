import { NextResponse } from 'next/server';
import { requireActivePlan, supabaseAdmin, supabaseConfigured, AppError, credits } from '@/server/auth';
import { db, now } from '@/server/db';
import { consumeCreditsPersistent } from '@/server/site-persistence';
import { renderSiteTemplate } from '@/server/site-template';
import type { SiteContent } from '@/server/site-template';
import { SITE_CHAT_CREDIT_COST } from '@/lib/site-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSiteAiConfig() {
  const primaryKey = process.env.SITE_AI_API_KEY || '';
  const backupKey = process.env.SITE_AI_API_KEY_2 || '';
  const model = process.env.SITE_AI_MODEL || 'gemini-flash-lite-latest';
  return { primaryKey, backupKey, model };
}

export async function POST(request: Request) {
  try {
    const user = await requireActivePlan(request);
    const body = await request.json().catch(() => ({}));

    const { siteId, message, currentContent } = body as {
      siteId: string;
      message: string;
      currentContent: SiteContent;
    };

    if (!siteId || !message?.trim() || !currentContent) {
      return NextResponse.json({ error: 'Parâmetros incompletos para edição do site.' }, { status: 400 });
    }

    if (message.trim().length > 800) {
      return NextResponse.json({ error: 'Instrução demasiado extensa (máximo de 800 caracteres).' }, { status: 400 });
    }

    // 1. Verificação de créditos
    const currentCredits = credits(user.workspaceId);
    if (currentCredits.available < SITE_CHAT_CREDIT_COST) {
      return NextResponse.json({
        error: `Créditos insuficientes. Cada alteração assistida por IA requer ${SITE_CHAT_CREDIT_COST} crédito.`
      }, { status: 402 });
    }

    const { primaryKey, backupKey, model } = getSiteAiConfig();
    const candidateKeys = [
      { key: primaryKey, label: 'primary' },
      { key: backupKey, label: 'backup' }
    ].filter(c => Boolean(c.key));

    if (candidateKeys.length === 0) {
      return NextResponse.json({
        error: 'Chave de API do serviço de IA não configurada no servidor.'
      }, { status: 503 });
    }

    const systemInstruction = `Você é um editor sênior de websites mobile-first focado no mercado de Moçambique e CPLP.
O utilizador já possui um website de alta conversão estruturado em JSON e fornecerá uma instrução pontual de melhoria ou alteração.

REGRAS RÍGIDAS:
1. Respeite com precisão a instrução do utilizador.
2. Mantenha os dados fáticos existentes (telefone, WhatsApp, nome da empresa) a menos que o utilizador peça expressamente para mudar.
3. Se o utilizador pedir para mudar cores, adicione ou ajuste "primaryColor" com um código HEX válido (ex: #0284C7, #10B981, #DC2626).
4. Devolva estritamente um JSON estruturado com o objeto COMPLETO atualizado:
{
  "explanation": "Frase resumindo o que foi ajustado de acordo com o pedido",
  "sections_changed": ["hero", "services", "reviews", etc.],
  "content": {
    "businessName": "...",
    "tagline": "...",
    "heroHeadline": "...",
    "heroSubheadline": "...",
    "aboutText": "...",
    "services": [ { "title": "...", "description": "...", "icon": "shield|heart|sparkles|clock|star" } ],
    "address": "...",
    "openingHours": "...",
    "phone": "...",
    "whatsappNumber": "...",
    "whatsappMessage": "...",
    "style": "moderno|elegante|simples",
    "primaryColor": "...",
    "reviews": [ { "author": "...", "rating": 5, "comment": "..." } ],
    "images": [...]
  }
}`;

    const userPrompt = `CONTEÚDO ATUAL DO WEBSITE:
${JSON.stringify(currentContent, null, 2)}

INSTRUÇÃO DE AJUSTE DO UTILIZADOR:
"""
${message.trim()}
"""

Gere o JSON atualizado agora:`;

    // Usar streaming via Server-Sent Events / ndjson
    // Fallback de chaves se a primeira estiver esgotada
    let activeKey = candidateKeys[0].key;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${activeKey}&alt=sse`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    let geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json'
        }
      })
    });

    clearTimeout(timeoutId);

    // Se falhar por quota/429 e tivermos backup, tenta a segunda chave
    if (!geminiRes.ok && candidateKeys.length > 1 && (geminiRes.status === 429 || geminiRes.status === 503)) {
      activeKey = candidateKeys[1].key;
      const backupUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${activeKey}&alt=sse`;
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 40000);
      geminiRes = await fetch(backupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: c2.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 3000,
            responseMimeType: 'application/json'
          }
        })
      });
      clearTimeout(t2);
    }

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text().catch(() => '');
      console.error('[SiteChat Stream error]:', geminiRes.status, errBody);
      return NextResponse.json({ error: 'O serviço de IA está temporariamente ocupado. Tente novamente em instantes.' }, { status: 502 });
    }

    const reader = geminiRes.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: 'Stream indisponível.' }, { status: 502 });
    }

    // Criar ReadableStream para repassar ao cliente com feedback em tempo real
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controllerStream) {
        let buffer = '';
        let accumulatedRaw = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += textDecoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const chunk = JSON.parse(jsonStr);
                const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (chunkText) {
                  accumulatedRaw += chunkText;
                  // Enviar chunk de progresso
                  controllerStream.enqueue(textEncoder.encode(JSON.stringify({ type: 'chunk', text: chunkText }) + '\n'));
                }
              } catch {
                // Ignore parse errors on partial stream lines
              }
            }
          }

          // Parse final do JSON acumulado
          let cleanJson = accumulatedRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
          let parsedData: { explanation?: string; sections_changed?: string[]; content?: SiteContent } = {};

          try {
            parsedData = JSON.parse(cleanJson);
          } catch (jsonErr) {
            console.error('[SiteChat JSON parse error]:', jsonErr, cleanJson.slice(0, 150));
            controllerStream.enqueue(textEncoder.encode(JSON.stringify({
              type: 'error',
              error: 'A IA concluiu a resposta mas o formato necessita de ajuste. Tente uma instrução mais específica.'
            }) + '\n'));
            controllerStream.close();
            return;
          }

          if (!parsedData.content || !parsedData.content.businessName) {
            controllerStream.enqueue(textEncoder.encode(JSON.stringify({
              type: 'error',
              error: 'Resposta incompleta da IA.'
            }) + '\n'));
            controllerStream.close();
            return;
          }

          const updatedContent: SiteContent = {
            ...currentContent,
            ...parsedData.content,
            images: currentContent.images || parsedData.content.images || []
          };

          // Renderizar o novo HTML com base no template oficial
          const updatedHtml = renderSiteTemplate(updatedContent, true);

          // 2. Persistir no Supabase e SQLite
          const timestamp = now();
          if (supabaseConfigured()) {
            try {
              const client = supabaseAdmin();
              if (client) {
                // Atualizar site atual
                await client.from('generated_sites').update({
                  content: updatedContent,
                  html: updatedHtml,
                  updated_at: timestamp
                }).eq('id', siteId).eq('user_id', user.id);

                // Incrementar versão e guardar no histórico
                const { data: currentSite } = await client
                  .from('generated_sites')
                  .select('current_version')
                  .eq('id', siteId)
                  .maybeSingle();

                const newVersion = ((currentSite?.current_version) || 1) + 1;

                await client.from('site_versions').insert({
                  site_id: siteId,
                  user_id: user.id,
                  version: newVersion,
                  instructions: message.trim(),
                  content: updatedContent,
                  html: updatedHtml,
                  created_at: timestamp
                });

                await client.from('generated_sites').update({
                  current_version: newVersion
                }).eq('id', siteId);
              }
            } catch (supaErr) {
              console.warn('[SiteChat Supabase update warning]:', supaErr);
            }
          }

          // Atualizar espelho SQLite
          try {
            db().prepare(`
              UPDATE generated_sites 
              SET html = ?, source_data = json_set(source_data, '$._content', json(?)), updated_at = ?
              WHERE id = ? AND user_id = ?
            `).run(
              updatedHtml,
              JSON.stringify(updatedContent),
              timestamp,
              siteId,
              user.id
            );
          } catch (sqliteErr) {
            console.warn('[SiteChat SQLite update warning]:', sqliteErr);
          }

          // 3. Consumir crédito de forma persistente
          try {
            await consumeCreditsPersistent(
              user,
              SITE_CHAT_CREDIT_COST,
              `Ajuste de site via chat: "${message.trim().slice(0, 50)}"`,
              siteId
            );
          } catch (credErr) {
            console.warn('[SiteChat consumeCredits error]:', credErr);
          }

          // Enviar payload final de sucesso
          controllerStream.enqueue(textEncoder.encode(JSON.stringify({
            type: 'done',
            explanation: parsedData.explanation || 'Website atualizado com sucesso.',
            sections_changed: parsedData.sections_changed || [],
            content: updatedContent,
            html: updatedHtml
          }) + '\n'));

        } catch (streamErr: any) {
          console.error('[SiteChat stream handling error]:', streamErr);
          controllerStream.enqueue(textEncoder.encode(JSON.stringify({
            type: 'error',
            error: streamErr.message || 'Erro durante a transmissão.'
          }) + '\n'));
        } finally {
          controllerStream.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ error: err.message || 'Erro ao processar edição de site.' }, { status });
  }
}

