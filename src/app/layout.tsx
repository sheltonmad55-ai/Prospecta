import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Prospecta — Inteligência comercial para Moçambique',description:'Encontre empresas, prepare abordagens relevantes e acompanhe oportunidades em todo Moçambique.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-MZ"><body>{children}</body></html>;}
