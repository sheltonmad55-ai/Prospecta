import type { VaultScript } from '@/lib/contracts';
export type { VaultScript };

export const VAULT_SCRIPTS: VaultScript[] = [
  // ─── 1. PRIMEIRO CONTATO & ABORDAGEM INICIAL (FRIO) ───────────────────────
  {
    id: 'pc-01',
    category: 'primeiro-contato',
    categoryLabel: 'Primeiro Contato (Frio)',
    title: 'Primeiro Contato (Frio)',
    scenario: 'Abordagem padrão direta para WhatsApp ou DM de empresas locais.',
    keyPhrases: ['nunca mais deixarem clientes esperando', 'inteligência artificial', 'orçamentos 24h por dia', 'prometo ser breve'],
    template: `Olá, equipe do(a) {{empresa}}! Tudo bem?

Meu nome é {{nome}} e eu ajudo empresas no setor de vocês a automatizarem o atendimento no WhatsApp para nunca mais deixarem clientes esperando (e perderem vendas por demora).

Notei que vocês têm um volume legal de buscas em {{localidade}}, mas não sei se já usam inteligência artificial para responder orçamentos 24h por dia.

Faz sentido batermos um papo super rápido sobre como isso funciona? Prometo ser breve!`
  },
  {
    id: 'pc-02',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'Responder na mão = perder dinheiro',
    scenario: 'Para Reels, stories ou chamada direta no WhatsApp atacando a demora manual.',
    keyPhrases: ['respondes tudo na mão', 'tás a perder dinheiro', 'te explico'],
    template: `Se tu vendes pelo WhatsApp e ainda respondes tudo na mão, tás a perder dinheiro agora mesmo. Te explico.`
  },
  {
    id: 'pc-03',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'O problema não é o produto, é sumir',
    scenario: 'Para conteúdo ou abordagem mostrando que o silêncio após o 1º contato mata vendas.',
    keyPhrases: ['problema não é o produto', 'sumiste depois da primeira mensagem'],
    template: `Ninguém te conta isto: o problema do teu negócio não é o produto. É que tu sumiste depois da primeira mensagem do cliente.`
  },
  {
    id: 'pc-04',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'Fechei X vendas sem responder na mão',
    scenario: 'Prova de conceito em escala de automação.',
    keyPhrases: ['vendas sem responder', 'uma única mensagem manualmente'],
    template: `Eu fechei [X] vendas semana passada sem responder uma única mensagem manualmente. O segredo tá aqui.`
  },
  {
    id: 'pc-05',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'Para de gastar em tráfego (mostra a tela)',
    scenario: 'Alerta sobre desperdício de anúncios quando o WhatsApp não converte.',
    keyPhrases: ['para de gastar em tráfego', 'mostra a tela'],
    template: `Para de gastar dinheiro em tráfego se o teu WhatsApp tá assim ó. (mostra a tela)`
  },
  {
    id: 'pc-06',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'Negócio ou hobby caro?',
    scenario: 'Quebra de estado para empresários que não têm processos comerciais.',
    keyPhrases: ['negócio ou hobby caro', 'diferença é uma só'],
    template: `Tens um negócio ou tens um hobby caro? A diferença é uma só.`
  },
  {
    id: 'pc-07',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: '3 erros que afastam o cliente',
    scenario: 'Vídeo curto ou mensagem educativa de autoridade.',
    keyPhrases: ['3 erros', 'cliente fugir antes de comprar'],
    template: `3 erros que fazem o teu cliente fugir antes de comprar — o terceiro tu fazes todo dia.`
  },
  {
    id: 'pc-08',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: '"IA não é pra mim" — até hoje',
    scenario: 'Quebra de resistência tecnológica.',
    keyPhrases: ['IA não é pra mim', 'vendas enquanto eu durmo'],
    template: `Eu era o tipo de pessoa que dizia "IA não é pra mim". Hoje a IA fecha as minhas vendas enquanto eu durmo.`
  },
  {
    id: 'pc-09',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'Não precisas de seguidores, precisas de sistema',
    scenario: 'Desmistificar vaidade de redes sociais versus receita real.',
    keyPhrases: ['não precisas de seguidores', 'precisas de um sistema'],
    template: `Não precisas de mais seguidores. Precisas de um sistema. Olha a diferença. (comparativo na tela)`
  },
  {
    id: 'pc-10',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'Se eu começasse do zero hoje em Moçambique',
    scenario: 'Gatilho de identificação imediata no mercado moçambicano.',
    keyPhrases: ['começar do zero', 'em Moçambique', 'sem dinheiro'],
    template: `Se eu tivesse que começar do zero hoje, em Moçambique, sem dinheiro, faria exatamente isto.`
  },
  {
    id: 'pc-11',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: '"Olá, como posso ajudar?" queima venda',
    scenario: 'Critica aberturas burocráticas que afastam leads.',
    keyPhrases: ['como posso ajudar', 'queima venda'],
    template: `Para tudo. Se tu mandas "olá, como posso ajudar?" pro cliente, tás a queimar venda. Faz assim.`
  },
  {
    id: 'pc-12',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'O concorrente só responde mais rápido',
    scenario: 'Conscientização sobre velocidade de atendimento comercial.',
    keyPhrases: ['concorrente só responde mais rápido', 'resolver hoje'],
    template: `O teu concorrente não é melhor que tu. Ele só responde mais rápido. E isso dá pra resolver hoje.`
  },
  {
    id: 'pc-13',
    category: 'primeiro-contato',
    categoryLabel: 'Hooks e Vídeo Curto',
    title: 'Testei 30 dias por ti',
    scenario: 'Review prático de metodologia ou automação comercial.',
    keyPhrases: ['testei 30 dias', 'resultado no fim do vídeo'],
    template: `Eu testei [ferramenta/método] por 30 dias pra ti não perderes tempo. Resultado no fim do vídeo.`
  },
  {
    id: 'pc-14',
    category: 'primeiro-contato',
    categoryLabel: 'Aberturas de Carrossel',
    title: 'Por que o teu WhatsApp não vende',
    scenario: 'Carrossel educativo para posts de Instagram e LinkedIn.',
    keyPhrases: ['por que o teu WhatsApp não vende', 'não é o preço'],
    template: `Slide 1: "Por que o teu WhatsApp não vende (mesmo com gente a falar contigo)"
Slide 2: "Não é o preço. Não é o produto. É isto 👇"`
  },
  {
    id: 'pc-15',
    category: 'primeiro-contato',
    categoryLabel: 'Aberturas de Carrossel',
    title: '5 mensagens que fazem comprar na hora',
    scenario: 'Carrossel para gerar leads directos no WhatsApp.',
    keyPhrases: ['5 mensagens', 'comprar na hora', 'manda QUERO'],
    template: `Slide 1: "5 mensagens que fazem o cliente comprar na hora"
Slide final: "Quer o roteiro completo? Manda 'QUERO' no WhatsApp [link]"`
  },
  {
    id: 'pc-16',
    category: 'primeiro-contato',
    categoryLabel: 'Aberturas de Carrossel',
    title: 'Ganhava 0, hoje pago as contas',
    scenario: 'Storytelling de transformação de renda.',
    keyPhrases: ['ganhava 0', 'hoje pago as contas'],
    template: `Slide 1: "Eu ganhava 0 com isto. Hoje pago as minhas contas. O que mudou:"
Slide 2: "Parei de fazer 3 coisas e comecei a fazer 1."`
  },
  {
    id: 'pc-17',
    category: 'primeiro-contato',
    categoryLabel: 'Aberturas de Carrossel',
    title: 'Negócio digital em Moçambique: o que ninguém diz',
    scenario: 'Conteúdo de choque de realidade para empreendedores moçambicanos.',
    keyPhrases: ['Moçambique', 'o que ninguém te diz', 'precisas do certo'],
    template: `Slide 1: "Negócio digital em Moçambique: o que ninguém te diz"
Slide 2: "A verdade é que tu não precisas de muito. Precisas do certo."`
  },
  {
    id: 'pc-18',
    category: 'primeiro-contato',
    categoryLabel: 'Aberturas de Carrossel',
    title: 'Se tens N anos e não começaste',
    scenario: 'Urgência geracional para quem procrastina iniciar.',
    keyPhrases: ['melhor momento foi ontem', 'segundo melhor é agora'],
    template: `Slide 1: "Se tu tens [N] anos e ainda não começaste, lê isto."
Slide 2: "O melhor momento foi ontem. O segundo melhor é agora."`
  },
  {
    id: 'pc-19',
    category: 'primeiro-contato',
    categoryLabel: 'Aberturas de Carrossel',
    title: 'IA como segundo salário',
    scenario: 'Para prestadores de serviços e profissionais liberais.',
    keyPhrases: ['IA como segundo salário', 'depois do jantar'],
    template: `Slide 1: "Como a IA pode te dar um segundo salário (sem demitir do teu emprego)"
Slide 2: "Passo 1 começa hoje à noite, depois do jantar."`
  },
  {
    id: 'pc-20',
    category: 'primeiro-contato',
    categoryLabel: 'Aberturas de Carrossel',
    title: 'O erro de [valor] que todo iniciante comete',
    scenario: 'Evitar prejuízo financeiro em Meticais (MT).',
    keyPhrases: ['erro de valor em MT', 'iniciante comete'],
    template: `Slide 1: "O erro de [valor em MT] que quase todo iniciante comete"
Slide 2: "Eu cometi. Tu não precisas."`
  },
  {
    id: 'pc-21',
    category: 'primeiro-contato',
    categoryLabel: 'Aberturas de Carrossel',
    title: 'Salva este post pra quando começares',
    scenario: 'Post salvável com roteiro passo a passo.',
    keyPhrases: ['salva este post', 'passo a passo'],
    template: `Slide 1: "Salva este post. Tu vais precisar dele quando começares."
Slide 2: "Aqui está o passo a passo que eu queria ter tido."`
  },
  {
    id: 'pc-22',
    category: 'primeiro-contato',
    categoryLabel: 'Captação pro WhatsApp',
    title: "Comenta 'EU QUERO'",
    scenario: 'CTA clássica de engajamento social para automação de direct/WhatsApp.',
    keyPhrases: ['comenta EU QUERO', 'passo a passo gratuito'],
    template: `Comenta "EU QUERO" que eu te mando no privado o passo a passo gratuito.`
  },
  {
    id: 'pc-23',
    category: 'primeiro-contato',
    categoryLabel: 'Captação pro WhatsApp',
    title: "Manda 'CÓDIGO' no WhatsApp",
    scenario: 'Migração direta da audiência do vídeo para o canal do WhatsApp.',
    keyPhrases: ['manda CÓDIGO', 'no meu WhatsApp'],
    template: `Não vou explicar tudo aqui senão o vídeo fica enorme. Manda "CÓDIGO" no meu WhatsApp [link] que eu te envio.`
  },
  {
    id: 'pc-24',
    category: 'primeiro-contato',
    categoryLabel: 'Captação pro WhatsApp',
    title: 'Material grátis (link na bio)',
    scenario: 'Direcionamento com material de apoio.',
    keyPhrases: ['material grátis', 'link na bio', 'falar comigo'],
    template: `Tenho um material que mostra isto na prática. É de graça. Link na bio → toca em "falar comigo".`
  },
  {
    id: 'pc-25',
    category: 'primeiro-contato',
    categoryLabel: 'Captação pro WhatsApp',
    title: 'Manda um 🔥 no WhatsApp',
    scenario: 'Micro-compromisso lúdico para iniciar conversa.',
    keyPhrases: ['manda um emoji de fogo', 'continuo a conversa'],
    template: `Se isto fez sentido pra ti, manda só um "🔥" no meu WhatsApp. Aí eu sei que és tu e continuo a conversa.`
  },
  {
    id: 'pc-26',
    category: 'primeiro-contato',
    categoryLabel: 'Captação pro WhatsApp',
    title: "Escreve 'ROTEIRO' nos comentários",
    scenario: 'Engajamento por comentários para entrega no direct.',
    keyPhrases: ['escreve ROTEIRO', 'mando hoje ainda'],
    template: `Quem quer o roteiro completo levanta a mão aqui nos comentários (escreve "ROTEIRO"). Mando hoje ainda.`
  },
  {
    id: 'pc-27',
    category: 'primeiro-contato',
    categoryLabel: 'Captação pro WhatsApp',
    title: 'Não é pra todos',
    scenario: 'Filtro de exclusividade e qualificação.',
    keyPhrases: ['não é pra todos', 'sem compromisso'],
    template: `Não é pra todos. Mas se tu sentiste que isto é pra ti, fala comigo aqui 👉 [link]. Sem compromisso.`
  },

  // ─── 2. EMPRESAS SEM SITE ─────────────────────────────────────────────────
  {
    id: 'ss-01',
    category: 'sem-site',
    categoryLabel: 'Empresas Sem Site',
    title: 'Abordagem para Empresas Sem Site (Google Maps)',
    scenario: 'Para empresas encontradas no Google Maps que têm telefone/avaliações mas não possuem website.',
    keyPhrases: ['Google Maps', 'ainda não têm um website próprio', 'Landing Page em menos de 48h', 'rascunho sem compromisso'],
    template: `Olá, pessoal do(a) {{empresa}}! Como estão?

Eu estava pesquisando sobre serviços na região e encontrei vocês no Google Maps. Vi que o perfil está super bem avaliado em {{localidade}}, mas notei que vocês ainda não têm um website próprio, o que faz muita gente desistir de entrar em contato.

Eu sou especialista em criar estruturas digitais de alta conversão. Em menos de 48h, consigo colocar uma Landing Page no ar para o(a) {{empresa}} que vai dobrar a quantidade de pessoas que clicam para o WhatsApp de vocês.

Gostariam de ver um rascunho sem compromisso de como ficaria a vossa página?`
  },
  {
    id: 'ss-02',
    category: 'sem-site',
    categoryLabel: 'Empresas Sem Site',
    title: 'Perda de clientes que buscam no Google',
    scenario: 'Abordagem mostrando que a falta de página transmite menos credibilidade para quem não conhece a empresa.',
    keyPhrases: ['sem página oficial', 'clientes procuram no Google', 'credibilidade imediata'],
    template: `Olá, equipa do(a) {{empresa}}! Encontrei vocês nas pesquisas em {{localidade}} e notei que os clientes encontram o vosso telefone mas não têm onde ver fotos, preços ou depoimentos num site próprio. Já pensaram em ter uma página rápida optimizada para telemóvel que direcciona directo pro vosso WhatsApp? Posso mostrar como ficaria sem qualquer compromisso!`
  },

  // ─── 3. QUALIFICAÇÃO & QUEBRA-GELO ────────────────────────────────────────
  {
    id: 'qg-01',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Comentou no vídeo — entrega prometida',
    scenario: 'Para abordar leads que interagiram no feed ou reels.',
    keyPhrases: ['comentaste no meu vídeo', 'aquilo que prometi'],
    template: `Fala [NOME]! Vi que tu comentaste no meu vídeo sobre [tema]. Posso te mandar aquilo que prometi?`
  },
  {
    id: 'qg-02',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Entender antes de enviar',
    scenario: 'Evitar envio cego de material sem entender a intenção real.',
    keyPhrases: ['entender melhor antes de te enviar', 'o que te fez parar'],
    template: `Oi [NOME], tudo bem? Tu chegaste por causa do conteúdo sobre [tema], certo? Quero te entender melhor antes de te enviar qualquer coisa — o que te fez parar pra ver?`
  },
  {
    id: 'qg-03',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Já tens negócio ou começando?',
    scenario: 'Segmentação primária entre quem já opera ou está no zero.',
    keyPhrases: ['negócio rodando', 'começar agora'],
    template: `[NOME], obrigado por chamar 🙏 Antes de te explicar, me diz uma coisa rápida: tu já tens um negócio rodando ou tás a começar agora?`
  },
  {
    id: 'qg-04',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Qual a tua maior dificuldade?',
    scenario: 'Descobrir a dor central antes de sugerir soluções genéricas.',
    keyPhrases: ['não te enviar coisa genérica', 'maior dificuldade'],
    template: `Boa [NOME]! Recebi a tua mensagem. Pra eu não te enviar coisa genérica — qual é hoje a tua maior dificuldade com [tema]?`
  },
  {
    id: 'qg-05',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Direto: não quero te empurrar nada',
    scenario: 'Postura consultiva desarmante para clientes céticos.',
    keyPhrases: ['não quero te empurrar nada', 'saber se faz sentido'],
    template: `Fala [NOME]! Vou ser direto: não quero te empurrar nada. Quero primeiro saber se faz sentido pra ti. Me conta um pouco da tua situação?`
  },
  {
    id: 'qg-06',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Vi teu perfil — pode encaixar',
    scenario: 'Abordagem personalizada após analisar nicho do lead.',
    keyPhrases: ['vi teu perfil', 'encaixar bem no que tu fazes'],
    template: `[NOME], vi teu perfil rapidinho. Tu trabalhas com [área], né? Tenho uma coisa que pode encaixar bem no que tu fazes. Posso te mostrar?`
  },
  {
    id: 'qg-07',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Pediu o material — tá aqui',
    scenario: 'Entrega imediata com pergunta aberta de feedback.',
    keyPhrases: ['pediste o material', 'o que achaste'],
    template: `Olá [NOME] 👋 Tu pediste o material no meu post. Tá aqui ó: [link/arquivo]. Dá uma olhada e me diz o que achaste, beleza?`
  },
  {
    id: 'qg-08',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Notei que salvaste vários posts',
    scenario: 'Abordagem para seguidores quentes.',
    keyPhrases: ['salvaste vários posts', 'tentaste resolver isso antes'],
    template: `[NOME], notei que tu salvaste / curtiste vários posts sobre [tema]. Curiosidade minha: tu já tentaste resolver isso de alguma forma antes?`
  },
  {
    id: 'qg-09',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Já te mandei no privado',
    scenario: 'Aviso nos comentários para conduzir ao DM.',
    keyPhrases: ['já te mandei no privado', 'dá uma olhada lá'],
    template: `Vi teu comentário 👀 Já te mandei no privado, dá uma olhada lá!`
  },
  {
    id: 'qg-10',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Te explico melhor no WhatsApp',
    scenario: 'Ponte dos comentários para o WhatsApp do negócio.',
    keyPhrases: ['te explico no WhatsApp', 'eu detalho'],
    template: `Boa pergunta! Respondo rápido aqui mas o melhor mesmo eu te explico no WhatsApp — chama lá [link] que eu detalho.`
  },
  {
    id: 'qg-11',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Gostei da sinceridade',
    scenario: 'Responder com leveza a dúvidas ou objeções nos comentários.',
    keyPhrases: ['gostei da sinceridade', 'mais simples do que parece'],
    template: `Hahaha gostei da sinceridade. Olha, é mais simples do que parece. Posso te mostrar como?`
  },
  {
    id: 'qg-12',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'É exatamente o que eu resolvo',
    scenario: 'Validação da dor do lead.',
    keyPhrases: ['ponto que eu resolvo', 'passo a passo'],
    template: `Esse é exatamente o ponto que eu resolvo. Me manda "QUERO" aqui que eu te explico passo a passo.`
  },
  {
    id: 'qg-13',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Preciso entender teu caso',
    scenario: 'Direcionamento personalizado.',
    keyPhrases: ['entendi tua dúvida', 'chama no privado'],
    template: `Entendi tua dúvida. Pra te responder certinho preciso entender teu caso — me chama no privado rapidinho?`
  },
  {
    id: 'qg-14',
    category: 'qualificacao',
    categoryLabel: 'Quebra-gelo e Comentários',
    title: 'Não estás sozinho nisso',
    scenario: 'Acolhimento de frustração comum de empreendedores.',
    keyPhrases: ['não estás sozinho nisso', 'tem solução'],
    template: `Tu não estás sozinho nisso, muita gente sente o mesmo. E tem solução. Bora conversar?`
  },
  {
    id: 'ql-01',
    category: 'qualificacao',
    categoryLabel: 'Perguntas de Qualificação',
    title: 'Já vendes algo ou começando do zero?',
    scenario: 'Saber a maturidade do prospecto para dimensionar a oferta certa.',
    keyPhrases: ['vendes alguma coisa hoje', 'começando do zero'],
    template: `Pra eu te ajudar de verdade e não te enrolar: tu já vendes alguma coisa hoje, mesmo que pouco, ou tás a começar do zero?`
  },
  {
    id: 'ql-02',
    category: 'qualificacao',
    categoryLabel: 'Perguntas de Qualificação',
    title: 'O que te impede hoje?',
    scenario: 'Identificar se o gargalo é tempo, verba ou método.',
    keyPhrases: ['o que te impede hoje', 'tempo, conhecimento ou onde começar'],
    template: `Me diz com sinceridade — o que te impede de [resultado desejado] hoje? É tempo, é conhecimento, ou é não saber por onde começar?`
  },
  {
    id: 'ql-03',
    category: 'qualificacao',
    categoryLabel: 'Perguntas de Qualificação',
    title: 'O que mudaria em 30 dias?',
    scenario: 'Ancoragem emocional no futuro desejado.',
    keyPhrases: ['nos próximos 30 dias', 'o que tá em jogo pra ti'],
    template: `Se tu resolvesses isto nos próximos 30 dias, o que mudaria na tua vida? Quero entender o que tá em jogo pra ti.`
  },
  {
    id: 'ql-04',
    category: 'qualificacao',
    categoryLabel: 'Perguntas de Qualificação',
    title: 'Já tentaste antes? O que falhou?',
    scenario: 'Descobrir feridas e más experiências anteriores.',
    keyPhrases: ['já tentaste antes', 'o que não funcionou'],
    template: `Tu já tentaste resolver isto antes? Se sim, o que não funcionou? Assim eu não te ofereço mais do mesmo.`
  },
  {
    id: 'ql-05',
    category: 'qualificacao',
    categoryLabel: 'Perguntas de Qualificação',
    title: 'Começar já ou só pesquisando?',
    scenario: 'Definir o timing do lead sem desgaste.',
    keyPhrases: ['começar já ou só a pesquisar', 'duas respostas são válidas'],
    template: `Última pergunta antes de te mostrar: tu estás procurando começar já ou só a pesquisar por enquanto? As duas respostas são válidas, só quero saber como te ajudar melhor.`
  },
  {
    id: 'ql-06',
    category: 'qualificacao',
    categoryLabel: 'Perguntas de Qualificação',
    title: 'Em quanto tempo queres resultado?',
    scenario: 'Alinhar expectativas de prazos.',
    keyPhrases: ['primeiro resultado', 'caminho muda conforme tua pressa'],
    template: `Em quanto tempo tu gostarias de ver o primeiro resultado? Pergunto porque o caminho muda conforme a tua pressa.`
  },

  // ─── 4. APRESENTAÇÃO DA OFERTA & STORY SELLING ────────────────────────────
  {
    id: 'of-01',
    category: 'oferta',
    categoryLabel: 'Apresentação da Oferta no Chat',
    title: 'Conecta à dor específica',
    scenario: 'Personalizar a solução diretamente sobre a queixa relatada.',
    keyPhrases: ['teu problema é', 'feito exatamente pra isso'],
    template: `Olha [NOME], pelo que me contaste, o teu problema é [dor específica]. O [PRODUTO] foi feito exatamente pra isso: ele te dá [transformação] em [tempo]. Te explico como funciona?`
  },
  {
    id: 'of-02',
    category: 'oferta',
    categoryLabel: 'Apresentação da Oferta no Chat',
    title: 'De onde tu sais → onde tu chegas',
    scenario: 'Contraste claro de transformação antes e depois.',
    keyPhrases: ['de onde tu sais', 'onde tu chegas'],
    template: `Resumindo o que o [PRODUTO] faz por ti: tu sais de [situação atual] e chegas em [situação desejada], com [método/ferramenta] te guiando passo a passo. Sem precisar [maior medo/objeção].`
  },
  {
    id: 'of-03',
    category: 'oferta',
    categoryLabel: 'Apresentação da Oferta no Chat',
    title: 'Não é teoria, é caminho prático',
    scenario: 'Diferenciar de cursos acadêmicos vazios.',
    keyPhrases: ['não é curso pra encher a cabeça', 'caminho prático'],
    template: `Não é curso pra encher a cabeça de teoria. É um caminho prático: tu fazes [ação 1], depois [ação 2], e já começas a ver [resultado]. Faz sentido pra onde tu queres ir?`
  },
  {
    id: 'of-04',
    category: 'oferta',
    categoryLabel: 'Apresentação da Oferta no Chat',
    title: 'O que tu recebes (lista + preço)',
    scenario: 'Pitch claro e desmembrado com proposta e valor em Meticais.',
    keyPhrases: ['o que tu recebes', 'preço', 'quer que eu te mande o link'],
    template: `Deixa eu te mostrar o que tu recebes 👇
• [Entrega 1] — pra resolver [dor 1]
• [Entrega 2] — pra resolver [dor 2]
• [Bónus] — pra acelerar [resultado]
Tudo por [PREÇO]. Quer que eu te mande o link?`
  },
  {
    id: 'of-05',
    category: 'oferta',
    categoryLabel: 'Apresentação da Oferta no Chat',
    title: 'Feito pra Moçambique (M-Pesa/e-Mola)',
    scenario: 'Destacar adaptação total ao mercado moçambicano e meios de pagamento nacionais.',
    keyPhrases: ['Moçambique', 'M-Pesa/e-Mola', 'linguagem que tu entendes'],
    template: `A diferença do [PRODUTO] pra tudo que tu já viste é que ele é feito pro nosso mercado, em Moçambique, com pagamento por M-Pesa/e-Mola e linguagem que tu entendes. Não é coisa importada que não encaixa aqui.`
  },
  {
    id: 'of-06',
    category: 'oferta',
    categoryLabel: 'Apresentação da Oferta no Chat',
    title: 'Honesto: pra ti se fizeres a tua parte',
    scenario: 'Filtro de seriedade e alinhamento de compromisso mútuo.',
    keyPhrases: ['vou ser honesto contigo', 'não vou te vender se procuras milagre'],
    template: `Vou ser honesto contigo: se tu queres [resultado] e estás disposto a [esforço mínimo], isto é pra ti. Se procuras milagre sem fazer nada, não vou te vender. Tu estás pronto pra fazer a tua parte?`
  },
  {
    id: 'st-01',
    category: 'oferta',
    categoryLabel: 'Story Selling',
    title: 'Story 1 — Onde eu estava',
    scenario: 'Sequência de conexão por história e vulnerabilidade.',
    keyPhrases: ['onde eu estava', 'exatamente onde tu talvez estejas'],
    template: `Story 1: "Há [tempo] eu estava exatamente onde tu talvez estejas agora..." (foto/contexto)`
  },
  {
    id: 'st-02',
    category: 'oferta',
    categoryLabel: 'Story Selling',
    title: 'Story 2 — Tentei de tudo',
    scenario: 'Identificação com tentativas frustradas anteriores.',
    keyPhrases: ['tentei de tudo', 'nada funcionava'],
    template: `Story 2: "Eu tentei de tudo. [coisa 1], [coisa 2]... nada funcionava de verdade."`
  },
  {
    id: 'st-03',
    category: 'oferta',
    categoryLabel: 'Story Selling',
    title: 'Story 3 — A virada',
    scenario: 'O momento da descoberta do método/sistema.',
    keyPhrases: ['a virada', 'mudou o jogo'],
    template: `Story 3: "Até que eu percebi uma coisa que mudou o jogo:" (a virada)`
  },
  {
    id: 'st-04',
    category: 'oferta',
    categoryLabel: 'Story Selling',
    title: 'Story 4 — Hoje (prova)',
    scenario: 'Demonstração de resultados consistentes.',
    keyPhrases: ['resultado atual', 'não foi sorte, foi método'],
    template: `Story 4: "Hoje eu [resultado atual]. E não foi sorte. Foi método." (prova)`
  },
  {
    id: 'st-05',
    category: 'oferta',
    categoryLabel: 'Story Selling',
    title: 'Story 5 — Organizei tudo no produto',
    scenario: 'Transição da história pessoal para a solução comercial empacotada.',
    keyPhrases: ['organizei tudo no produto'],
    template: `Story 5: "Muita gente me pergunta como. Por isso eu organizei tudo no [PRODUTO]."`
  },
  {
    id: 'st-06',
    category: 'oferta',
    categoryLabel: 'Story Selling',
    title: 'Story 6 — CTA',
    scenario: 'Chamada para ação no direct ou WhatsApp.',
    keyPhrases: ['responde com QUERO', 'arrasta pra cima'],
    template: `Story 6 (CTA): "Se tu queres o mesmo caminho, arrasta pra cima / responde este story com 'QUERO' 👆"`
  },

  // ─── 5. QUEBRA DE OBJEÇÕES ────────────────────────────────────────────────
  {
    id: 'obj-caro-00',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Está Caro',
    title: 'Quebrando a Objeção "Está Caro" (Consultivo)',
    scenario: 'Comparar o custo da ferramenta com o custo de perder 1 ou 2 vendas semanais por demora.',
    keyPhrases: ['investimento considerável', 'perder 1 ou 2 clientes por semana', 'fração mínima do salário', 'já se pagou e gerou lucro'],
    template: `Entendo perfeitamente, [Nome do Cliente]. O valor pode parecer um investimento considerável num primeiro momento.

Mas vamos pensar juntos: quanto custa hoje o(a) {{empresa}} perder 1 ou 2 clientes por semana porque o WhatsApp demorou a responder? 

O nosso sistema não é um "custo", é como ter um funcionário de atendimento trabalhando 24 horas por dia, 7 dias por semana, sem férias e sem falhas, por uma fração mínima do salário de uma pessoa.

Se o sistema te trouxer apenas 2 vendas a mais neste mês, ele já não se pagou e gerou lucro?`
  },
  {
    id: 'obj-caro-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Está Caro',
    title: '"Tá caro" — Caro comparado a quê?',
    scenario: 'Fazer o prospecto relativizar o preço frente ao retorno.',
    keyPhrases: ['caro comparado a quê', 'deixas de ganhar', 'se paga em'],
    template: `Entendo. Deixa eu te perguntar: caro comparado a quê? Porque se tu pensares no que tu deixas de ganhar continuando como estás, o [PRODUTO] se paga em [tempo].`
  },
  {
    id: 'obj-caro-02',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Está Caro',
    title: '"Tá caro" — A sangria de continuar igual',
    scenario: 'Ancorar o prejuízo diário de não resolver a questão.',
    keyPhrases: ['custa caro de verdade', 'parar essa sangria'],
    template: `Eu entendo a sensação. Mas pensa assim: o que custa caro de verdade é continuar mais [N] meses sem resolver isto. O [PRODUTO] é o investimento que para essa sangria.`
  },
  {
    id: 'obj-caro-03',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Está Caro',
    title: '"Tá caro" — Faz a conta comigo',
    scenario: 'Matemática simples de retorno sobre investimento (ROI).',
    keyPhrases: ['faz a conta comigo', 'recupera o valor com X vendas'],
    template: `Caro é gastar [valor] em algo que não usa. O [PRODUTO] tu usas e recupera o valor com [X] vendas. Quantas vendas tu precisas pra pagar isto? Faz a conta comigo.`
  },
  {
    id: 'obj-pensar-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Vou Pensar',
    title: '"Vou pensar" — Pensar o quê exatamente?',
    scenario: 'Descobrir a dúvida oculta sem ser agressivo.',
    keyPhrases: ['pensar o quê exatamente', 'resolvo agora em 1 minuto'],
    template: `Claro, pensa sim — decisão importante merece. Só me ajuda a entender: o que exatamente tu precisas pensar? Às vezes é uma dúvida que eu resolvo agora em 1 minuto.`
  },
  {
    id: 'obj-pensar-02',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Vou Pensar',
    title: '"Vou pensar" — É pensar ou é não?',
    scenario: 'Corte respeitoso de enrolação.',
    keyPhrases: ['pensar de verdade ou forma educada de dizer não'],
    template: `Sem problema. Mas seja honesto comigo: é "pensar" de verdade ou é uma forma educada de dizer "não"? Pergunto porque se tem alguma dúvida travando, eu prefiro resolver agora.`
  },
  {
    id: 'obj-pensar-03',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Vou Pensar',
    title: '"Vou pensar" — Decide com a info certa',
    scenario: 'Lembrar de prazos ou bônus com transparência.',
    keyPhrases: ['decide com a informação certa', 'escassez real'],
    template: `Beleza. Só te aviso que [escassez real: vaga/preço/bónus] é até [prazo]. Não quero te apressar, mas quero que tu decidas com a informação certa.`
  },
  {
    id: 'obj-dinheiro-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Sem Dinheiro',
    title: '"Sem dinheiro" — Criar uma nova entrada',
    scenario: 'Mostrar que o objetivo do sistema é justamente gerar fluxo financeiro.',
    keyPhrases: ['dinheiro tá curto', 'criar uma nova entrada', 'plano menor'],
    template: `Te entendo, dinheiro tá curto pra todo mundo. Por isso mesmo é que o [PRODUTO] existe — pra criar uma nova entrada. Me diz: se tivesse uma forma de parcelar / um plano menor, fazia sentido pra ti?`
  },
  {
    id: 'obj-dinheiro-02',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Sem Dinheiro',
    title: '"Sem dinheiro" — Não tens porque não tens sistema',
    scenario: 'Inversão de causa e efeito para quem adia a profissionalização.',
    keyPhrases: ['não tens dinheiro porque ainda não tens o sistema', 'caiba no teu bolso'],
    template: `Justo. E olha, eu não quero que tu te aperte. Mas pensa: tu não tens dinheiro agora *porque* ainda não tens o sistema. O [PRODUTO] é o que muda isso. Bora ver uma forma que caiba no teu bolso?`
  },
  {
    id: 'obj-dinheiro-03',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Sem Dinheiro',
    title: '"Sem dinheiro" — Opção mais leve',
    scenario: 'Downsell para entrada imediata.',
    keyPhrases: ['opção mais leve', 'mesma base, valor menor'],
    template: `Tenho uma opção mais leve pra quem tá começando: [plano/oferta menor]. Mesma base, valor menor. Quer que eu te mostre?`
  },
  {
    id: 'obj-tempo-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Sem Tempo',
    title: '"Sem tempo" — Feito pra quem é ocupado',
    scenario: 'Explicar que a automação economiza tempo da rotina.',
    keyPhrases: ['feito pra quem é ocupado', 'IA que faz por ti'],
    template: `Justamente por isso. O [PRODUTO] foi feito pra quem é ocupado — são [X min] por dia e boa parte é a IA que faz por ti. Tu tens [X] minutos à noite?`
  },
  {
    id: 'obj-tempo-02',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Sem Tempo',
    title: '"Sem tempo" — Tempo se cria',
    scenario: 'Conscientização de prioridade.',
    keyPhrases: ['tempo se cria', 'construir algo teu'],
    template: `Eu te entendo, eu também sou corrido. Mas tempo tu não vais ter mais — tu vais ter que *criar*. E é melhor criar pra construir algo teu do que pra continuar igual, concordas?`
  },
  {
    id: 'obj-funciona-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Funciona?',
    title: '"Funciona pra mim?" — Funciona pra quem faz',
    scenario: 'Postura de integridade sobre esforço e adequação.',
    keyPhrases: ['funciona pra quem faz', 'se não encaixar eu mesmo digo'],
    template: `Pergunta justa. Funciona pra quem faz. Me conta teu caso que eu te digo com sinceridade se encaixa — e se não encaixar, eu mesmo te digo pra não comprares.`
  },
  {
    id: 'obj-funciona-02',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Funciona?',
    title: '"Funciona pra mim?" — Eu te acompanho',
    scenario: 'Segurança com acompanhamento na implementação.',
    keyPhrases: ['funciona pra pessoas parecidas', 'eu te acompanho'],
    template: `Funciona pra [tipo de pessoa parecida com ela]. Tu te encaixas nisso. O que vai definir não é o método, é tu fazeres. E pra isso eu te acompanho. Topas?`
  },
  {
    id: 'obj-tentei-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Já Tentei',
    title: '"Já tentei" — Tinha este diferencial?',
    scenario: 'Isolar a falha de métodos amadores passados.',
    keyPhrases: ['tinha este diferencial', 'onde a maioria falha'],
    template: `Entendo a frustração, e ela é válida. Mas me diz: o que tu tentaste antes tinha [diferencial do teu produto]? Porque é exatamente aí que a maioria falha — e é isso que muda aqui.`
  },
  {
    id: 'obj-tentei-02',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Já Tentei',
    title: '"Já tentei" — Agora não vais sozinho',
    scenario: 'Apoio em comunidade ou mentoria.',
    keyPhrases: ['não vais sozinho', 'ter o caminho certo'],
    template: `Tentar e não dar certo faz parte. A diferença agora é que tu não vais sozinho. O problema antes não foi tu, foi não ter o caminho certo. Bora corrigir isso?`
  },
  {
    id: 'obj-socio-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Sócio/Cônjuge',
    title: '"Falar com cônjuge/sócio" — Te passo um resumo',
    scenario: 'Municiar o lead com material executivo claro.',
    keyPhrases: ['falar com cônjuge ou sócio', 'te passo um resumo'],
    template: `Faz todo sentido, decisão de casal/sócio se conversa. Quer que eu te passe um resumo pra tu mostrares? Assim fica mais fácil de explicar o que é.`
  },
  {
    id: 'obj-socio-02',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Sócio/Cônjuge',
    title: '"Falar com cônjuge/sócio" — Argumentos pra conversa',
    scenario: 'Antecipar dúvidas do terceiro decisor.',
    keyPhrases: ['maior dúvida dele', 'argumentos pra essa conversa'],
    template: `Perfeito, fala sim. Só pra eu te ajudar: qual tu achas que vai ser a maior dúvida dele(a)? Te dou os argumentos pra essa conversa.`
  },
  {
    id: 'obj-confianca-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Confiança',
    title: '"Não confio" — O risco é meu',
    scenario: 'Garantia incondicional para absorver o risco.',
    keyPhrases: ['o risco é meu, não teu', 'garantia incondicional'],
    template: `Desconfiar é inteligente, tem muito picareta por aí. Por isso eu te mostro [prova: depoimentos, garantia, meu rosto/histórico]. E tem garantia de [X dias] — se não for o que eu disse, tu recebes de volta. O risco é meu, não teu.`
  },
  {
    id: 'obj-confianca-02',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Confiança',
    title: '"Não confio" — Cara limpa, pode perguntar',
    scenario: 'Transparência total e reputação.',
    keyPhrases: ['cara limpa', 'pode perguntar o que quiseres'],
    template: `Te entendo 100%. Eu também desconfiaria. Olha o meu trabalho aqui [perfil/conteúdo], olha o que os alunos dizem [depoimentos]. E qualquer dúvida, eu respondo de cara limpa. Pode perguntar o que quiseres.`
  },
  {
    id: 'obj-depois-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Depois',
    title: '"Depois eu compro" — Depois vira nunca',
    scenario: 'Evitar procrastinação comercial.',
    keyPhrases: ['depois vira nunca', 'condição que não vai ter depois'],
    template: `Pode ser. Mas "depois" geralmente vira "nunca", e eu não quero isso pra ti. O que tem hoje que não vai ter depois é [bónus/preço/condição]. Vale a pena segurar?`
  },
  {
    id: 'obj-medo-01',
    category: 'objecoes',
    categoryLabel: 'Quebra de Objeções: Insegurança',
    title: '"Medo de não conseguir" — Não te deixo na mão',
    scenario: 'Apoio humanizado para superar insegurança de execução.',
    keyPhrases: ['não te deixo na mão', 'único jeito de não conseguir é não tentar'],
    template: `Esse medo é normal e até bom — mostra que tu levas a sério. Mas tu não vais estar sozinho: tem [suporte/comunidade/passo a passo]. Eu não te deixo na mão. O único jeito de não conseguir é não tentar.`
  },

  // ─── 6. FECHAMENTO & M-PESA/E-MOLA ────────────────────────────────────────
  {
    id: 'fc-00',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'Fechamento Direto (Link de Pagamento / Setup)',
    scenario: 'Formalização de início após o cliente concordar com a proposta.',
    keyPhrases: ['início imediato ao setup', 'link de pagamento', 'grupo no WhatsApp com a equipa técnica'],
    template: `Perfeito, [Nome do Cliente]! Fico muito feliz que vamos avançar juntos. O(a) {{empresa}} vai dar um salto no atendimento.

Para darmos início imediato ao setup do vosso sistema, vou deixar aqui o link de pagamento da primeira mensalidade/setup.

🔗 [SEU LINK DE PAGAMENTO AQUI]

Assim que o pagamento for confirmado, crio o grupo no WhatsApp com a nossa equipa técnica para iniciarmos a configuração do seu robô hoje mesmo.

Qualquer dúvida, estou à disposição!`
  },
  {
    id: 'fc-01',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'Link agora, entras hoje. Fecha?',
    scenario: 'Fechamento simples e sem rodeios via M-Pesa / e-Mola.',
    keyPhrases: ['M-Pesa/e-Mola', 'já entras hoje', 'fecha?'],
    template: `Então é o seguinte: te mando o link de pagamento agora por M-Pesa/e-Mola e tu já entras hoje. Fecha?`
  },
  {
    id: 'fc-02',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'Bora dar o primeiro passo',
    scenario: 'Convite direto para adesão imediata.',
    keyPhrases: ['primeiro passo', 'te envio o link agora'],
    template: `Pelo que tu me disseste, isto é exatamente o que tu precisas. Bora dar o primeiro passo? Te envio o link agora.`
  },
  {
    id: 'fc-03',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'Fechamento por escolha (A ou B)',
    scenario: 'Técnica de opção dupla onde ambas são um sim.',
    keyPhrases: ['fechamento por escolha', 'opção A ou opção B'],
    template: `Tu preferes começar pelo [opção A] ou pelo [opção B]? (fechamento por escolha — qualquer resposta é um sim)`
  },
  {
    id: 'fc-04',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'Manda o comprovativo que libero na hora',
    scenario: 'Instrução clara para agilizar ativação local.',
    keyPhrases: ['manda o comprovativo', 'libero na hora'],
    template: `Vou te mandar o link. Quando concluíres o pagamento me manda o comprovativo aqui que eu já te libero o acesso na hora.`
  },
  {
    id: 'fc-05',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'Garante a vaga — sem risco',
    scenario: 'Fechamento apoiado na garantia de devolução.',
    keyPhrases: ['sem risco', 'garante a tua vaga'],
    template: `Faz assim: garante a tua vaga agora e, se em [X dias] tu sentires que não é pra ti, eu devolvo. Sem risco. Posso te enviar?`
  },
  {
    id: 'fc-06',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'Respondi tudo? Próximo passo é entrar',
    scenario: 'Transição suave ao final de uma sessão de perguntas.',
    keyPhrases: ['respondi as tuas dúvidas', 'próximo passo é entrar'],
    template: `Já respondi as tuas dúvidas? Se sim, não tem mais o que esperar — o próximo passo é entrar. Te mando o link?`
  },
  {
    id: 'fc-07',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'O que eu faria no teu lugar',
    scenario: 'Conselho pessoal e confiável.',
    keyPhrases: ['o que eu faria no teu lugar', 'entraria hoje'],
    template: `Olha, decisão é tua, mas eu vou te dizer o que eu faria no teu lugar: eu entraria hoje, enquanto [condição]. Bora?`
  },
  {
    id: 'fc-08',
    category: 'fechamento',
    categoryLabel: 'Fechamento Direto',
    title: 'Resolver ou só pensar em resolver?',
    scenario: 'Confronto produtivo para ação.',
    keyPhrases: ['resolver ou só pensar em resolver'],
    template: `Última coisa: tu queres resolver isto ou só pensar em resolver? Se é resolver, o caminho começa aqui. Te envio o link agora.`
  },
  {
    id: 'esc-01',
    category: 'fechamento',
    categoryLabel: 'Escassez e Urgência',
    title: 'Preço sobe em [data]',
    scenario: 'Aviso prévio e transparente de virada de lote.',
    keyPhrases: ['aviso de transparência', 'preço sobe em'],
    template: `Aviso de transparência: o valor de [PREÇO] vai até [data]. Depois sobe pra [PREÇO maior]. Não é pressão, é só pra tu decidires com a info certa.`
  },
  {
    id: 'esc-02',
    category: 'fechamento',
    categoryLabel: 'Escassez e Urgência',
    title: 'Vagas com bónus acabando',
    scenario: 'Escassez fundamentada de bônus exclusivos.',
    keyPhrases: ['vagas com bónus', 'quando acabar, acabou'],
    template: `Tenho [N] vagas com [bónus] e já saíram [X]. Quando acabar, acabou — não tem como repor por causa do [motivo real].`
  },
  {
    id: 'esc-03',
    category: 'fechamento',
    categoryLabel: 'Escassez e Urgência',
    title: 'Condição só desta turma',
    scenario: 'Encerramento de ciclo.',
    keyPhrases: ['só desta turma', 'se faz sentido pra ti é agora'],
    template: `Essa condição é da turma de [mês]. A próxima só abre em [data], e por outro valor. Se faz sentido pra ti, é agora.`
  },
  {
    id: 'esc-04',
    category: 'fechamento',
    categoryLabel: 'Escassez e Urgência',
    title: 'Bónus só até [prazo]',
    scenario: 'Prazo limite para manter suporte concentrado.',
    keyPhrases: ['bónus só até', 'dar atenção a quem já entrou'],
    template: `O [bónus] eu só consigo dar pra quem entrar até [prazo], porque depois eu fecho o grupo pra dar atenção a quem já entrou.`
  },
  {
    id: 'esc-05',
    category: 'fechamento',
    categoryLabel: 'Escassez e Urgência',
    title: 'Não vou insistir — oferta fecha [quando]',
    scenario: 'Desapego comercial com data de corte.',
    keyPhrases: ['não vou insistir', 'oferta fecha', 'tu decides'],
    template: `Não vou ficar a insistir contigo, não é meu estilo. Só te deixo saber: a oferta fecha [quando]. Tu decides.`
  },
  {
    id: 'esc-06',
    category: 'fechamento',
    categoryLabel: 'Escassez e Urgência',
    title: 'Poucas horas pra [condição]',
    scenario: 'Último lembrete no dia final.',
    keyPhrases: ['poucas horas', 'empurrãozinho'],
    template: `Restam poucas horas pra [condição]. Se tu já tinhas decidido, este é o empurrãozinho. Se ainda não, sem stress.`
  },
  {
    id: 'rec-01',
    category: 'fechamento',
    categoryLabel: 'Recuperação de Pagamento Abandonado',
    title: 'Começou e não concluiu',
    scenario: 'Auxílio amigável a checkout pendente.',
    keyPhrases: ['começaste a tua inscrição', 'travou alguma coisa'],
    template: `Oi [NOME]! Vi que tu começaste a tua inscrição mas não concluíste. Travou alguma coisa no pagamento ou ficou alguma dúvida? Tô aqui pra ajudar.`
  },
  {
    id: 'rec-02',
    category: 'fechamento',
    categoryLabel: 'Recuperação de Pagamento Abandonado',
    title: 'Erro no M-Pesa/e-Mola?',
    scenario: 'Falha comum de rede móvel em Moçambique.',
    keyPhrases: ['erro de rede no M-Pesa ou e-Mola', 'mande o link de novo'],
    template: `[NOME], aconteceu algo no pagamento? Às vezes o M-Pesa/e-Mola dá erro de rede. Quer que eu te mande o link de novo?`
  },
  {
    id: 'rec-03',
    category: 'fechamento',
    categoryLabel: 'Recuperação de Pagamento Abandonado',
    title: 'Não percas a vaga por detalhe técnico',
    scenario: 'Suporte técnico imediato no WhatsApp.',
    keyPhrases: ['detalhe técnico', 'resolvo contigo agora'],
    template: `Ó [NOME], não quero que tu percas a vaga por causa de um detalhe técnico. Me diz onde tu paraste que eu resolvo contigo agora.`
  },
  {
    id: 'rec-04',
    category: 'fechamento',
    categoryLabel: 'Recuperação de Pagamento Abandonado',
    title: 'Acesso quase pronto, falta pagar',
    scenario: 'Quase lá: agilidade no fechamento.',
    keyPhrases: ['acesso quase pronto', 'é rapidinho'],
    template: `[NOME], teu acesso tá quase pronto, só falta concluir o pagamento. Posso te ajudar a finalizar? É rapidinho.`
  },
  {
    id: 'rec-05',
    category: 'fechamento',
    categoryLabel: 'Recuperação de Pagamento Abandonado',
    title: 'Ficou pendente — te ajudo',
    scenario: 'Flexibilidade de plano ou esclarecimento final.',
    keyPhrases: ['ficou pendente', 'não te deixo travado'],
    template: `Reparei que ficou pendente. Se for o valor que pesou, eu tenho [opção/parcelamento]. Se foi dúvida, me pergunta. Não te deixo travado.`
  },

  // ─── 7. FOLLOW-UP & REATIVAÇÃO ────────────────────────────────────────────
  {
    id: 'fu-00',
    category: 'followup',
    categoryLabel: 'Follow-up Após Proposta',
    title: 'Follow-up Após Enviar Proposta',
    scenario: 'Cobrança educada no dia seguinte ao envio da proposta para o WhatsApp da empresa.',
    keyPhrases: ['rotina é corrida', 'proposta de automação que enviei ontem', '5 minutinhos apenas para tirar dúvidas rápidas'],
    template: `Olá, [Nome do Cliente], bom dia!

Tudo certo no(a) {{empresa}}?

Conseguiu dar uma olhada na proposta de automação que enviei ontem? Sei que a rotina é corrida!

Se quiser, posso te ligar por 5 minutinhos apenas para tirar dúvidas rápidas. Como está sua agenda para hoje à tarde?`
  },
  {
    id: 'fu-01',
    category: 'followup',
    categoryLabel: 'Follow-up — Lead que Sumiu',
    title: 'Sumiste — ainda faz sentido?',
    scenario: 'Retomada leve com lead que parou de responder.',
    keyPhrases: ['sumiste', 'ainda faz sentido'],
    template: `Oi [NOME], sumiste 😄 Tá tudo bem? Sei que a vida corre. Ainda faz sentido pra ti aquilo que conversamos?`
  },
  {
    id: 'fu-02',
    category: 'followup',
    categoryLabel: 'Follow-up — Lead que Sumiu',
    title: 'Chegaste a uma decisão?',
    scenario: 'Perguntar educadamente para não deixar em aberto.',
    keyPhrases: ['sem pressão', 'não quero te deixar no vácuo'],
    template: `[NOME], só passando pra saber se tu chegaste a uma decisão. Sem pressão — só não quero te deixar no vácuo.`
  },
  {
    id: 'fu-03',
    category: 'followup',
    categoryLabel: 'Follow-up — Lead que Sumiu',
    title: 'Aluno na tua situação teve resultado',
    scenario: 'Reengajamento via prova social contextualizada.',
    keyPhrases: ['mesma situação que tu', 'acabou de ter resultado'],
    template: `Fala [NOME]! Lembrei de ti porque [aluno/cliente] que estava na mesma situação que tu acabou de ter [resultado]. Achei que ias gostar de saber.`
  },
  {
    id: 'fu-04',
    category: 'followup',
    categoryLabel: 'Follow-up — Lead que Sumiu',
    title: 'Ficou alguma dúvida minha?',
    scenario: 'Responsabilidade do vendedor por clareza.',
    keyPhrases: ['dúvida que não respondi bem', 'prefiro saber'],
    template: `[NOME], vou ser direto: tu ficaste com alguma dúvida que eu não respondi bem? Me diz com sinceridade, prefiro saber.`
  },
  {
    id: 'fu-05',
    category: 'followup',
    categoryLabel: 'Follow-up — Lead que Sumiu',
    title: 'Se falta só o empurrão...',
    scenario: 'Humor e descontração para fechar negócios parados.',
    keyPhrases: ['se falta só o empurrão', 'considera este o empurrão'],
    template: `Tô aqui ó [NOME] 👋 Se for pra ser, vai ser no teu tempo. Mas se a única coisa que falta é o empurrão, considera este o empurrão 😄`
  },
  {
    id: 'fu-06',
    category: 'followup',
    categoryLabel: 'Follow-up — Lead que Sumiu',
    title: 'Última mensagem, prometo',
    scenario: 'Despedida elegante que reativa muitos prospectos por escassez.',
    keyPhrases: ['última mensagem minha', 'sucesso de qualquer forma'],
    template: `[NOME], última mensagem minha sobre isso, prometo 😅 Se mudares de ideia, tu sabes onde me achar. Sucesso de qualquer forma 🙏`
  },
  {
    id: 'rf-01',
    category: 'followup',
    categoryLabel: 'Reativação de Lead Frio',
    title: 'Lancei novidade — lembrei de ti',
    scenario: 'Reconectar após semanas com gancho de novidade.',
    keyPhrases: ['lembrei de ti', 'lancei novidade'],
    template: `Oi [NOME]! Faz tempo. Lembrei de ti porque lancei [novidade/atualização]. Achei que podia te interessar — quer que eu te conte?`
  },
  {
    id: 'rf-02',
    category: 'followup',
    categoryLabel: 'Reativação de Lead Frio',
    title: 'Tua situação mudou?',
    scenario: 'Reavaliar dores após tempo decorrido.',
    keyPhrases: ['tua situação mudou', 'agora tem novidade'],
    template: `[NOME], tudo bem? A tua situação com [dor] mudou desde a última vez que falamos? Pergunto porque agora tem [novidade] que ajuda nisso.`
  },
  {
    id: 'rf-03',
    category: 'followup',
    categoryLabel: 'Reativação de Lead Frio',
    title: 'Muita coisa aconteceu desde então',
    scenario: 'Atualização de progresso e prova de sucesso contínuo.',
    keyPhrases: ['muita coisa aconteceu', 'quis te atualizar'],
    template: `Fala [NOME]! Muita coisa aconteceu desde que conversamos. [Aluno] que começou comigo já está [resultado]. Quis te atualizar.`
  },
  {
    id: 'rf-04',
    category: 'followup',
    categoryLabel: 'Reativação de Lead Frio',
    title: 'Reabri a turma — te avisei primeiro',
    scenario: 'Tratamento VIP para quem já demonstrou interesse.',
    keyPhrases: ['reabri turma', 'te avisar primeiro'],
    template: `[NOME], reabri [oferta/turma] e lembrei que tu tinhas demonstrado interesse. Quis te avisar primeiro antes de anunciar pra geral.`
  },
  {
    id: 'rf-05',
    category: 'followup',
    categoryLabel: 'Reativação de Lead Frio',
    title: 'Sem agenda — como tu estás?',
    scenario: 'Reaproximação sincera e desinteressada.',
    keyPhrases: ['sem agenda nenhuma', 'conseguiste avançar'],
    template: `Oi [NOME] 👋 Sem agenda nenhuma — só quero saber como tu estás com [tema]. Conseguiste avançar?`
  },

  // ─── 8. PÓS-VENDA, BOAS-VINDAS, INDICAÇÃO & UPSELL ─────────────────────────
  {
    id: 'pv-01',
    category: 'pos-venda',
    categoryLabel: 'Pós-venda e Onboarding',
    title: 'Boas-vindas + primeiro passo',
    scenario: 'Acolhimento imediato com clareza da primeira ação simples.',
    keyPhrases: ['bem-vindo', 'acesso liberado', 'primeiro passo'],
    template: `BEM-VINDO(A) AO [PRODUTO], [NOME]! 🎉 Acesso liberado: [link]. Teu primeiro passo é [ação simples]. Qualquer coisa, me chama aqui mesmo. Vamos juntos nessa!`
  },
  {
    id: 'pv-02',
    category: 'pos-venda',
    categoryLabel: 'Pós-venda e Onboarding',
    title: 'Acesso ativo — faz só a 1ª ação hoje',
    scenario: 'Combater a sobrecarga inicial do cliente.',
    keyPhrases: ['acesso ativo', 'faz só a primeira ação hoje'],
    template: `[NOME], teu pagamento entrou e teu acesso já está ativo ✅ Antes de tu mergulhares: faz só [primeira ação] hoje. Não tenta fazer tudo de uma vez. Combinado?`
  },
  {
    id: 'pv-03',
    category: 'pos-venda',
    categoryLabel: 'Pós-venda e Onboarding',
    title: 'Conseguiste acessar tudo?',
    scenario: 'Verificação ativa de consumo e acesso no dia seguinte.',
    keyPhrases: ['conseguiste acessar tudo certinho', 'o que achaste'],
    template: `Oi [NOME]! Passando pra ver se tu conseguiste acessar tudo certinho. Já deste uma olhada em [módulo 1]? Me conta o que achaste!`
  },
  {
    id: 'pv-04',
    category: 'pos-venda',
    categoryLabel: 'Pós-venda e Onboarding',
    title: 'Ter o material ≠ fazer',
    scenario: 'Alerta comportamental para garantir implementação real.',
    keyPhrases: ['segredo é fazer o primeiro', 'te ajudo se travares'],
    template: `[NOME], dica de quem já viu muita gente passar por aqui: o segredo não é ter o material, é *fazer* o primeiro. Faz [ação] ainda hoje que eu te ajudo se travares.`
  },
  {
    id: 'pv-05',
    category: 'pos-venda',
    categoryLabel: 'Pós-venda e Onboarding',
    title: 'Já completaste o marco?',
    scenario: 'Celebrar micro-vitórias na esteira de atendimento.',
    keyPhrases: ['completaste o marco', 'o que tá te travando'],
    template: `Como tá indo, [NOME]? Já completaste [marco]? Se sim, parabéns 🔥 Se não, me diz o que tá te travando que a gente resolve.`
  },
  {
    id: 'pv-06',
    category: 'pos-venda',
    categoryLabel: 'Pós-venda e Onboarding',
    title: 'Não estás sozinho — pergunta sempre',
    scenario: 'Reforço de disponibilidade para prevenir desistência silenciosa.',
    keyPhrases: ['não estás sozinho', 'perguntes mil vezes'],
    template: `[NOME], só pra reforçar: tu não estás sozinho nessa. Sempre que travares, manda mensagem. Prefiro que tu perguntes mil vezes a que tu desistas em silêncio.`
  },
  {
    id: 'dep-01',
    category: 'pos-venda',
    categoryLabel: 'Pedido de Depoimento',
    title: 'Áudio de 30s: antes e agora',
    scenario: 'Capturar prova social espontânea sem fricção.',
    keyPhrases: ['áudio de 30 segundos', 'como era antes e como tá agora'],
    template: `[NOME], que resultado top! 🔥 Posso te pedir um favor rápido? Grava um áudio de 30 segundos contando como era antes e como tá agora. Ajuda muito outras pessoas a darem o primeiro passo.`
  },
  {
    id: 'dep-02',
    category: 'pos-venda',
    categoryLabel: 'Pedido de Depoimento',
    title: 'Print ou vídeo curto',
    scenario: 'Pedir comprovação visual de resultados alcançados.',
    keyPhrases: ['print ou vídeo curto', 'inspirar quem tá com medo'],
    template: `Fico muito feliz com a tua evolução, [NOME] 🙏 Topas me mandar um print ou um vídeo curto disso? Quero mostrar (com a tua permissão) pra inspirar quem ainda tá com medo de começar.`
  },
  {
    id: 'dep-03',
    category: 'pos-venda',
    categoryLabel: 'Pedido de Depoimento',
    title: '3 perguntinhas (em áudio)',
    scenario: 'Roteiro prévio de depoimento estruturado.',
    keyPhrases: ['3 perguntinhas', 'como era antes, o que mudou, recomendarias'],
    template: `[NOME], pra eu não te dar trabalho, me responde só 3 coisinhas: 1) como era antes? 2) o que mudou? 3) tu recomendarias pra quem? Pode ser em áudio, fica mais natural.`
  },
  {
    id: 'dep-04',
    category: 'pos-venda',
    categoryLabel: 'Pedido de Depoimento',
    title: 'Posso usar como depoimento?',
    scenario: 'Consentimento formal para veiculação de imagem e nome.',
    keyPhrases: ['usar como depoimento', 'mostra teu nome ou anônimo'],
    template: `Posso usar o que tu acabaste de me contar como depoimento? Mostra teu nome ou prefere anônimo? Tu decides — só quero usar a tua história pra ajudar mais gente.`
  },
  {
    id: 'ind-01',
    category: 'pos-venda',
    categoryLabel: 'Pedido de Indicação',
    title: 'Conheces alguém como tu eras?',
    scenario: 'Ativação de indicação direcionada a amigos em situação similar.',
    keyPhrases: ['conheces alguém', 'muda a vida dela'],
    template: `[NOME], fico feliz que tu estejas a gostar! Posso te pedir uma coisa? Tu conheces alguém que tá na situação que tu estavas antes? Manda meu contato pra essa pessoa — pode mudar a vida dela como mudou a tua.`
  },
  {
    id: 'ind-02',
    category: 'pos-venda',
    categoryLabel: 'Pedido de Indicação',
    title: 'Pensa em 2 pessoas',
    scenario: 'Indicação específica e quantificável.',
    keyPhrases: ['pensa em 2 pessoas', 'agradeço a indicação'],
    template: `Já que tu curtiste tanto, [NOME]: se tu pensares em 2 pessoas que precisam disto, eu agradeço demais a indicação. Quem tu indicarias?`
  },
  {
    id: 'ind-03',
    category: 'pos-venda',
    categoryLabel: 'Pedido de Indicação',
    title: 'Condição especial por indicação',
    scenario: 'Recompensa por cliente indicado que fecha.',
    keyPhrases: ['condição especial por indicação', 'te dou benefício'],
    template: `[NOME], tenho uma condição especial pra quem vem indicado por aluno. Se tu indicares alguém e a pessoa entrar, eu te dou [benefício]. Topas?`
  },
  {
    id: 'ind-04',
    category: 'pos-venda',
    categoryLabel: 'Pedido de Indicação',
    title: 'Quem da tua rede se beneficiaria?',
    scenario: 'Expansão em rede profissional de contatos.',
    keyPhrases: ['quem da tua rede se beneficiaria', 'passa o contato'],
    template: `Pergunta rápida, [NOME]: quem da tua rede ia se beneficiar disto tanto quanto tu? Me passa o contato ou manda o meu pra ela, do jeito que for melhor pra ti 🙏`
  },
  {
    id: 'up-01',
    category: 'pos-venda',
    categoryLabel: 'Upsell, Cross-sell e Downsell',
    title: 'Upsell — produto premium',
    scenario: 'Oferta pós-compra de aceleração máxima.',
    keyPhrases: ['produto premium', 'condição especial só agora'],
    template: `(Upsell pós-compra) [NOME], já que tu entraste no [PRODUTO], tem uma coisa que vai turbinar teu resultado: o [PRODUTO PREMIUM]. Quem tem os dois anda [X]x mais rápido. Quer que eu te mostre? Tem condição especial só agora.`
  },
  {
    id: 'up-02',
    category: 'pos-venda',
    categoryLabel: 'Upsell, Cross-sell e Downsell',
    title: 'Cross-sell — resolve a 2ª dor',
    scenario: 'Venda de produto complementar ao lead ativo.',
    keyPhrases: ['resolve a 2ª dor', 'encaixa perfeito'],
    template: `(Cross-sell) [NOME], o [PRODUTO] resolve [dor 1]. Mas eu vi que tu também tens [dor 2] — e pra isso eu tenho o [PRODUTO 2], que encaixa perfeito com o que tu já tens. Faz sentido olhar?`
  },
  {
    id: 'up-03',
    category: 'pos-venda',
    categoryLabel: 'Upsell, Cross-sell e Downsell',
    title: 'Order bump — complemento',
    scenario: 'Pequena adição antes de finalizar pagamento.',
    keyPhrases: ['order bump', 'acelera muito o resultado'],
    template: `(Order bump) Antes de tu finalizares: por mais [valor pequeno] tu levas também [complemento]. A maioria leva porque acelera muito o resultado. Quer adicionar?`
  },
  {
    id: 'up-04',
    category: 'pos-venda',
    categoryLabel: 'Upsell, Cross-sell e Downsell',
    title: 'Downsell — versão menor',
    scenario: 'Alternativa reduzida para não perder a venda por preço.',
    keyPhrases: ['downsell', 'versão menor', 'preço menor'],
    template: `(Downsell) Entendi que o [PRODUTO completo] não cabe agora. Sem problema. Tenho o [VERSÃO MENOR] por [PREÇO menor] — começas por aqui e depois tu sobes quando fizer sentido. Quer?`
  },
  {
    id: 'up-05',
    category: 'pos-venda',
    categoryLabel: 'Upsell, Cross-sell e Downsell',
    title: 'Bundle — Código Zero + Komunika',
    scenario: 'Pacote conjunto de estratégia + automação.',
    keyPhrases: ['bundle', 'Código Zero', 'Komunika'],
    template: `(Bundle — Código Zero + Komunika) [NOME], já que tu vais aprender a vender pelo WhatsApp no [PRODUTO], faz todo sentido tu já saíres com a ferramenta que automatiza isso: o Komunika. Eu já incluo um plano pra ti dentro do pacote. Te mostro como fica?`
  },
  {
    id: 'up-06',
    category: 'pos-venda',
    categoryLabel: 'Upsell, Cross-sell e Downsell',
    title: 'Renovação/recorrência',
    scenario: 'Manutenção de assinatura e benefícios ativos.',
    keyPhrases: ['renovação de acesso', 'mantém benefícios'],
    template: `(Renovação/recorrência) [NOME], tá chegando a hora de renovar o teu acesso. Tu evoluíste bastante este mês 🔥 Bora continuar? A renovação mantém [benefícios] e ainda libera [novidade].`
  },
  {
    id: 'rem-01',
    category: 'pos-venda',
    categoryLabel: 'Retenção e Reembolso',
    title: 'Obrigado por dizer de frente',
    scenario: 'Postura madura diante de insatisfação para reverter ou entender.',
    keyPhrases: ['obrigado por dizer de frente', 'quero entender e resolver'],
    template: `[NOME], obrigado por me dizer isso de frente em vez de simplesmente sumir. Me conta exatamente o que te frustrou que eu quero entender e resolver. Tua experiência importa pra mim de verdade.`
  },
  {
    id: 'rem-02',
    category: 'pos-venda',
    categoryLabel: 'Retenção e Reembolso',
    title: 'Me diz o que faltou — corrijo ou reembolso',
    scenario: 'Compromisso incondicional com a garantia.',
    keyPhrases: ['corrijo ou reembolso', 'honro o que prometi'],
    template: `Sinto muito que não tenha sido o que tu esperavas, [NOME]. Antes de qualquer coisa: me diz o que faltou. Se for algo que eu posso corrigir agora, eu corrijo. Se for reembolso, eu honro o que prometi.`
  },
  {
    id: 'rem-03',
    category: 'pos-venda',
    categoryLabel: 'Retenção e Reembolso',
    title: 'Prefiro satisfeito a venda forçada',
    scenario: 'Reembolso elegante sem atrito, mantendo a porta aberta.',
    keyPhrases: ['prefiro um cliente satisfeito', 'processo teu reembolso'],
    template: `[NOME], eu prefiro um cliente satisfeito a uma venda forçada. Se tu sentes que não é pra ti, sem ressentimento — me confirma os dados que eu processo teu reembolso conforme a garantia. Tu continuas sendo bem-vindo aqui.`
  },
  {
    id: 'rem-04',
    category: 'pos-venda',
    categoryLabel: 'Retenção e Reembolso',
    title: 'Me dá um prazo pra resolver',
    scenario: 'Última tentativa de conserto de falha antes do cancelamento definitivo.',
    keyPhrases: ['prazo curto pra resolver', 'ofereço o reembolso'],
    template: `Entendo a tua chateação, [NOME], e tu tens razão em cobrar. Me dá [prazo curto] pra resolver [problema]? Se eu não resolver, eu mesmo te ofereço o reembolso. Pode ser?`
  }
];

export const VAULT_CATEGORIES = [
  { id: 'todos', label: 'Todos os scripts' },
  { id: 'primeiro-contato', label: 'Primeiro Contato (Frio)' },
  { id: 'sem-site', label: 'Empresas Sem Site' },
  { id: 'qualificacao', label: 'Qualificação & Quebra-gelo' },
  { id: 'oferta', label: 'Apresentação da Oferta' },
  { id: 'objecoes', label: 'Quebra de Objeções' },
  { id: 'fechamento', label: 'Fechamento & M-Pesa' },
  { id: 'followup', label: 'Follow-up & Reativação' },
  { id: 'pos-venda', label: 'Pós-Venda, Indicação & Upsell' }
] as const;

/**
 * Retorna todos os scripts do cofre
 */
export function getAllVaultScripts(): VaultScript[] {
  return VAULT_SCRIPTS;
}

/**
 * Filtra scripts por categoria
 */
export function getVaultScriptsByCategory(category: string): VaultScript[] {
  return VAULT_SCRIPTS.filter(s => s.category === category);
}

/**
 * Pesquisa scripts por palavra-chave e opcionalmente filtra por categoria
 */
export function searchVaultScripts(query: string, category?: string): VaultScript[] {
  let list = VAULT_SCRIPTS;
  if (category && category !== 'todos') {
    list = list.filter(s => s.category === category);
  }
  const q = query.toLowerCase().trim();
  if (!q) return list;
  return list.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.scenario.toLowerCase().includes(q) ||
    s.template.toLowerCase().includes(q) ||
    s.keyPhrases.some(k => k.toLowerCase().includes(q))
  );
}

/**
 * Seleciona a matriz de scripts do Cofre mais relevante para guiar a IA do Gemini
 * com base no perfil da empresa (se tem ou não site, se tem WhatsApp, nicho, serviço oferecido).
 */
export function buildVaultPromptMatrix(params?: {
  businessName?: string;
  category?: string;
  locality?: string;
  province?: string;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  service?: string;
  professionalName?: string;
}): string {
  const businessName = params?.businessName || '{{empresa}}';
  const category = params?.category || 'negócio local';
  const locality = params?.locality || 'Moçambique';
  const hasWebsite = params?.hasWebsite ?? false;
  const service = params?.service || 'automação de WhatsApp e presença online';
  const professionalName = params?.professionalName || 'Consultor Comercial';

  // Seleciona os templates primários de acordo com o contexto real
  const primaryTemplate = !hasWebsite
    ? VAULT_SCRIPTS.find(s => s.id === 'ss-01')!
    : VAULT_SCRIPTS.find(s => s.id === 'pc-01')!;

  return `
[MATRIZ OFICIAL DE SCRIPTS COMERCIAIS - COFRE CÓDIGO ZERO / PROSPECTA MZ]
Utilize a psicologia de vendas e os princípios destes roteiros testados em Moçambique para redigir a mensagem de abordagem (draftMessage) e estruturar as hipóteses comerciais para qualquer setor de atividade:

1. MATRIZ DE ABORDAGEM INICIAL RECOMENDADA (${!hasWebsite ? 'EMPRESA SEM WEBSITE PRÓPRIO' : 'PRIMEIRO CONTATO PROFISSIONAL'}):
- Tom: Respeitoso, direto, consultivo e adaptado ao mercado de Moçambique.
- Roteiro de Referência:
"""
${primaryTemplate.template
  .replace(/{{empresa}}/g, businessName)
  .replace(/{{nome}}/g, professionalName)
  .replace(/{{categoria}}/g, category)
  .replace(/{{localidade}}/g, locality)
  .replace(/{{beneficio_principal}}/g, `modernizar o atendimento e a presença online com ${service.toLowerCase()}`)}
"""

2. REGRAS DE CONVERSÃO E ADAPTAÇÃO LOCAL PARA MOÇAMBIQUE:
- Contexto de Moçambique: Em Moçambique, a maioria das decisões e contactos comerciais passa directamente pelo WhatsApp e pagamentos por M-Pesa e e-Mola.
- Ausência de site (empresas sem site): Se a empresa não possui website identificado, destaque como isso faz pessoas desistirem antes de chamar no WhatsApp, e ofereça um rascunho visual/demonstração sem compromisso.
- Proposta de Valor: Foco em parar a sangria de clientes perdidos por respostas lentas ou falta de credibilidade.
- Quebra antecipada de objeções (está caro e sem dinheiro):
  * "Está caro": Mostre que não é um custo, mas um investimento que se paga com 1 a 2 vendas adicionais. "Caro comparado a quê? O que custa caro de verdade é perder clientes todos os dias".
  * "Sem dinheiro": Mostre que a empresa não tem dinheiro justamente porque não possui um sistema ativo de captação e resposta rápida; ofereça modelo leve ou parcelado.
- Fechamento prático: Facilidade de adesão imediata via M-Pesa e e-Mola, sem burocracia, com link direto ou comprovativo para liberação imediata.
- Roteiro de Retomada/Follow-up: "Olá [Nome], tudo bem? Sei que a rotina com o negócio é corrida! Conseguiu ver a proposta de ${service}?".

Gere uma mensagem comercial viva, persuasiva e personalizada para ${businessName} em ${locality}, aplicando os gatilhos desta matriz sem inventar dados não fornecidos.
`.trim();
}
