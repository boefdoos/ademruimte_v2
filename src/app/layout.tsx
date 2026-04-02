import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { DarkModeProvider } from "@/contexts/DarkModeContext";
import { GDPRBanner } from "@/components/layout/GDPRBanner";
import { PWAInstall } from "@/components/pwa/PWAInstall";
import { BSRWidget } from "@/components/bsr/BSRWidget";
import { BSRProvider } from "@/contexts/BSRContext";

export const metadata: Metadata = {
  title: "Ademruimte | Evidence-based hulp bij hyperventilatie",
  description: "Evidence-based hulp bij hyperventilatie en gerelateerde klachten",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ademruimte",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <DarkModeProvider>
          <I18nProvider>
            <AuthProvider>
              <BSRProvider>
                {children}
                <GDPRBanner />
                <PWAInstall />
                <BSRWidget />
              </BSRProvider>
            </AuthProvider>
          </I18nProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
