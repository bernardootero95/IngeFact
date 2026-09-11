import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = "https://ingefact.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IngeFact — Facturación electrónica DIAN Colombia",
    template: "%s | IngeFact",
  },
  description:
    "IngeFact conecta tu empresa con la DIAN: crea, envía y controla tus facturas, notas crédito y débito electrónicas desde un solo lugar.",
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "IngeFact",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans text-neutralCustom-800 antialiased">{children}</body>
    </html>
  );
}
