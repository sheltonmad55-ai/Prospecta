import { createHash } from 'node:crypto';
import { AppError } from './auth';
import type { SiteSourceData, SiteStyle } from '../lib/site-constants';
import { type SiteContent, renderSiteTemplate } from './site-template';
import {
  enforcePersistentRateLimit,
  getPersistentSiteCache,
  setPersistentSiteCache
} from './site-persistence';

interface GenerateSiteParams {
  userId: string;
  sourceData: SiteSourceData;
  images: string[];
  instructions?: string;
  isRegeneration?: boolean;
}

export interface SiteAIResult {
  content: SiteContent;
  html: string;
  missingFields: string[];
  cacheHit?: boolean;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

function getSiteAiConfig() {
  const primaryKey = process.env.SITE_AI_API_KEY || '';
  const backupKey = process.env.SITE_AI_API_KEY_2 || '';
  const model = process.env.SITE_AI_MODEL || 'gemini-flash-lite-latest';
  return { primaryKey, backupKey, model };
}

function computeInputHash(data: SiteSourceData, images: string[], instructions = ''): string {
  const raw = JSON.stringify({ data, images, instructions });
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Chama a API de IA com timeout, retentativa com chave de backup em caso de 429/quota,
 * e limite de tamanho da resposta.
 */
export async function callAiWithFallback(
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const { primaryKey, backupKey, model } = getSiteAiConfig();

  const candidateKeys = [
    { key: primaryKey, label: 'primary' },
    { key: backupKey, label: 'backup' }
  ].filter(c => Boolean(c.key));

  if (candidateKeys.length === 0) {
    throw new AppError(
      'O serviço de criação de sites por IA ainda não tem a chave configurada no servidor (SITE_AI_API_KEY). Nenhum crédito foi debitado.',
      503
    );
  }

  let lastError: Error | null = null;

  for (const { key, label } of candidateKeys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2500,
            responseMimeType: 'application/json'
          }
        })
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        console.warn(`[SiteAI ${label} key failed with HTTP ${res.status}]:`, errorBody);

        // Se for erro de quota (429) ou recurso sobrecarregado (503), tenta chave de reserva
        if (res.status === 429 || res.status === 503 || res.status === 403) {
          lastError = new AppError(`Quota excedida na chave de IA (${res.status}).`, res.status);
          continue; // tenta próxima chave
        }

        throw new AppError('Erro ao comunicar com o serviço de IA para gerar o site.', 502);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text || typeof text !== 'string') {
        throw new AppError('A IA devolveu uma resposta vazia ou incompleta.', 502);
      }

      const usage = data?.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0
      } : undefined;

      return { text, usage };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastError = new AppError('O tempo limite para gerar o site expirou. Tente novamente.', 504);
        continue;
      }
      lastError = err;
    }
  }

  if (lastError instanceof AppError) throw lastError;
  throw new AppError(
    'O serviço de IA está temporariamente indisponível. Por favor, tente novamente em alguns instantes (nenhum crédito foi debitado).',
    503
  );
}

/**
 * Identifica campos essenciais ausentes para exibir ao utilizador
 */
export function detectMissingFields(source: SiteSourceData): string[] {
  const missing: string[] = [];
  if (!source.businessName || source.businessName.trim().length < 2) missing.push('Nome da empresa');
  if (!source.phone || source.phone.trim().length < 8) missing.push('Telefone / WhatsApp');
  if (!source.address || source.address.trim().length < 3) missing.push('Endereço ou Localização');
  if (!source.services || source.services.trim().length < 5) missing.push('Lista de serviços ou especialidades');
  if (!source.openingHours || source.openingHours.trim().length < 3) missing.push('Horário de funcionamento');
  return missing;
}

export async function generateSiteHtml(params: GenerateSiteParams): Promise<SiteAIResult> {
  const { userId, sourceData, images, instructions = '', isRegeneration = false } = params;

  // 1. Limite persistente de pedidos por utilizador no Supabase (5 gerações por hora)
  await enforcePersistentRateLimit(userId, 5, 60 * 60 * 1000);

  // 2. Cache persistente de pedidos idênticos (apenas para nova geração sem instruções)
  const inputHash = computeInputHash(sourceData, images, instructions);
  if (!isRegeneration) {
    const cached = await getPersistentSiteCache(inputHash, userId);
    if (cached) {
      return {
        content: cached.content,
        html: cached.html,
        missingFields: detectMissingFields(sourceData),
        cacheHit: true
      };
    }
  }

  // Detecta dados faltantes
  const missingFields = detectMissingFields(sourceData);

  // Normaliza telefone moçambicano
  const cleanPhone = (sourceData.phone || '').replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('258') ? cleanPhone : cleanPhone.length === 9 ? `258${cleanPhone}` : cleanPhone;

  // Estilo visual e cores
  const style = (sourceData.style as SiteStyle) || 'moderno';
  const primaryColor = sourceData.primaryColor && sourceData.primaryColor.startsWith('#') ? sourceData.primaryColor : '#0284C7';

  // 3. Prompt do Sistema rigoroso para gerar Conteúdo em JSON
  const systemInstruction = `Você é um diretor de arte e redator de classe mundial focado em websites mobile-first para negócios locais em Moçambique e CPLP.
OBJETIVO: Gerar um JSON estruturado com o conteúdo exato, elegante e persuasivo para um website de página única.

REGRAS ABSOLUTAS:
1. USE ESTRITAMENTE OS DADOS FORNECIDOS PELO UTILIZADOR.
2. NUNCA invente preços, serviços não citados, certificações falsas ou números inventados.
3. Se um dado essencial faltar, preencha com "[COMPLETAR: indicação do que falta]".
4. AVALIAÇÕES: Inclua no array "reviews" SOMENTE avaliações reais fornecidas no texto. Se nenhuma foi fornecida, devolva um array vazio [].
5. IDIOMA: Português formal e acolhedor adaptado ao contexto de Moçambique.
6. DEVOLVA EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO no seguinte formato:
{
  "businessName": "Nome da empresa",
  "tagline": "Frase curta de posicionamento (ex: Excelência e Cuidado Dentário na Matola)",
  "heroHeadline": "Título de grande impacto para o hero",
  "heroSubheadline": "Subtítulo claro explicando o valor e chamada de ação",
  "aboutText": "Breve parágrafo de apresentação da empresa",
  "services": [
    { "title": "Nome do Serviço", "description": "Descrição clara do serviço", "icon": "shield|heart|sparkles|clock|star" }
  ],
  "address": "Endereço físico",
  "openingHours": "Horário de atendimento",
  "phone": "Telefone de contacto",
  "whatsappNumber": "${waPhone}",
  "whatsappMessage": "Mensagem pré-preenchida para o WhatsApp",
  "style": "${style}",
  "primaryColor": "${primaryColor}",
  "reviews": []
}`;

  const userPrompt = `DADOS REAIS DA EMPRESA:
- Nome: ${sourceData.businessName || '[COMPLETAR: Nome da Empresa]'}
- Nicho: ${sourceData.niche || 'Geral'}
- Telefone: ${sourceData.phone || '[COMPLETAR: Telefone]'}
- Endereço: ${sourceData.address || '[COMPLETAR: Endereço]'}
- Horário: ${sourceData.openingHours || '[COMPLETAR: Horário]'}
- Serviços: ${sourceData.services || '[COMPLETAR: Serviços]'}
- Estilo: ${style}
- Cor Primária: ${primaryColor}
- Link Social de Apoio: ${sourceData.socialLink || 'Nenhum'}
- Texto Bruto do Perfil:
"""
${sourceData.rawProfileText || 'Nenhum texto bruto fornecido.'}
"""
- Avaliações Fornecidas: ${sourceData.reviews && sourceData.reviews.length > 0 ? JSON.stringify(sourceData.reviews) : 'Nenhuma avaliação fornecida.'}
- Imagens Carregadas: ${images && images.length > 0 ? JSON.stringify(images) : 'Nenhuma imagem.'}
${instructions ? `\nINSTRUÇÕES DE AJUSTE / REGENERAÇÃO:\n"${instructions}"\n` : ''}

Gere o JSON estruturado agora:`;

  const { text: rawJson, usage } = await callAiWithFallback(userPrompt, systemInstruction);

  let parsedContent: Partial<SiteContent> = {};
  try {
    const cleanJson = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsedContent = JSON.parse(cleanJson);
  } catch {
    // Fallback defensivo se o modelo retornar formato imperfeito
    parsedContent = {
      businessName: sourceData.businessName,
      tagline: `${sourceData.businessName} - Qualidade e Confiança`,
      heroHeadline: sourceData.businessName,
      heroSubheadline: sourceData.services || 'Conheça os nossos serviços especializados.',
      aboutText: sourceData.rawProfileText || '',
      services: (sourceData.services || '').split(/,|\n/).map(s => ({
        title: s.trim(),
        description: 'Serviço profissional com garantia de qualidade.',
        icon: 'star'
      })).filter(s => s.title.length > 0)
    };
  }

  const finalContent: SiteContent = {
    businessName: parsedContent.businessName || sourceData.businessName || 'Empresa',
    tagline: parsedContent.tagline || 'Excelência e Dedicação',
    heroHeadline: parsedContent.heroHeadline || sourceData.businessName || 'Bem-vindo',
    heroSubheadline: parsedContent.heroSubheadline || 'Serviços especializados ao seu alcance.',
    aboutText: parsedContent.aboutText || sourceData.rawProfileText || '',
    services: Array.isArray(parsedContent.services) && parsedContent.services.length > 0
      ? parsedContent.services
      : [{ title: 'Atendimento Especializado', description: sourceData.services || 'Consulte-nos para mais detalhes.', icon: 'star' }],
    address: parsedContent.address || sourceData.address || '[COMPLETAR: Endereço]',
    openingHours: parsedContent.openingHours || sourceData.openingHours || '[COMPLETAR: Horário]',
    phone: parsedContent.phone || sourceData.phone || '+258 84 000 0000',
    whatsappNumber: waPhone,
    whatsappMessage: parsedContent.whatsappMessage || `Olá! Encontrei o website da ${sourceData.businessName} e gostaria de agendar um atendimento.`,
    style,
    primaryColor,
    images,
    reviews: Array.isArray(sourceData.reviews) && sourceData.reviews.length > 0
      ? sourceData.reviews.map((r, i) => typeof r === 'string' ? { author: `Cliente ${i + 1}`, rating: 5, comment: r } : { author: r.author || `Cliente ${i + 1}`, rating: r.rating || 5, comment: r.comment })
      : (Array.isArray(parsedContent.reviews) ? parsedContent.reviews : []),
    missingFields
  };

  // Renderiza via template determinístico, mobile-first, com CSS inline e sem JS
  const renderedHtml = renderSiteTemplate(finalContent, true);

  // Guarda em cache persistente
  await setPersistentSiteCache(inputHash, userId, finalContent, renderedHtml);

  return {
    content: finalContent,
    html: renderedHtml,
    missingFields,
    tokenUsage: usage
  };
}
