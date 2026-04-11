export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'sonner';
import ThemeProvider from '@/components/theme/Provider';
import configManager from '@/lib/config';
import SetupWizard from '@/components/Setup/SetupWizard';
import { ChatProvider } from '@/lib/hooks/useChat';
import { Suspense } from 'react';

const montserrat = Montserrat({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const metadata: Metadata = {
  title: 'Perplexica - Chat with the internet',
  description:
    'Perplexica is an AI powered chatbot that is connected to the internet.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Perplexica',
  },
  icons: {
    icon: [
      { url: '/icon-50.png', sizes: '50x50', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const setupComplete = configManager.isSetupComplete();
  const configSections = configManager.getUIConfigSections();

  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body className={cn('h-full antialiased', montserrat.className)}>
        <ThemeProvider>
          {setupComplete ? (
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen w-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-light-200 dark:border-dark-200 border-t-[var(--accent)] rounded-full animate-spin" role="status" aria-label="Loading application" />
                  <p className="text-xs text-black/40 dark:text-white/40">Loading…</p>
                </div>
              </div>
            }>
              <ChatProvider>
                <Sidebar>{children}</Sidebar>
                <Toaster
                  toastOptions={{
                    unstyled: true,
                    classNames: {
                      toast:
                        'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                    },
                  }}
                />
              </ChatProvider>
            </Suspense>
          ) : (
            <SetupWizard configSections={configSections} />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
