import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prospecta — Inteligência Comercial para a CPLP & PALOP',
  description: 'Encontre empresas reais, prepare abordagens com IA e dispare pelo WhatsApp em Moçambique, Angola, Portugal, Brasil e toda a CPLP.',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '64x64' }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
