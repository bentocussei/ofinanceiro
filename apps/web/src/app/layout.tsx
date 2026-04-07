import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/layout/PWARegister";
import { InstallPWAPrompt } from "@/components/layout/InstallPWAPrompt";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "O Financeiro — Gestão financeira pessoal e familiar",
  description:
    "Saiba exactamente para onde vai o seu dinheiro. Controle contas, orçamentos, metas e finanças familiares.",
  applicationName: "O Financeiro",
  appleWebApp: {
    capable: true,
    title: "O Financeiro",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "O Financeiro",
    description:
      "Gestão financeira pessoal e familiar para Angola",
    type: "website",
    locale: "pt_AO",
    siteName: "O Financeiro",
  },
  twitter: {
    card: "summary_large_image",
    title: "O Financeiro",
    description:
      "Gestão financeira pessoal e familiar para Angola",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0D9488" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F0F" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-AO"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" richColors />
        <PWARegister />
        <InstallPWAPrompt />
      </body>
    </html>
  );
}
