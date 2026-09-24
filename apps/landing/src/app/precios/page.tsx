import type { Metadata } from "next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PriceCard } from "@/components/ui/PriceCard";
import { CustomAmountBanner } from "@/components/ui/CustomAmountBanner";
import { FaqList } from "@/components/ui/FaqList";
import { PricingConditions } from "@/components/ui/PricingConditions";
import { PRICING_PACKAGES } from "@/data/pricing";
import { PRICING_FAQ } from "@/data/faq";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Paquetes prepagados de documentos electrónicos, desde 10 hasta 5.000 documentos, válidos por 12 meses. Facturas, notas, nómina, documento soporte y eventos RADIAN.",
  alternates: { canonical: "/precios" },
};

export default function PreciosPage() {
  return (
    <SiteLayout active="precios">
      <section className="bg-neutralCustom-50 px-6 py-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">
          Elige cuántos documentos necesitas
        </h1>
        <p className="mx-auto max-w-[560px] text-base text-neutralCustom-500">
          Paquetes prepagados, sin mensualidades. Un mismo paquete sirve para facturas, notas, nómina, documento soporte y eventos RADIAN.
        </p>
      </section>

      <section aria-label="Paquetes" className="px-6 pt-16 md:px-16">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-5 sm:grid-cols-4">
          {PRICING_PACKAGES.map((pkg) => (
            <PriceCard key={pkg.documentos} {...pkg} />
          ))}
        </div>
      </section>

      <section className="px-6 py-8 md:px-16">
        <PricingConditions className="mx-auto mb-8 max-w-[920px]" />
        <CustomAmountBanner className="mx-auto max-w-[920px]" />
      </section>

      <section aria-labelledby="faq-precios" className="bg-neutralCustom-50 px-6 py-20 md:px-16">
        <h2 id="faq-precios" className="mb-6 text-center text-2xl font-extrabold text-neutralCustom-800">
          Preguntas frecuentes sobre precios
        </h2>
        <FaqList items={PRICING_FAQ} />
      </section>
    </SiteLayout>
  );
}
