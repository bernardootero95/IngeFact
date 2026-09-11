import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { PriceCard } from "@/components/ui/PriceCard";
import { CustomAmountBanner } from "@/components/ui/CustomAmountBanner";
import { InvoiceMockup } from "@/components/ui/InvoiceMockup";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/icons";
import Link from "next/link";
import { HOME_FEATURES } from "@/data/features";
import { PRICING_HIGHLIGHTS } from "@/data/pricing";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Facturación electrónica DIAN Colombia",
  description:
    "Factura electrónica ante la DIAN sin dolores de cabeza. Crea, envía y controla tus facturas, notas crédito y débito desde un solo lugar.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Header active="inicio" />

      <section className="flex flex-col items-center gap-12 bg-neutralCustom-50 px-6 py-16 md:flex-row md:justify-between md:px-16 md:py-20">
        <div className="max-w-[540px]">
          <span className="mb-5 inline-block rounded-full bg-brand-50 px-3.5 py-1.5 text-[13px] font-bold text-brand-600">
            Facturación electrónica · DIAN Colombia
          </span>
          <h1 className="mb-5 text-4xl font-extrabold leading-[1.12] text-neutralCustom-800 md:text-[48px]">
            Factura electrónica ante la DIAN, sin dolores de cabeza
          </h1>
          <p className="mb-8 text-[17px] leading-relaxed text-neutralCustom-500">
            IngeFact conecta tu empresa con la DIAN: crea, envía y controla tus facturas, notas crédito y débito
            electrónicas desde un solo lugar, cumpliendo la normativa colombiana desde el primer documento.
          </p>
          <div className="mb-5 flex flex-wrap gap-3.5">
            <PrimaryButton
              href={buildWhatsAppLink("Hola, quiero comprar un paquete de documentos de IngeFact.")}
              external
              icon={<WhatsAppIcon className="h-4 w-4" />}
              className="py-3.5 text-base"
            >
              Comprar
            </PrimaryButton>
            <SecondaryButton href="/precios">Ver precios</SecondaryButton>
          </div>
          <span className="text-[13px] text-neutralCustom-500">
            Te respondemos por WhatsApp el mismo día · Cumplimiento DIAN incluido
          </span>
        </div>

        <InvoiceMockup />
      </section>

      <section className="px-6 py-20 text-center md:px-16 md:py-[88px]">
        <h2 className="mb-3.5 text-[28px] font-extrabold text-neutralCustom-800 md:text-[34px]">
          Todo lo que necesitas para facturar, en un solo lugar
        </h2>
        <p className="mx-auto mb-12 max-w-[560px] text-base text-neutralCustom-500 md:mb-14">
          De la creación del documento hasta su aceptación ante la DIAN, sin depender de hojas de cálculo ni procesos
          manuales.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="bg-neutralCustom-50 px-6 py-20 text-center md:px-16 md:py-[88px]">
        <h2 className="mb-3.5 text-[28px] font-extrabold text-neutralCustom-800 md:text-[34px]">
          Elige cuántos documentos necesitas
        </h2>
        <p className="mx-auto mb-12 max-w-[520px] text-base text-neutralCustom-500 md:mb-14">
          Planes flexibles de facturación electrónica. Paga solo por lo que tu negocio necesita.
        </p>
        <div className="mx-auto grid max-w-[920px] grid-cols-2 gap-5 md:grid-cols-4">
          {PRICING_HIGHLIGHTS.map((pkg) => (
            <PriceCard key={pkg.documentos} {...pkg} />
          ))}
        </div>
        <Link href="/precios" className="mt-6 inline-block text-[14px] font-semibold text-brand-600 hover:text-brand-400">
          Ver todos los paquetes →
        </Link>
        <CustomAmountBanner className="mx-auto mt-8 max-w-[920px]" />
      </section>

      <section className="px-6 py-20 text-center md:px-16">
        <h2 className="mb-2.5 text-[26px] font-extrabold text-neutralCustom-800 md:text-[28px]">
          Empresas que confían en IngeFact
        </h2>
        <p className="mb-10 text-[15px] text-neutralCustom-500">
          Muy pronto compartiremos aquí las historias de nuestros primeros clientes.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((placeholder) => (
            <div
              key={placeholder}
              className="flex flex-col items-center gap-2.5 rounded-brand-lg border-[1.5px] border-dashed border-neutralCustom-100 bg-neutralCustom-50 px-6 py-9"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-neutralCustom-500" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M7 8a3 3 0 0 0-3 3v5h5v-5H6a2 2 0 0 1 2-2V8z" />
                <path d="M17 8a3 3 0 0 0-3 3v5h5v-5h-3a2 2 0 0 1 2-2V8z" />
              </svg>
              <span className="text-[13px] text-neutralCustom-500">Espacio reservado para testimonio de cliente</span>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
