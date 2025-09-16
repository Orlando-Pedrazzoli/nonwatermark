import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'NonWatermark Pro - Advanced AI Watermark Remover',
  description:
    "Remove watermarks from images instantly with the world's most advanced AI technology. 100% private, no uploads, perfect quality.",
  keywords: [
    'watermark remover',
    'remove watermark',
    'AI watermark removal',
    'image editor',
    'photo editor',
    'watermark eraser',
    'clean images',
    'remove logo',
    'remove text from image',
  ],
  authors: [{ name: 'NonWatermark Pro' }],
  robots: 'index, follow',
  openGraph: {
    title: 'NonWatermark Pro - Advanced AI Watermark Remover',
    description:
      'Remove watermarks instantly with AI. 100% private, no uploads.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NonWatermark Pro',
    description: 'Remove watermarks instantly with AI',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className='dark'>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
