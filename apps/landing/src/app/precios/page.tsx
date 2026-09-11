import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PriceCard } from "@/components/ui/PriceCard";
import { CustomAmountBanner } from "@/components/ui/CustomAmountBanner";
import { FaqList } from "@/components/ui/FaqList";
import { PRICING_PACKAGES } from "@/data/pricing";
import { PRICING_FAQ } from "@/data/faq";

export const metadata: Metadata = {
  title: "Precios",
  description: "Paquetes de documentos electrónicos de IngeFact, desde 10 hasta 5.000 documentos. Paga solo por lo que tu negocio necesita.",
  alternates: { canonical: "/precios" },
};

export default function PreciosPage() {
  return (
    <>
      <Header active="precios" />

      <section className="bg-neutralCustom-50 px-6 py-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">
          Elige cuántos documentos necesitas
        </h1>
        <p className="mx-auto max-w-[560px] text-base text-neutralCustom-500">
          Planes flexibles de facturación electrónica. Paga solo por lo que tu negocio necesita.
        </p>
      </section>

      <section className="px-6 pt-16 md:px-16">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-5 sm:grid-cols-4">
          {PRICING_PACKAGES.map((pkg) => (
            <PriceCard key={pkg.documentos} {...pkg} />
          ))}
        </div>
      </section>

      <section className="px-6 py-8 md:px-16">
        <CustomAmountBanner className="mx-auto max-w-[920px]" />
      </section>

      <section className="bg-neutralCustom-50 px-6 py-20 md:px-16">
        <h2 className="mb-6 text-center text-2xl font-extrabold text-neutralCustom-800">
          Preguntas frecuentes sobre precios
        </h2>
        <FaqList items={PRICING_FAQ} />
      </section>

      <Footer />
    </>
  );
}
