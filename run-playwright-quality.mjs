import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:fs';
import { renderSiteTemplateV3 } from './src/server/site-template-v3.ts';

const sitesToTest = [
  {
    name: 'clinica-odontoart',
    content: {
      themeId: 'clinica-premium',
      businessName: 'OdontoArt Maputo',
      tagline: 'Odontologia Humanizada & Diagnóstico Profundo',
      heroHeadline: 'O Seu Sorriso Tratado com Cuidado Humanizado e Excelência em Maputo',
      heroSubheadline: 'Mais de 10 anos dedicados à saúde oral com tecnologia de ponta, ambiente relaxante e profissionais experientes.',
      aboutText: 'Localizada no coração de Maputo, a OdontoArt combina tradição e inovação médica. Oferecemos tratamentos odontológicos completos num ambiente pensado para o seu conforto.',
      services: [
        { title: 'Ortodontia & Aparelhos', description: 'Alinhamento dentário estético com tecnologia digital e acompanhamento contínuo.', icon: 'sparkles' },
        { title: 'Implantes & Reabilitação', description: 'Devolução da mastigação e do sorriso natural com materiais de padrão internacional.', icon: 'shield' },
        { title: 'Estética & Clareamento', description: 'Tratamentos modernos para um sorriso mais branco, saudável e harmonioso.', icon: 'heart' }
      ],
      address: 'Av. Julius Nyerere, Polana Cimento, Maputo',
      openingHours: 'Segunda a Sexta: 08:00 - 18:00 | Sábado: 08:00 - 13:00',
      phone: '+258 84 312 4567',
      whatsappNumber: '258843124567',
      reviews: [
        { author: 'Dra. Luísa C.', rating: 5, comment: 'Atendimento impecável! Toda a equipa é acolhedora e as instalações são impecáveis.', role: 'Cliente Particular' },
        { author: 'Dr. Fernando M.', rating: 5, comment: 'Melhor clínica de Maputo para implantes e limpeza profunda.', role: 'Advogado' }
      ]
    }
  },
  {
    name: 'salao-glamour',
    content: {
      themeId: 'claro-elegante',
      businessName: 'Glamour Hair & Beauty Lounge',
      tagline: 'Estética Capilar, Unhas & Bem-Estar',
      heroHeadline: 'Realce a Sua Beleza Natural com Tratamentos Exclusivos na Matola',
      heroSubheadline: 'Especialistas em cabelos crespos e ondulados, manicure russa, hidratação profunda e maquilhagem profissional.',
      aboutText: 'Espaço moderno e climatizado na Matola dedicado ao bem-estar e auto-estima da mulher moçambicana com produtos importados de alta qualidade.',
      services: [
        { title: 'Tratamento & Hidratação', description: 'Cronograma capilar intensivo para força, brilho e crescimento saudável.', icon: 'sparkles' },
        { title: 'Manicure & Pedicure Spa', description: 'Unhas de gel e acrílico com esterilização cirúrgica e acabamento de luxo.', icon: 'heart' },
        { title: 'Maquilhagem para Eventos', description: 'Produções completas para noivas, formaturas e sessões fotográficas.', icon: 'star' }
      ],
      address: 'Av. da Liberdade, Matola Fomento',
      openingHours: 'Terça a Sábado: 09:00 - 19:00',
      phone: '+258 82 987 6543',
      whatsappNumber: '258829876543'
    }
  },
  {
    name: 'restaurante-grill',
    content: {
      themeId: 'moderno-escuro',
      businessName: 'Jymmys Grill & Bar',
      tagline: 'Carnes Nobres, Cocktails & Frutos do Mar',
      heroHeadline: 'A Melhor Experiência Gastronómica e Cocktails à Beira-Mar em Maputo',
      heroSubheadline: 'Ambiente lounge exclusivo com vista para o Índico, cortes de carne selecionados e atendimento refinado.',
      aboutText: 'Situado na Marginal de Maputo, o Jymmys Grill oferece uma fusão única entre grelhados suculentos, marisco fresco e coquetelaria autoral.',
      services: [
        { title: 'Grelhados & Carnes Nobres', description: 'Picanha maturada, T-bone e cortes especiais preparados na brasa.', icon: 'award' },
        { title: 'Marisco Fresco do Dia', description: 'Camarão tigre grelhado, lagosta e lulas acompanhadas de molhos da casa.', icon: 'sparkles' },
        { title: 'Bar & Cocktails de Autor', description: 'Carta exclusiva de cocktails clássicos e tropicais num lounge vibrante.', icon: 'star' }
      ],
      address: 'Av. 10 de Novembro, Baía de Maputo',
      openingHours: 'Todos os dias: 12:00 - 23:30',
      phone: '+258 84 747 9441',
      whatsappNumber: '258847479441',
      images: [
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80'
      ]
    }
  }
];

async function runTests() {
  const browser = await chromium.launch({ headless: true });

  for (const s of sitesToTest) {
    const html = renderSiteTemplateV3(s.content, true);
    const htmlFile = `test-screenshots/${s.name}.html`;
    fs.writeFileSync(htmlFile, html);

    // 1. Mobile (390px)
    const pageMobile = await browser.newPage({
      viewport: { width: 390, height: 844 }
    });
    await pageMobile.setContent(html, { waitUntil: 'networkidle' });
    const mobileShot = `test-screenshots/${s.name}-390px.png`;
    await pageMobile.screenshot({ path: mobileShot, fullPage: true });
    console.log(`Saved: ${mobileShot}`);

    // Verifica sobreposição de elementos no cabeçalho
    const brandBox = await pageMobile.locator('.topbar .brand-title').first().boundingBox();
    const btnWaBox = await pageMobile.locator('.topbar .btn-top-wa').first().boundingBox();
    const badgeBox = await pageMobile.locator('.topbar .badge-previa-tag').first().boundingBox();
    console.log(`${s.name} (390px) Topbar Layout:`, {
      brandRight: brandBox ? brandBox.x + brandBox.width : 0,
      badgeLeft: badgeBox ? badgeBox.x : 0,
      btnWaLeft: btnWaBox ? btnWaBox.x : 0,
      noOverlap: (brandBox && badgeBox && btnWaBox) ? ((brandBox.x + brandBox.width) <= badgeBox.x && (badgeBox.x + badgeBox.width) <= btnWaBox.x) : true
    });
    await pageMobile.close();

    // 2. Desktop (1280px)
    const pageDesktop = await browser.newPage({
      viewport: { width: 1280, height: 800 }
    });
    await pageDesktop.setContent(html, { waitUntil: 'networkidle' });
    const desktopShot = `test-screenshots/${s.name}-1280px.png`;
    await pageDesktop.screenshot({ path: desktopShot, fullPage: true });
    console.log(`Saved: ${desktopShot}`);
    await pageDesktop.close();
  }

  await browser.close();
  console.log('--- ALL SCREENSHOTS COMPLETED SUCCESSFULLY ---');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
