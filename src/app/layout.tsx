import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { DarkModeProvider } from "@/contexts/DarkModeContext";
import { GDPRBanner } from "@/components/layout/GDPRBanner";
import { PWAInstall } from "@/components/pwa/PWAInstall";

export const metadata: Metadata = {
  title: "Ademruimte | Evidence-based hulp bij hyperventilatie",
  description: "Evidence-based hulp bij hyperventilatie en gerelateerde klachten",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ademruimte",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#667eea" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <DarkModeProvider>
          <I18nProvider>
            <AuthProvider>
              {children}
              <GDPRBanner />
              <PWAInstall />
            </AuthProvider>
          </I18nProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
