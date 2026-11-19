import { db, now } from './src/server/db.ts';
import { renderSiteTemplateV3 } from './src/server/site-template-v3.ts';

const sitesToSeed = [
  // 1. Nicho Clínica - OdontoArt
  {
    slug: 'route-test-clinica',
    name: 'Clínica OdontoArt Maputo',
    niche: 'clinica',
    content: {
      themeId: 'odontoart-champagne',
      businessName: 'OdontoArt Maputo',
      tagline: 'Odontologia Humanizada & Diagnóstico Profundo',
      heroVariant: 'split',
      heroHeadline: 'O Seu Sorriso com Tratamento Humanizado e Tecnologia em Maputo',
      heroSubheadline: 'Mais de 10 anos dedicados à saúde oral com tecnologia de ponta, ambiente relaxante e profissionais experientes.',
      aboutTitle: 'A Nossa Missão',
      aboutText: 'Localizada no coração de Maputo, a OdontoArt combina tradição e inovação médica. Oferecemos tratamentos odontológicos completos num ambiente pensado para o seu conforto.',
      servicesTitle: 'Especialidades Odontológicas',
      servicesSubtitle: 'Tratamentos de padrão internacional adaptados ao seu caso.',
      services: [
        { title: 'Ortodontia Digital', description: 'Alinhamento com aparelhos estéticos e transparentes.', icon: 'sparkles' },
        { title: 'Implantes Dentários', description: 'Reabilitação total com precisão milimétrica.', icon: 'shield' },
        { title: 'Estética & Clareamento', description: 'Sorrisos harmoniosos com técnicas modernas.', icon: 'heart' }
      ],
      address: 'Av. Julius Nyerere, Polana Cimento, Maputo',
      openingHours: 'Seg-Sex: 08:00 - 18:00 | Sáb: 08:00 - 13:00',
      phone: '+258 84 312 4567',
      whatsappNumber: '258843124567'
    }
  },

  // 2. Nicho Salão - Glamour Hair
  {
    slug: 'route-test-salao',
    name: 'Glamour Hair & Beauty Lounge',
    niche: 'salao',
    content: {
      themeId: 'dentalcare-emerald',
      businessName: 'Glamour Hair Lounge',
      tagline: 'Estética Capilar, Unhas & Spa na Matola',
      heroVariant: 'banner',
      heroHeadline: 'Realce a Sua Beleza Natural com Tratamentos Exclusivos',
      heroSubheadline: 'Especialistas em cabelos crespos, cacheados, manicure russa e spa de mãos com produtos de alto padrão.',
      aboutTitle: 'Sobre o Lounge',
      aboutText: 'Espaço contemporâneo e climatizado na Matola dedicado ao bem-estar e auto-estima da mulher moçambicana com atendimento individualizado.',
      servicesTitle: 'Serviços de Beleza & Estética',
      servicesSubtitle: 'Cuidado profissional para cada detalhe da sua imagem.',
      services: [
        { title: 'Tratamentos Capilares', description: 'Hidratação profunda e recuperação de fios.', icon: 'sparkles' },
        { title: 'Manicure & Pedicure Spa', description: 'Unhas de gel e spa relaxante.', icon: 'heart' },
        { title: 'Maquilhagem Profissional', description: 'Produções para noivas, eventos e sessões.', icon: 'star' }
      ],
      address: 'Av. da Liberdade, Matola Fomento',
      openingHours: 'Ter-Sáb: 09:00 - 19:00',
      phone: '+258 82 987 6543',
      whatsappNumber: '258829876543'
    }
  },

  // 3. Nicho Restaurante - Jymmys Grill & Bar
  {
    slug: 'route-test-restaurante',
    name: 'Jymmys Grill & Bar Baía',
    niche: 'restaurante',
    content: {
      themeId: 'moderno-escuro',
      businessName: 'Jymmys Grill & Bar',
      tagline: 'Carnes Nobres, Cocktails & Frutos do Mar',
      heroVariant: 'banner',
      heroHeadline: 'A Melhor Experiência Gastronómica e Cocktails à Beira-Mar em Maputo',
      heroSubheadline: 'Ambiente lounge exclusivo com vista para o Índico, cortes de carne selecionados e atendimento refinado.',
      aboutTitle: 'A Nossa Cozinha',
      aboutText: 'Localizado no recinto do Hotel Radisson em Maputo, o Jymmys Grill and Bar oferece cortes nobres grelhados na brasa, marisco fresco e carta de cocktails artesanais.',
      servicesTitle: 'Menu de Especialidades',
      servicesSubtitle: 'Pratos elaborados com ingredientes frescos e sabor autêntico.',
      services: [
        { title: 'Carnes Nobres & Grelhados', description: 'Picanha maturada, Tomahawk e eisbein suculento.', icon: 'award' },
        { title: 'Mariscos Frescos da Costa', description: 'Camarão tigre, lagosta grelhada e peixe do dia.', icon: 'sparkles' },
        { title: 'Bar & Coquetelaria Fina', description: 'Cocktails clássicos, gins especiais e happy hour.', icon: 'star' }
      ],
      address: 'Av. da Marginal, Hotel Radisson, Maputo',
      openingHours: 'Todos os dias: 12:00 - 23:30',
      phone: '+258 84 747 9441',
      whatsappNumber: '258847479441'
    }
  },

  // 4. Tema 1: OdontoArt (Champagne Editorial)
  {
    slug: 'theme-odontoart',
    name: 'Tema 1 - OdontoArt Champagne',
    niche: 'clinica',
    content: {
      themeId: 'odontoart-champagne',
      businessName: 'OdontoArt Maputo',
      tagline: 'Champagne Editorial & Linho',
      heroVariant: 'split',
      heroHeadline: 'Odontologia de Prestígio com Toque Editorial e Atendimento Humanizado',
      heroSubheadline: 'Espaço sereno em tons de champagne e linho, desenhado para transformar a sua consulta odontológica num momento de tranquilidade.',
      aboutText: 'A OdontoArt nasceu do compromisso de unir ciência médica de ponta ao conforto e requinte que cada paciente merece.',
      services: [
        { title: 'Check-up Preventivo', description: 'Avaliação digital detalhada com câmara intraoral.', icon: 'shield' },
        { title: 'Facetas em Resina & Porcelana', description: 'Harmonização estética natural e refinada.', icon: 'sparkles' }
      ],
      address: 'Av. Julius Nyerere, Polana, Maputo',
      openingHours: 'Seg-Sex: 08:00 - 18:00',
      phone: '+258 84 312 4567',
      whatsappNumber: '258843124567'
    }
  },

  // 5. Tema 2: ProDente (Azul Marinho & Ciano)
  {
    slug: 'theme-prodente',
    name: 'Tema 2 - ProDente Navy & Cyan',
    niche: 'clinica',
    content: {
      themeId: 'prodente-navy-cyan',
      businessName: 'Pro-Dente 2 Alto Maé',
      tagline: 'Azul Tecnológico & Ciano Clínico',
      heroVariant: 'centered',
      heroHeadline: 'Precisão Tecnológica e Confiança Médica no Alto Maé',
      heroSubheadline: 'Consultório moderno equipado com diagnóstico computadorizado e radiologia digital para tratamentos rápidos e indolores.',
      aboutText: 'Referência clínica no Alto Maé, a Pro-Dente 2 garante máxima segurança e protocolos clínicos com tecnologia de última geração.',
      services: [
        { title: 'Implantologia Guiada', description: 'Cirurgia guiada por computador sem dor.', icon: 'shield' },
        { title: 'Ortodontia Autoligável', description: 'Alinhamento dentário rápido e discreto.', icon: 'sparkles' }
      ],
      address: 'Rua do Alto Maé, Maputo',
      openingHours: 'Seg-Sáb: 08:00 - 19:00',
      phone: '+258 84 222 3344',
      whatsappNumber: '258842223344'
    }
  },

  // 6. Tema 3: YesSir (Verde Nobre & Dourado)
  {
    slug: 'theme-yessir',
    name: 'Tema 3 - Yes Sir Verde & Dourado',
    niche: 'clinica',
    content: {
      themeId: 'yessir-green-gold',
      businessName: 'Yes Sir Dental Clinic',
      tagline: 'Verde Floresta & Dourado Nobre',
      heroVariant: 'banner',
      heroHeadline: 'Excelência Odontológica de Grupo com Padrão Distinto',
      heroSubheadline: 'Tradição, solidez e acompanhamento médico contínuo para si e para toda a sua família na Polana.',
      aboutText: 'O Grupo Yes Sir Dental combina décadas de experiência de corpo clínico especializado com acolhimento caloroso.',
      services: [
        { title: 'Reabilitação Oral Global', description: 'Tratamentos integrados de alta complexidade.', icon: 'award' },
        { title: 'Endodontia Microscópica', description: 'Tratamento de canais com microscópio cirúrgico.', icon: 'shield' }
      ],
      address: 'Bairro da Polana, Maputo',
      openingHours: 'Seg-Sex: 08:00 - 17:30',
      phone: '+258 84 456 7890',
      whatsappNumber: '258844567890'
    }
  },

  // 7. Tema 4: VitalMed (Azul Hospitalar)
  {
    slug: 'theme-vitalmed',
    name: 'Tema 4 - VitalMed Blue',
    niche: 'clinica',
    content: {
      themeId: 'vitalmed-blue',
      businessName: 'Vitalmed Clinic Matola',
      tagline: 'Azul Cerúleo & Segurança Hospitalar',
      heroVariant: 'split',
      heroHeadline: 'Cuidado Médico Integral e Diagnóstico Seguro na Matola',
      heroSubheadline: 'Infraestrutura completa com especialistas dedicados e farmácia integrada para atendimento ágil.',
      aboutText: 'A Vitalmed Clinic Matola oferece atendimento clínico multiprofissional com foco na atenção primária e prevenção ativa.',
      services: [
        { title: 'Medicina Dentária Preventiva', description: 'Rastreio clínico e proteção esmalte.', icon: 'shield' },
        { title: 'Atendimento de Urgência', description: 'Apoio rápido em dor dentária e trauma.', icon: 'heart' }
      ],
      address: 'Estrada Velha da Matola',
      openingHours: '24 Horas / Todos os Dias',
      phone: '+258 82 111 2233',
      whatsappNumber: '258821112233'
    }
  },

  // 8. Tema 5: DentalHome (Royal Navy & Cyan)
  {
    slug: 'theme-dentalhome',
    name: 'Tema 5 - DentalHome Royal',
    niche: 'clinica',
    content: {
      themeId: 'dentalhome-royal',
      businessName: 'DentalHome Consultórios',
      tagline: 'Royal Navy & Ciano Vibrante',
      heroVariant: 'centered',
      heroHeadline: 'Sinta-se em Casa com o Melhor Cuidado Dentário',
      heroSubheadline: 'Um espaço caloroso e acolhedor onde a saúde dos seus dentes é tratada com total carinho e profissionalismo.',
      aboutText: 'Criado para eliminar o medo do consultório, o DentalHome oferece um ambiente familiar e atendimento humanizado.',
      services: [
        { title: 'Odontopediatria Amiga', description: 'Atendimento lúdico e sem medo para os mais novos.', icon: 'heart' },
        { title: 'Limpeza Ultrassónica & Jato', description: 'Higiene profunda com conforto total.', icon: 'sparkles' }
      ],
      address: 'Sommerschield, Maputo',
      openingHours: 'Seg-Sex: 08:30 - 18:30',
      phone: '+258 84 999 8877',
      whatsappNumber: '258849998877'
    }
  },

  // 9. Tema 6: DentalCare (Esmeralda & Saúde)
  {
    slug: 'theme-dentalcare',
    name: 'Tema 6 - Dental Care Esmeralda',
    niche: 'clinica',
    content: {
      themeId: 'dentalcare-emerald',
      businessName: 'Dental Care Clínicas',
      tagline: 'Esmeralda Moderno & Frescura',
      heroVariant: 'banner',
      heroHeadline: 'Saúde Oral Viva, Fresca e Acessível a Todos',
      heroSubheadline: 'Planos familiares, atendimento rápido e facilidades de pagamento para manter o seu sorriso sempre saudável.',
      aboutText: 'A Dental Care trabalha com a missão de democratizar a saúde oral de alta qualidade em Moçambique.',
      services: [
        { title: 'Plano Saúde Oral Familiar', description: 'Cobertura anual com consultas ilimitadas.', icon: 'shield' },
        { title: 'Branqueamento a Laser', description: 'Dentes mais claros e brilhantes em sessão única.', icon: 'sparkles' }
      ],
      address: 'Av. Eduardo Mondlane, Maputo',
      openingHours: 'Seg-Sáb: 08:00 - 18:00',
      phone: '+258 84 888 7766',
      whatsappNumber: '258848887766'
    }
  }
];

function seed() {
  const database = db();
  const user = database.prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined;
  const userId = user?.id || 'admin';
  const timestamp = now();

  for (const s of sitesToSeed) {
    const html = renderSiteTemplateV3(s.content as any, true);
    database.prepare(`
      INSERT OR REPLACE INTO generated_sites (
        id, user_id, slug, business_name, niche, source_data, images, html, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'seed_' + s.slug,
      userId,
      s.slug,
      s.name,
      s.niche,
      JSON.stringify({ ...s.content, _content: s.content }),
      JSON.stringify([]),
      html,
      'draft',
      timestamp,
      timestamp
    );
    console.log(`[Seed OK]: ${s.slug} -> http://127.0.0.1:4317/s/${s.slug}`);
  }
}

seed();
