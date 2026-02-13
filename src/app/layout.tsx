import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { GDPRBanner } from "@/components/layout/GDPRBanner";

export const metadata: Metadata = {
  title: "Ademruimte | Evidence-based hulp bij hyperventilatie",
  description: "Evidence-based hulp bij hyperventilatie en gerelateerde klachten",
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
        <I18nProvider>
          <AuthProvider>
            {children}
            <GDPRBanner />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
