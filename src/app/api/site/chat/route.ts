import { NextResponse } from 'next/server';
import { requireActivePlan, supabaseAdmin, supabaseConfigured, AppError, credits } from '@/server/auth';
import { db, now } from '@/server/db';
import { consumeCreditsPersistent, refundCreditsPersistent } from '@/server/site-persistence';
import { renderSiteTemplateV3 } from '@/server/site-template-v3';
import {
  applyOperations,
  normalizeSiteModel,
  type SiteOperation
} from '@/server/site-operations';
import type { SiteContent } from '@/server/site-template';
import { SITE_CHAT_CREDIT_COST } from '@/lib/site-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSiteAiConfig() {
  const primaryKey = process.env.SITE_AI_API_KEY || '';
  const backupKey = process.env.SITE_AI_API_KEY_2 || '';
  const model = process.env.SITE_AI_MODEL_EDIT || process.env.SITE_AI_MODEL || 'gemini-flash-lite-latest';
  return { primaryKey, backupKey, model };
}

export async function POST(request: Request) {
  let creditDeducted = false;
  let activeUser: any = null;
  let activeSiteId = '';

  try {
    // Módulo temporariamente fora do ar para manutenção e atualização
    if (true as boolean) {
      return NextResponse.json({
        error: 'O Criador de Sites está temporariamente em manutenção e atualização. Estará disponível em breve.'
      }, { status: 503 });
    }

    const user = await requireActivePlan(request);
    activeUser = user;

    // Em produção, falha de forma estritamente fechada se a infraestrutura Supabase não estiver pronta
    if (process.env.NODE_ENV === 'production' && !supabaseConfigured()) {
      return NextResponse.json({
        error: 'Serviço de base de dados e créditos indisponível em ambiente de produção.'
      }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));

    const { siteId, message, currentContent } = body as {
      siteId: string;
      message: string;
      currentContent: any;
    };
    activeSiteId = siteId;

    if (!siteId || !message?.trim() || !currentContent) {
      return NextResponse.json({ error: 'Parâmetros incompletos para edição do site.' }, { status: 400 });
    }

    if (message.trim().length > 800) {
      return NextResponse.json({ error: 'Instrução demasiado extensa (máximo de 800 caracteres).' }, { status: 400 });
    }

    // 1. Verificação prévia de créditos em memória / perfil
    const currentCredits = credits(user.workspaceId);
    if (currentCredits.available < SITE_CHAT_CREDIT_COST) {
      return NextResponse.json({
        error: `Créditos insuficientes. Cada alteração assistida por IA requer ${SITE_CHAT_CREDIT_COST} crédito.`
      }, { status: 402 });
    }

    // 2. DEDUÇÃO ANTECIPADA DE CRÉDITOS (Padrão Bancário Fail-Closed)
    // Se a RPC falhar ou créditos forem insuficientes, falha imediatamente antes de chamar a IA
    await consumeCreditsPersistent(
      user,
      SITE_CHAT_CREDIT_COST,
      `Edição de site via IA: "${message.trim().slice(0, 50)}"`,
      siteId
    );
    creditDeducted = true;

    const { primaryKey, backupKey, model } = getSiteAiConfig();
    const candidateKeys = [
      { key: primaryKey, label: 'primary' },
      { key: backupKey, label: 'backup' }
    ].filter(c => Boolean(c.key));

    if (candidateKeys.length === 0) {
      if (creditDeducted) {
        await refundCreditsPersistent(user, SITE_CHAT_CREDIT_COST, 'Serviço de IA sem chave de API configurada', siteId).catch(() => {});
        creditDeducted = false;
      }
      return NextResponse.json({
        error: 'Chave de API do serviço de IA não configurada no servidor.'
      }, { status: 503 });
    }

    const normalizedCurrent = normalizeSiteModel(currentContent);

    const systemInstruction = `Você é o motor de edição de websites da Prospecta.
O seu papel é traduzir instruções em linguagem natural em uma lista estruturada de operações atómicas sobre o JSON do site.

OPERAÇÕES SUPORTADAS (SCHEMA):
1. { "op": "set", "path": "global.showCallButton", "value": true | false } -> mostra ou esconde botão de chamada
2. { "op": "set", "path": "global.showHeaderWa", "value": true | false } -> mostra ou esconde botão do WhatsApp no topo
3. { "op": "set", "path": "global.showHeroWa", "value": true | false } -> mostra ou esconde botão do WhatsApp no hero
4. { "op": "set", "path": "global.showStickyBar", "value": true | false } -> mostra ou esconde a barra fixa inferior
5. { "op": "set", "path": "phone", "value": "+258 84 111 2222" } -> altera o telefone e sincroniza todos os botões e links wa.me
6. { "op": "set", "path": "businessName", "value": "Novo Nome" } -> altera nome da empresa
7. { "op": "set_typography", "typographyId": "classica" | "moderna" | "elegante" | "tecnica" | "redonda" } -> altera SOMENTE as fontes sem mexer em cores nem no tema!
8. { "op": "set", "path": "themeId", "value": "odontoart-champagne" | "prodente-navy-cyan" | "yessir-green-gold" | "vitalmed-blue" | "dentalhome-royal" | "dentalcare-emerald" | "moderno-escuro" }
9. { "op": "set_style", "target": "hero", "styles": { "bg": "#064E3B", "textColor": "#FFFFFF" } } -> altera cores/estilo
10. { "op": "set_style", "target": "services", "styles": { "cardSize": "large" } } -> aumenta o tamanho dos cartões
11. { "op": "move_section", "id": "reviews", "toIndex": 3 } -> reordena secções
12. { "op": "duplicate_section", "id": "services", "newTitle": "Pacotes" } -> duplica secção
13. { "op": "remove_section", "id": "location" } ou { "op": "set", "path": "global.showMap", "value": false } -> esconde mapa
14. { "op": "ask_clarification", "question": "...", "options": [...] } -> se o pedido for ambíguo
15. { "op": "need_custom_block", "reason": "...", "proposal": "..." } -> se o pedido requerer componente inexistente

REGRAS RÍGIDAS DE NEGÓCIO E SEGURANÇA:
1. MUDANÇA DE FONTE / TIPOGRAFIA:
   - Se o utilizador pedir para mudar, trocar ou ajustar a fonte ou tipografia (ex: "muda só a fonte para uma mais moderna", "troca a fonte para clássica", "estilo de letra redondo"), use ESTRITAMENTE a operação "set_typography" com o id correspondente ('classica', 'moderna', 'elegante', 'tecnica', 'redonda').
   - NUNCA mude o themeId quando o utilizador pede apenas para trocar a fonte! O themeId só deve ser mudado se o pedido mencionar expressamente "tema", "paleta de cores" ou "estilo visual geral".
2. BOTÕES ESPECÍFICOS DE WHATSAPP E CHAMADA:
   - "volta a pôr o botão de chamada": { "op": "set", "path": "global.showCallButton", "value": true }
   - "remove o botão de WhatsApp do cabeçalho mas mantém o do hero": { "op": "set", "path": "global.showHeaderWa", "value": false }
   - "remove o botão" (sem dizer qual): AMBIGUIDADE! Devolva clarification_needed: true e a operação "ask_clarification" perguntando qual dos botões deseja remover (botão de chamada, WhatsApp do cabeçalho, WhatsApp do hero ou barra fixa).
3. ALTERAÇÃO DE TELEFONE:
   - Se pedir para mudar o telefone (ex: "muda o telefone para +258 84 111 2222"), use { "op": "set", "path": "phone", "value": "+258 84 111 2222" }. O motor sincronizará todos os links tel: e wa.me automaticamente.
4. RECUSA DE CONFIRMAÇÃO DE DADOS DE EXEMPLO VIA CHAT:
   - Se o utilizador pedir para confirmar que o telefone/dados são reais, marcar número como confirmado, ou remover as marcas de exemplo, NUNCA altere marcas de exemplo nem gere operações. Devolva operations: [] e no campo explanation responda: "Para garantir a veracidade dos dados, as marcas de exemplo só podem ser confirmadas diretamente no painel de Elementos & Secções clicando no botão \"Confirmar que é verdade\"."
5. NUNCA INVENTAR TESTEMUNHOS:
   - Se pedir para inventar depoimentos ou avaliações falsas, recuse educadamente devolvendo operations: [] e solicitando que o utilizador forneça avaliações reais de clientes.

FORMATO DE RESPOSTA (ESTRITAMENTE JSON):
{
  "explanation": "Resumo curto em português do que foi feito ou pergunta de esclarecimento",
  "clarification_needed": false,
  "clarification_question": "",
  "clarification_options": [],
  "operations": [
    { "op": "...", ... }
  ],
  "sections_changed": ["hero", "services", etc.]
}`;

    const userPrompt = `ESTADO ATUAL DO SITE (JSON):
${JSON.stringify({
  businessName: normalizedCurrent.businessName,
  themeId: normalizedCurrent.themeId,
  customTypography: normalizedCurrent.customTypography || 'padrao',
  global: normalizedCurrent.global,
  sectionsOrder: normalizedCurrent.sectionsOrder,
  sections: Object.keys(normalizedCurrent.sections || {}).reduce((acc: any, k) => {
    acc[k] = {
      id: normalizedCurrent.sections[k].id,
      title: normalizedCurrent.sections[k].title,
      visible: normalizedCurrent.sections[k].visible,
      styleOverrides: normalizedCurrent.sections[k].styleOverrides
    };
    return acc;
  }, {})
}, null, 2)}

PEDIDO DO UTILIZADOR:
"""
${message.trim()}
"""

Retorne o JSON de operações agora:`;

    // Usar streaming via Server-Sent Events / ndjson
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
          temperature: 0.1,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json'
        }
      })
    });

    clearTimeout(timeoutId);

    // Fallback de chaves se a primeira estiver esgotada
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
            temperature: 0.1,
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
      // Reembolsa créditos antes de sair
      if (creditDeducted) {
        await refundCreditsPersistent(user, SITE_CHAT_CREDIT_COST, 'Falha no serviço de IA (status ' + geminiRes.status + ')', siteId).catch(() => {});
        creditDeducted = false;
      }
      return NextResponse.json({ error: 'O serviço de IA está temporariamente ocupado. Tente novamente em instantes.' }, { status: 502 });
    }

    const reader = geminiRes.body?.getReader();
    if (!reader) {
      if (creditDeducted) {
        await refundCreditsPersistent(user, SITE_CHAT_CREDIT_COST, 'Stream da IA indisponível', siteId).catch(() => {});
        creditDeducted = false;
      }
      return NextResponse.json({ error: 'Stream indisponível.' }, { status: 502 });
    }

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    const activeReader = reader!;

    const stream = new ReadableStream({
      async start(controllerStream) {
        let buffer = '';
        let accumulatedRaw = '';

        try {
          while (true) {
            const { done, value } = await activeReader.read();
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
                  controllerStream.enqueue(textEncoder.encode(JSON.stringify({ type: 'chunk', text: chunkText }) + '\n'));
                }
              } catch {
                // Ignore parse errors on partial stream lines
              }
            }
          }

          // Parse final do JSON acumulado
          let cleanJson = accumulatedRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
          let parsedData: {
            explanation?: string;
            clarification_needed?: boolean;
            clarification_question?: string;
            clarification_options?: string[];
            operations?: SiteOperation[];
            sections_changed?: string[];
          } = {};

          try {
            parsedData = JSON.parse(cleanJson);
          } catch (jsonErr) {
            console.error('[SiteChat JSON parse error]:', jsonErr, cleanJson.slice(0, 150));
            // Reembolsa créditos pois o retorno foi inválido
            if (creditDeducted) {
              await refundCreditsPersistent(user, SITE_CHAT_CREDIT_COST, 'Resposta com formato inválido da IA', siteId).catch(() => {});
              creditDeducted = false;
            }
            controllerStream.enqueue(textEncoder.encode(JSON.stringify({
              type: 'error',
              error: 'A IA concluiu a resposta mas o formato necessita de ajuste. O seu crédito foi reembolsado. Tente uma instrução mais específica.'
            }) + '\n'));
            controllerStream.close();
            return;
          }

          // 2. Tratar Casos de Ambiguidade ou Recusa
          const operations = Array.isArray(parsedData.operations) ? parsedData.operations : [];

          if (
            parsedData.clarification_needed ||
            (operations.length === 1 && operations[0].op === 'ask_clarification')
          ) {
            // Reembolsa créditos pois é apenas pedido de esclarecimento
            if (creditDeducted) {
              await refundCreditsPersistent(user, SITE_CHAT_CREDIT_COST, 'Pedido de esclarecimento (sem alterações)', siteId).catch(() => {});
              creditDeducted = false;
            }

            const question = parsedData.clarification_question || (operations[0] as any)?.question || 'Poderia esclarecer qual elemento deseja alterar?';
            const options = parsedData.clarification_options || (operations[0] as any)?.options || [];

            controllerStream.enqueue(textEncoder.encode(JSON.stringify({
              type: 'clarification',
              explanation: parsedData.explanation || question,
              question,
              options,
              content: normalizedCurrent,
              html: renderSiteTemplateV3(normalizedCurrent, true, true),
              credits_consumed: 0
            }) + '\n'));
            controllerStream.close();
            return;
          }

          // 3. Aplica operações ao modelo do site com validação estrita
          const opResult = applyOperations(normalizedCurrent, operations);
          const updatedContent = opResult.updatedContent;
          const updatedHtml = renderSiteTemplateV3(updatedContent, true, true);
          const timestamp = now();

          // 4. Se não houve operações aplicadas ou todas foram rejeitadas por segurança, reembolsa créditos
          if (operations.length === 0 || opResult.appliedCount === 0) {
            if (creditDeducted) {
              await refundCreditsPersistent(user, SITE_CHAT_CREDIT_COST, 'Nenhuma alteração permitida ou aplicada', siteId).catch(() => {});
              creditDeducted = false;
            }

            controllerStream.enqueue(textEncoder.encode(JSON.stringify({
              type: 'done',
              explanation: parsedData.explanation || opResult.errors.join(' ') || 'Nenhuma alteração efetuada.',
              sections_changed: [],
              content: updatedContent,
              html: updatedHtml,
              credits_consumed: 0,
              errors: opResult.errors
            }) + '\n'));
            controllerStream.close();
            return;
          }

          // 5. Persistir no Supabase e SQLite
          let historySaved = true;
          let historyWarning: string | null = null;

          if (supabaseConfigured()) {
            try {
              const client = supabaseAdmin();
              if (client) {
                await client.from('generated_sites').update({
                  content: updatedContent,
                  html: updatedHtml,
                  placeholders_pending: (updatedContent as any)?.placeholders_pending ?? ((updatedContent as any)?.hasExampleData ? 1 : 0),
                  updated_at: timestamp
                }).eq('id', siteId).eq('user_id', user.id);

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

                // Gravar no histórico de mensagens com logging estrito de falhas
                try {
                  const { error: msgErr } = await client.from('site_messages').insert([
                    {
                      site_id: siteId,
                      user_id: user.id,
                      role: 'user',
                      content: message.trim()
                    },
                    {
                      site_id: siteId,
                      user_id: user.id,
                      role: 'assistant',
                      content: parsedData.explanation || 'Alteração efetuada com sucesso.',
                      sections_changed: parsedData.sections_changed || [],
                      credits_consumed: SITE_CHAT_CREDIT_COST
                    }
                  ]);

                  if (msgErr) {
                    console.error('[SiteMessages Error]: Código:', msgErr.code, 'Mensagem:', msgErr.message);
                    historySaved = false;
                    historyWarning = 'A tabela site_messages ainda não está provisionada no banco de dados. Histórico salvo apenas em sessão.';
                  }
                } catch (msgEx: any) {
                  console.error('[SiteMessages Exception]:', msgEx?.code || msgEx?.message);
                  historySaved = false;
                  historyWarning = 'Falha ao persistir histórico no banco de dados.';
                }
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

          // Enviar payload final de sucesso com operações aplicadas e flags de histórico
          controllerStream.enqueue(textEncoder.encode(JSON.stringify({
            type: 'done',
            explanation: parsedData.explanation || 'Website atualizado com sucesso.',
            operations: parsedData.operations || [],
            sections_changed: parsedData.sections_changed || [],
            content: updatedContent,
            html: updatedHtml,
            credits_consumed: SITE_CHAT_CREDIT_COST,
            history_saved: historySaved,
            history_warning: historyWarning,
            applied_count: opResult.appliedCount,
            errors: opResult.errors
          }) + '\n'));

        } catch (streamErr: any) {
          console.error('[SiteChat stream handling error]:', streamErr);
          if (creditDeducted) {
            await refundCreditsPersistent(user, SITE_CHAT_CREDIT_COST, 'Erro durante o streaming da resposta', siteId).catch(() => {});
            creditDeducted = false;
          }
          controllerStream.enqueue(textEncoder.encode(JSON.stringify({
            type: 'error',
            error: streamErr.message || 'Erro durante a transmissão. O seu crédito foi reembolsado.'
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
    if (creditDeducted && activeUser) {
      await refundCreditsPersistent(activeUser, SITE_CHAT_CREDIT_COST, 'Erro de processamento', activeSiteId).catch(() => {});
    }
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ error: err.message || 'Erro ao processar edição de site.' }, { status });
  }
}


