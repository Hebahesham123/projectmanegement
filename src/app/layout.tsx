import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageProvider';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Project Tracker',
  description: 'Enterprise project & task management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    borderRadius: '12px',
                    background: 'rgba(15,23,42,0.95)',
                    color: '#fff',
                    fontSize: '14px',
                  },
                }}
              />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
