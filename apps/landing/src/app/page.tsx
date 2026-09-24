import type { Metadata } from "next";
import Link from "next/link";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { PriceCard } from "@/components/ui/PriceCard";
import { CustomAmountBanner } from "@/components/ui/CustomAmountBanner";
import { InvoiceMockup } from "@/components/ui/InvoiceMockup";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { HOME_FEATURES } from "@/data/features";
import { PRICING_HIGHLIGHTS } from "@/data/pricing";
import { BUSINESS } from "@/data/business";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Facturación, nómina electrónica y documento soporte DIAN",
  description:
    "Emite facturas, notas, nómina electrónica y documento soporte, y acepta las facturas que recibes (RADIAN), desde un solo lugar.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <SiteLayout active="inicio">
      <section className="flex flex-col items-center gap-12 bg-neutralCustom-50 px-6 py-16 md:flex-row md:justify-between md:px-16 md:py-20">
        <div className="max-w-[560px]">
          <span className="mb-5 inline-block rounded-full bg-brand-50 px-3.5 py-1.5 text-[13px] font-bold text-brand-600">
            Facturación · Nómina · Documento soporte · RADIAN
          </span>
          <h1 className="mb-5 text-4xl font-extrabold leading-[1.12] text-neutralCustom-800 md:text-[48px]">
            Tus documentos electrónicos ante la DIAN, en un solo lugar
          </h1>
          <p className="mb-8 text-[17px] leading-relaxed text-neutralCustom-500">
            Emite facturas, notas crédito y débito, nómina electrónica y documento soporte, y registra la aceptación de
            las facturas que te emiten tus proveedores. Pagas por paquetes de documentos, sin mensualidades.
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
            Sin mensualidades ni permanencia · Te ayudamos a configurar tu empresa
          </span>
        </div>

        <InvoiceMockup />
      </section>

      <section aria-labelledby="funciones" className="px-6 py-20 text-center md:px-16 md:py-[88px]">
        <h2 id="funciones" className="mb-3.5 text-[28px] font-extrabold text-neutralCustom-800 md:text-[34px]">
          Todo lo que tu empresa transmite a la DIAN
        </h2>
        <p className="mx-auto mb-12 max-w-[600px] text-base text-neutralCustom-500 md:mb-14">
          De la creación del documento a la respuesta de la DIAN, sin hojas de cálculo ni procesos manuales.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
        <Link
          href="/caracteristicas"
          className="mt-8 inline-block text-[14px] font-semibold text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
        >
          Ver todas las características <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section aria-labelledby="paquetes" className="bg-neutralCustom-50 px-6 py-20 text-center md:px-16 md:py-[88px]">
        <h2 id="paquetes" className="mb-3.5 text-[28px] font-extrabold text-neutralCustom-800 md:text-[34px]">
          Elige cuántos documentos necesitas
        </h2>
        <p className="mx-auto mb-12 max-w-[560px] text-base text-neutralCustom-500 md:mb-14">
          Paquetes prepagados en COP, {BUSINESS.regimenIva.toLowerCase()}. Paga solo por lo que usas.
        </p>
        <div className="mx-auto grid max-w-[920px] grid-cols-2 gap-5 md:grid-cols-4">
          {PRICING_HIGHLIGHTS.map((pkg) => (
            <PriceCard key={pkg.documentos} {...pkg} />
          ))}
        </div>
        <Link
          href="/precios"
          className="mt-6 inline-block text-[14px] font-semibold text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
        >
          Ver todos los paquetes y sus condiciones <span aria-hidden="true">→</span>
        </Link>
        <CustomAmountBanner className="mx-auto mt-8 max-w-[920px]" />
      </section>
    </SiteLayout>
  );
}
