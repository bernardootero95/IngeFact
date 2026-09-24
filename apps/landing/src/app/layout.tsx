import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { FloatingWhatsAppButton } from "@/components/ui/FloatingWhatsAppButton";
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
    default: "IngeFact — Facturación, nómina electrónica y documento soporte DIAN",
    template: "%s | IngeFact",
  },
  description:
    "Emite facturas, notas, nómina electrónica y documento soporte, y acepta las facturas que recibes (RADIAN), desde un solo lugar.",
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "IngeFact",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={inter.variable}>
      <body className="font-sans text-neutralCustom-800 antialiased">
        {children}
        <FloatingWhatsAppButton />
      </body>
    </html>
  );
}
