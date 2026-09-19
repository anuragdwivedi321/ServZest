import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';

export const metadata: Metadata = {
  title: 'QuickKaam - On-demand Home Services in ~20 Mins',
  description: 'Book electricians, plumbers, laborers (majdoor), mechanics and AC technicians with transparent pricing',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f59e0b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 antialiased flex justify-center">
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <div className="w-full max-w-md min-h-screen bg-white shadow-xl flex flex-col relative pb-20 border-x border-gray-100">
                <Header />
                <main className="flex-1 p-4">{children}</main>
                <BottomNav />
              </div>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
