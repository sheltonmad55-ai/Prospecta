import { chromium } from 'playwright';
import fs from 'node:fs';
import { renderSiteTemplateV3 } from './src/server/site-template-v3.ts';

const all6Sites = [
  {
    theme: 'odontoart-champagne',
    name: '1-odontoart-maputo',
    content: {
      themeId: 'odontoart-champagne',
      businessName: 'OdontoArt Maputo',
      tagline: 'Odontologia Humanizada & Diagnóstico Profundo',
      heroHeadline: 'O Seu Sorriso Tratado com Cuidado Humanizado e Excelência',
      heroSubheadline: 'Mais de 10 anos dedicados à saúde oral com tecnologia de ponta, ambiente relaxante e profissionais experientes.',
      aboutText: 'Localizada no coração de Maputo, a OdontoArt combina tradição e inovação médica num ambiente de alto conforto.',
      services: [
        { title: 'Ortodontia & Aparelhos', description: 'Alinhamento dentário estético com tecnologia digital e acompanhamento contínuo.', icon: 'sparkles' },
        { title: 'Implantes & Reabilitação', description: 'Devolução da mastigação e do sorriso natural com materiais de padrão internacional.', icon: 'shield' },
        { title: 'Estética & Clareamento', description: 'Tratamentos modernos para um sorriso mais branco, saudável e harmonioso.', icon: 'heart' }
      ],
      address: 'Av. Julius Nyerere, Polana Cimento, Maputo',
      openingHours: 'Seg-Sex: 08:00 - 18:00 | Sáb: 08:00 - 13:00',
      phone: '+258 84 312 4567',
      whatsappNumber: '258843124567'
    }
  },
  {
    theme: 'prodente-navy-cyan',
    name: '2-prodente-mz',
    content: {
      themeId: 'prodente-navy-cyan',
      businessName: 'Clínica Dentária Pro-Dente 2',
      tagline: 'Alto Maé, Maputo — Saúde Oral de Excelência',
      heroHeadline: 'Saúde Oral Avançada com Máxima Higiene e Conforto no Alto Maé',
      heroSubheadline: 'Equipa multidisciplinar com tratamentos preventivos, cirurgias e estética dentária com biossegurança hospitalar.',
      aboutText: 'Referência consolidada no Alto Maé, a Pro-Dente 2 prioriza diagnósticos precisos e atendimento sem dor.',
      services: [
        { title: 'Clínica Geral & Prevenção', description: 'Check-ups completos, destartarização e restaurações estéticas.', icon: 'shield' },
        { title: 'Próteses Dentárias', description: 'Próteses fixas e removíveis com ajuste milimétrico e durabilidade.', icon: 'award' },
        { title: 'Cirurgia Oral Menor', description: 'Extrações de sisos e pequenos procedimentos com anestesia assistida.', icon: 'heart' }
      ],
      address: 'Rua de Timor, Alto Maé, Maputo',
      openingHours: 'Seg-Sex: 07:30 - 17:30 | Sáb: 08:00 - 12:00',
      phone: '+258 84 102 9384',
      whatsappNumber: '258841029384'
    }
  },
  {
    theme: 'yessir-green-gold',
    name: '3-yessir-dental',
    content: {
      themeId: 'yessir-green-gold',
      businessName: 'Yes Sir Dental Clinic Group',
      tagline: 'Excelência Odontológica em Maputo e Machava',
      heroHeadline: 'Sorrisos Saudáveis e Cuidados Odontológicos Completos para Toda a Família',
      heroSubheadline: 'Unidades modernas com equipamentos de última geração e compromisso com o atendimento ético e humanizado.',
      aboutText: 'O grupo Yes Sir Dental Clinic destaca-se pela proximidade com a comunidade, acções solidárias e tratamentos de vanguarda.',
      services: [
        { title: 'Odontopediatria', description: 'Atendimento lúdico e cuidadoso para crianças e adolescentes sem medos.', icon: 'heart' },
        { title: 'Endodontia Mecanizada', description: 'Tratamento de canais com instrumentação rotatória rápida e indolor.', icon: 'sparkles' },
        { title: 'Harmonização Orofacial', description: 'Procedimentos estéticos para equilíbrio e beleza do sorriso e face.', icon: 'star' }
      ],
      address: 'Av. Eduardo Mondlane, Maputo & Unidade Machava',
      openingHours: 'Seg-Sáb: 08:00 - 19:00',
      phone: '+258 87 555 4321',
      whatsappNumber: '258875554321'
    }
  },
  {
    theme: 'vitalmed-blue',
    name: '4-vitalmed-clinic',
    content: {
      themeId: 'vitalmed-blue',
      businessName: 'Vitalmed Clinic Matola',
      tagline: 'Cuidados Médicos, Dentários & Análises Clínicas',
      heroHeadline: 'Cuidados Integrados de Saúde e Medicina Dentária na Cidade da Matola',
      heroSubheadline: 'Atendimento clínico com médicos especialistas, convénios com seguradoras e exames laboratoriais no mesmo local.',
      aboutText: 'A Vitalmed Clinic nasceu na Matola para proporcionar cuidados de saúde de qualidade com rapidez, dignidade e preços justos.',
      services: [
        { title: 'Medicina Dentária Geral', description: 'Consultas de rotina, urgências e tratamentos especializados para adultos.', icon: 'shield' },
        { title: 'Clínica Geral & Especialidades', description: 'Pediatria, ginecologia e medicina familiar com marcação ágil.', icon: 'heart' },
        { title: 'Análises Clínicas', description: 'Colheita e resultados rápidos com tecnologia laboratorial moderna.', icon: 'sparkles' }
      ],
      address: 'Av. da Liberdade, Cidade da Matola',
      openingHours: 'Seg-Sex: 07:00 - 20:00 | Sáb-Dom: 08:00 - 14:00',
      phone: '+258 84 800 1122',
      whatsappNumber: '258848001122'
    }
  },
  {
    theme: 'dentalhome-royal',
    name: '5-dentalhome-mz',
    content: {
      themeId: 'dentalhome-royal',
      businessName: 'DentalHome Consultórios',
      tagline: 'Maputo · Inhambane · Maxixe',
      heroHeadline: 'A Sua Casa de Saúde Oral em Maputo, Inhambane e Maxixe',
      heroSubheadline: 'Rede de consultórios dentários com especialistas em reabilitação oral, estética e tratamentos preventivos.',
      aboutText: 'Presente nas principais províncias, a DentalHome une padrão técnico superior e facilidade de marcação online.',
      services: [
        { title: 'Reabilitação Estética', description: 'Facetas e restaurações cerâmicas com precisão e harmonia visual.', icon: 'star' },
        { title: 'Aparelhos Autoligáveis', description: 'Tratamentos ortodônticos mais rápidos e higiênicos com tecnologia moderna.', icon: 'sparkles' },
        { title: 'Profilaxia Profunda', description: 'Remoção de tártaro e manchas com ultrassom e polimento coronário.', icon: 'shield' }
      ],
      address: 'Av. 24 de Julho, Maputo',
      openingHours: 'Seg-Sex: 08:00 - 18:00 | Sáb: 08:00 - 13:00',
      phone: '+258 84 400 9090',
      whatsappNumber: '258844009090'
    }
  },
  {
    theme: 'dentalcare-emerald',
    name: '6-clinicasdentalcare',
    content: {
      themeId: 'dentalcare-emerald',
      businessName: 'Dental Care Clínicas Dentárias',
      tagline: 'Mais de 30.000 Sorrisos Atendidos em Moçambique',
      heroHeadline: 'Líder em Cuidados Odontológicos e Convénios de Saúde em Moçambique',
      heroSubheadline: 'Estrutura completa com bloco operatório ambulatório, corpo clínico sénior e convénio com as principais seguradoras.',
      aboutText: 'Com décadas de dedicação à saúde em Moçambique, as Clínicas Dental Care são sinónimo de segurança e resultados clínicos comprovados.',
      services: [
        { title: 'Ortodontia Digital', description: 'Planeamento computadorizado e aparelhos invisíveis para todas as idades.', icon: 'sparkles' },
        { title: 'Cirurgia e Implantes', description: 'Implantes com carga imediata e regeneração óssea guiada.', icon: 'shield' },
        { title: 'Atendimento a Convénios', description: 'Parceria direta com seguradoras nacionais e internacionais.', icon: 'check' }
      ],
      address: 'Av. Vladimir Lenine, Maputo',
      openingHours: 'Seg-Sex: 08:00 - 19:00 | Sáb: 08:00 - 14:00',
      phone: '+258 82 123 4567',
      whatsappNumber: '258821234567'
    }
  }
];

async function generateAll() {
  const browser = await chromium.launch({ headless: true });
  for (const item of all6Sites) {
    const html = renderSiteTemplateV3(item.content, true);
    fs.writeFileSync(`test-screenshots/${item.name}.html`, html);

    // Mobile 390px
    const pageM = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageM.setContent(html, { waitUntil: 'networkidle' });
    await pageM.screenshot({ path: `test-screenshots/${item.name}-390px.png`, fullPage: true });

    // Header layout verification
    const brand = await pageM.locator('.topbar .brand-title').first().boundingBox();
    const badge = await pageM.locator('.topbar .badge-previa-tag').first().boundingBox();
    const btnWa = await pageM.locator('.topbar .btn-top-wa').first().boundingBox();
    console.log(`[VERIFIED 390px] ${item.name}:`, {
      brandRight: brand ? Math.round(brand.x + brand.width) : 0,
      badgeLeft: badge ? Math.round(badge.x) : 0,
      btnWaLeft: btnWa ? Math.round(btnWa.x) : 0,
      noOverlap: (brand && badge && btnWa) ? (brand.x + brand.width <= badge.x && badge.x + badge.width <= btnWa.x) : true
    });
    await pageM.close();

    // Desktop 1280px
    const pageD = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await pageD.setContent(html, { waitUntil: 'networkidle' });
    await pageD.screenshot({ path: `test-screenshots/${item.name}-1280px.png`, fullPage: true });
    await pageD.close();
  }
  await browser.close();
  console.log('=== ALL 6 REAL SITES RENDERED AND VERIFIED ===');
}

generateAll().catch(e => {
  console.error(e);
  process.exit(1);
});
