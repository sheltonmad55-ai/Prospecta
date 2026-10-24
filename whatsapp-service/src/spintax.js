/**
 * Processa blocos de spintax no formato {Opção A|Opção B|Opção C}
 * Suporta múltiplos blocos e variações em qualquer parte do texto.
 * @param {string} text
 * @returns {string}
 */
export function parseSpintax(text) {
  if (!text) return '';

  const spintaxRegex = /\{([^{}]+)\}/;
  let matches;

  // Processa de dentro para fora
  while ((matches = spintaxRegex.exec(text)) !== null) {
    const rawContent = matches[1];

    // Se contiver pipe (|), é um bloco spintax
    if (rawContent.includes('|')) {
      const choices = rawContent.split('|');
      const chosen = choices[Math.floor(Math.random() * choices.length)].trim();
      text = text.replace(matches[0], chosen);
    } else {
      // Se não contiver pipe, é uma tag ou variável; deixa para a substituição de variáveis
      // Para evitar loop infinito, substitui temporariamente os delimitadores se for variável
      text = text.replace(matches[0], `__VAR_${rawContent}__`);
    }
  }

  // Restaura as variáveis no formato {var}
  text = text.replace(/__VAR_([a-zA-Z0-9_-]+)__/g, '{$1}');

  return text;
}

/**
 * Substitui variáveis do tipo {nome}, {empresa}, {cidade}, etc. pelos valores reais.
 * @param {string} template
 * @param {Record<string, string>} vars
 * @returns {string}
 */
export function interpolateVariables(template, vars = {}) {
  if (!template) return '';

  let result = template;

  // Mapa de sinónimos comuns
  const normalizedVars = {
    nome: vars.nome || vars.name || vars.empresa || vars.nome_empresa || 'Empresa',
    empresa: vars.empresa || vars.nome_empresa || vars.name || vars.nome || 'Empresa',
    nome_empresa: vars.nome_empresa || vars.empresa || vars.name || vars.nome || 'Empresa',
    cidade: vars.cidade || vars.city || vars.localidade || 'Moçambique',
    localidade: vars.localidade || vars.cidade || vars.city || 'Moçambique',
    nicho: vars.nicho || vars.category || vars.ramo || 'negócio',
    servico: vars.servico || vars.service || 'automação e captação de clientes',
    responsavel: vars.responsavel || vars.agentName || 'Equipa Prospecta',
    ...vars,
  };

  for (const [key, val] of Object.entries(normalizedVars)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(regex, String(val || ''));
  }

  return result;
}

/**
 * Aplica spintax e depois interpola as variáveis fornecidas
 * @param {string} template
 * @param {Record<string, string>} vars
 * @returns {string}
 */
export function renderMessage(template, vars = {}) {
  const withSpintax = parseSpintax(template);
  return interpolateVariables(withSpintax, vars);
}
