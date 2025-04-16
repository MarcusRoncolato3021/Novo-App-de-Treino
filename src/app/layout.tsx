import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import ClientLayout from './ClientLayout';

const inter = Inter({ subsets: ['latin'] });

const BackupInitializer = dynamic(() => import('@/components/BackupInitializer'), { 
  ssr: false 
});

export const metadata: Metadata = {
  title: 'App Treino',
  description: 'Aplicativo para controle de treinos',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#e6f1ff'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#e6f1ff" />
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
        <BackupInitializer />
      </body>
    </html>
  );
} 
