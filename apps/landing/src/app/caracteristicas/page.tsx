import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PrimaryButton } from "@/components/ui/Button";
import { FEATURE_CATEGORIES } from "@/data/features";

export const metadata: Metadata = {
  title: "Características",
  description: "Todo lo que IngeFact hace por tu facturación electrónica: emisión, cumplimiento DIAN, clientes, productos y reportes.",
  alternates: { canonical: "/caracteristicas" },
};

export default function CaracteristicasPage() {
  return (
    <>
      <Header active="caracteristicas" />

      <section className="bg-neutralCustom-50 px-6 py-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">
          Todo lo que IngeFact hace por tu facturación
        </h1>
        <p className="mx-auto max-w-[620px] text-base text-neutralCustom-500">
          Desde el primer documento hasta el control de tu cupo mensual: una plataforma pensada para el flujo real de
          facturación electrónica en Colombia.
        </p>
      </section>

      {FEATURE_CATEGORIES.map((category, index) => (
        <section
          key={category.title}
          className={`px-6 py-14 md:px-16 ${index % 2 === 1 ? "bg-neutralCustom-50" : "bg-white"}`}
        >
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-brand-md bg-brand-50">
              <category.icon className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <h2 className="mb-1 text-[22px] font-extrabold text-neutralCustom-800">{category.title}</h2>
              <p className="text-sm text-neutralCustom-500">{category.intro}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {category.items.map((item) => (
              <div
                key={item.title}
                className={`rounded-brand-lg border bg-white p-5 ${
                  item.soon ? "border-dashed border-neutralCustom-100" : "border-neutralCustom-100"
                }`}
              >
                <h3 className={`mb-1.5 text-[15px] font-bold ${item.soon ? "text-neutralCustom-500" : "text-neutralCustom-800"}`}>
                  {item.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-neutralCustom-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="px-6 py-14 text-center md:px-16">
        <h2 className="mb-5 text-2xl font-extrabold text-neutralCustom-800">¿Quieres ver esto en acción?</h2>
        <PrimaryButton href="/contacto">Solicita una demo</PrimaryButton>
      </section>

      <Footer />
    </>
  );
}
