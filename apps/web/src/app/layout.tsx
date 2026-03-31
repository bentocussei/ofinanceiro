import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "O Financeiro",
    description:
      "Gestão financeira pessoal e familiar com IA para Angola e PALOP",
    type: "website",
    locale: "pt_AO",
    siteName: "O Financeiro",
  },
  twitter: {
    card: "summary_large_image",
    title: "O Financeiro",
    description:
      "Gestão financeira pessoal e familiar com IA para Angola e PALOP",
  },
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
      </body>
    </html>
  );
}
