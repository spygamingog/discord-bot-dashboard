import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SpyGaming Bot Studio | Discord RAG & AI Control Center',
  description:
    'Administrative control center, vector knowledge studio, live telemetry, and AI prompt engineer for SpyGaming Discord Bot.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#07090E] text-[#E2E8F0] antialiased selection:bg-[#5865F2]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
