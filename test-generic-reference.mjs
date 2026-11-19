import { resolveReferenceSite } from './src/server/reference-resolver.ts';

async function testGenericReference() {
  console.log('--- Testando Extração de Referência Genérica ---');

  // Testar URL pública genérica (ex: wikipedia ou github ou w3)
  try {
    const data = await resolveReferenceSite('https://www.w3.org');
    console.log('[Resultado da Extração Genérica]:', JSON.stringify({
      url: data?.url,
      title: data?.title,
      colorHint: data?.colorHint,
      dominantColors: data?.dominantColors,
      sections: data?.sections,
      toneKeywords: data?.toneKeywords,
      competitorPhrases: data?.competitorPhrases?.slice(0, 2)
    }, null, 2));
  } catch (err) {
    console.warn('[Fallback test]:', err.message);
  }
}

testGenericReference();

