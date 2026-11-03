import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SITE } from '@/lib/site';
import { Providers } from '@/components/chrome/Providers';
import { Chrome } from '@/components/chrome/Chrome';
import './globals.css';

// Self-hosted variable fonts (copied from @fontsource-variable by scripts/copy-fonts.mjs), preloaded, no layout shift.
const display = localFont({
  src: [
    { path: '../fonts/Fraunces-var.woff2', style: 'normal' },
    { path: '../fonts/Fraunces-var-italic.woff2', style: 'italic' },
  ],
  weight: '100 900',
  variable: '--nv-display',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});
const body = localFont({
  src: '../fonts/InterTight-var.woff2',
  weight: '100 900',
  variable: '--nv-body',
  display: 'swap',
  adjustFontFallback: 'Arial',
});
const mono = localFont({
  src: '../fonts/JetBrainsMono-var.woff2',
  weight: '100 800',
  variable: '--nv-mono',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  openGraph: {
    type: 'website', url: SITE.url, siteName: SITE.name, title: SITE.title, description: SITE.description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Nayan Vangala. AI and hardware projects.' }],
  },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description, images: ['/og.png'] },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f4efe6' }, { media: '(prefers-color-scheme: dark)', color: '#1b1714' }],
  width: 'device-width',
  initialScale: 1,
};

// Runs before paint: marks JS-on (so [data-reveal] hides only when it can be revealed) and applies the saved theme.
const bootScript = `(function(){try{var d=document.documentElement;d.classList.add('js');var t=localStorage.getItem('nv-theme');if(t==='dark'||t==='light')d.setAttribute('data-theme',t);if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('reduced');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <Providers>
          <Chrome />
          <main id="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
