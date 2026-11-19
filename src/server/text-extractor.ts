/**
 * Utilitário server-side para extração heurística de dados de empresas a partir de texto livre.
 * Extrai telefone (+258, 84, 82, etc.), endereço/bairro, horários e lista de serviços.
 */

export interface ExtractedBusinessDetails {
  phone?: string;
  address?: string;
  openingHours?: string;
  services?: string;
}

export function extractDetailsFromText(rawText: string): ExtractedBusinessDetails {
  if (!rawText || typeof rawText !== 'string') return {};

  const clean = rawText.trim();
  const result: ExtractedBusinessDetails = {};

  // 1. Extração de Telefone (+258 8X XXX XXXX ou 8X XXX XXXX)
  const phoneRegex = /(?:\+?258\s*)?(?:8[2-7]\d{7}|8[2-7]\s*\d{3}\s*\d{4}|2[1-8]\s*\d{6,7})/g;
  const phoneMatch = clean.match(phoneRegex);
  if (phoneMatch && phoneMatch.length > 0) {
    const rawDigits = phoneMatch[0].replace(/\D/g, '');
    if (rawDigits.startsWith('258')) {
      result.phone = `+258 ${rawDigits.slice(3, 5)} ${rawDigits.slice(5, 8)} ${rawDigits.slice(8)}`;
    } else if (rawDigits.length === 9) {
      result.phone = `+258 ${rawDigits.slice(0, 2)} ${rawDigits.slice(2, 5)} ${rawDigits.slice(5)}`;
    } else {
      result.phone = phoneMatch[0].trim();
    }
  }

  // 2. Extração de Horários (Seg-Sex, 08:00 - 18:00, etc.)
  const hoursRegex = /(?:seg|ter|qua|qui|sex|s[aá]b|dom|hor[aá]rio|atendimento|aberto)[\s\S]{0,35}?(?:\d{1,2}(?::\d{2}|h)?\s*(?:-|às|as|a)\s*\d{1,2}(?::\d{2}|h)?)/i;
  const hoursMatch = clean.match(hoursRegex);
  if (hoursMatch) {
    result.openingHours = hoursMatch[0].replace(/\s+/g, ' ').trim();
  }

  // 3. Extração de Endereço (Av., Rua, Bairro, Polana, Matola, etc.)
  const addressRegex = /(?:av\.|avenida|rua|bairro|estrada|praça|matola|maputo|polana|sommerschield|alto ma[eé]|malhangalene|triunfo|costa do sol)[\s\S]{0,60}?(?=[,\n\.]|$)/i;
  const addressMatch = clean.match(addressRegex);
  if (addressMatch) {
    result.address = addressMatch[0].replace(/\s+/g, ' ').trim();
  }

  // 4. Serviços (palavras-chave após "serviços:", "especialidades:" ou termos separados por vírgula)
  const servicesRegex = /(?:servi[çc]os|especialidades|oferecemos|card[aá]pio|tratamentos)[:\s]+([^.\n]+)/i;
  const servicesMatch = clean.match(servicesRegex);
  if (servicesMatch && servicesMatch[1]) {
    result.services = servicesMatch[1].trim();
  }

  return result;
}

