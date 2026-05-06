import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Readapt — ADHD Reader',
  description:
    'Readapt transforms any text into a format your ADHD brain actually locks onto. Take the free 2-minute quiz, get your personalized reading preset, and read faster with more focus.',
  keywords: 'ADHD reading, bionic reading, focus reading, ADHD tool, reading enhancement',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Readapt — Built for ADHD Brains',
    description: 'Read faster. Stay focused. Finally.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect so fonts load before first paint — eliminates zoom flicker */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
