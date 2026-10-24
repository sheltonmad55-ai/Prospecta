/**
 * Normaliza números de telefone moçambicanos para o padrão internacional do WhatsApp (2588XXXXXXXX)
 * @param {string|number} rawPhone
 * @returns {string|null} Retorna o número normalizado ou null se for inválido
 */
export function normalizeMzPhone(rawPhone) {
  if (!rawPhone) return null;

  // 1. Remover tudo o que não seja dígito
  let phone = String(rawPhone).replace(/\D/g, '');

  // 2. Remover zeros à esquerda (ex: 084... -> 84...)
  phone = phone.replace(/^0+/, '');

  // 3. Se tiver 9 dígitos e começar por 8 (ex: 841234567, 82, 83, 85, 86, 87)
  if (phone.length === 9 && /^8[2-7]/.test(phone)) {
    phone = '258' + phone;
  }

  // 4. Se tiver 12 dígitos e começar por 2588 (ex: 258841234567)
  if (phone.length === 12 && /^2588[2-7]/.test(phone)) {
    return phone;
  }

  // 5. Suporte para outros números internacionais válidos (mínimo 10 dígitos)
  if (phone.length >= 10 && phone.length <= 15) {
    return phone;
  }

  return null;
}

/**
 * Converte o número normalizado para o JID do WhatsApp
 * @param {string} phone
 * @returns {string} ex: 258847404158@s.whatsapp.net
 */
export function toJid(phone) {
  const clean = normalizeMzPhone(phone);
  if (!clean) return null;
  return `${clean}@s.whatsapp.net`;
}

export const normalizeMozPhone = normalizeMzPhone;

