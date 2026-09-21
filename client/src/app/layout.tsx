import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';
import { Footer } from '../components/common/Footer';
import { AppRuntime } from '../components/common/AppRuntime';
import { FeedbackProvider } from '../context/FeedbackContext';

export const metadata: Metadata = {
  title: 'ServZest — Home, taken care of',
  description: 'Book electricians, plumbers, laborers (majdoor), mechanics and AC technicians with transparent pricing',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ServZest' },
  icons: { icon: '/servzest-mark.svg', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#183d33',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[var(--surface-ground)] antialiased text-slate-900 min-h-screen flex flex-col">
        <FeedbackProvider>
          <LanguageProvider>
            <AuthProvider>
              <SocketProvider>
                <AppRuntime />
                <div className="min-h-screen flex flex-col relative pb-24 lg:pb-0">
                  <Header />
                  <main className="app-main flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                    {children}
                  </main>
                  <Footer />
                  <BottomNav />
                </div>
              </SocketProvider>
            </AuthProvider>
          </LanguageProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
