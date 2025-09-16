import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NonWatermark - Remove Watermarks from Images Instantly',
  description:
    'Remove watermarks from images in seconds with AI-powered technology. 100% private, no uploads required.',
  keywords: [
    'remove watermark',
    'watermark remover',
    'AI image editing',
    'clean images',
  ],
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
