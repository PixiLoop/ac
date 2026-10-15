import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '../providers/auth-provider';
import { ToastProvider } from '../components/ui/toast';
import PwaClient from '../components/pwa/PwaClient';
import { CommentProvider } from '../providers/CommentProvider'
import { OperationsProvider } from '../providers/OperationsContext';

export const metadata = {
  title: 'Fleet Telematics Operations & Job Book',
  description: 'Enterprise fleet management, hardware inventory, FM preinstallation tracking, and technician job book operations platform.',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  icons: {
    icon: '/icons/favicon.ico',
    shortcut: '/icons/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#0f172a" /> */}
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        />
      </head>
      <body>
        {/* Client-only PWA logic */}
        <PwaClient />
        <AuthProvider>
          <ToastProvider>
            <CommentProvider>
              <OperationsProvider>
                {children}
              </OperationsProvider>
            </CommentProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
