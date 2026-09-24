import type { Metadata } from "next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PrimaryButton } from "@/components/ui/Button";
import { FEATURE_CATEGORIES } from "@/data/features";

export const metadata: Metadata = {
  title: "Características",
  description:
    "Facturación electrónica, nómina electrónica, documento soporte y aceptación de facturas (RADIAN): todo lo que IngeFact hace por tu empresa.",
  alternates: { canonical: "/caracteristicas" },
};

export default function CaracteristicasPage() {
  return (
    <SiteLayout active="caracteristicas">
      <section className="bg-neutralCustom-50 px-6 py-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">
          Todo lo que IngeFact hace por tu empresa
        </h1>
        <p className="mx-auto max-w-[640px] text-base text-neutralCustom-500">
          Facturación, nómina electrónica, documento soporte y aceptación de facturas recibidas, en una sola plataforma
          pensada para el flujo real de los documentos electrónicos en Colombia.
        </p>
      </section>

      {FEATURE_CATEGORIES.map((category, index) => (
        <section
          key={category.title}
          aria-labelledby={`categoria-${index}`}
          className={`px-6 py-14 md:px-16 ${index % 2 === 1 ? "bg-neutralCustom-50" : "bg-white"}`}
        >
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-brand-md bg-brand-50">
              <category.icon className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <h2 id={`categoria-${index}`} className="mb-1 text-[22px] font-extrabold text-neutralCustom-800">
                {category.title}
              </h2>
              <p className="text-sm text-neutralCustom-500">{category.intro}</p>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {category.items.map((item) => (
              <li key={item.title} className="rounded-brand-lg border border-neutralCustom-100 bg-white p-5">
                <h3 className="mb-1.5 text-[15px] font-bold text-neutralCustom-800">{item.title}</h3>
                <p className="text-[13px] leading-relaxed text-neutralCustom-500">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="px-6 py-14 text-center md:px-16">
        <h2 className="mb-5 text-2xl font-extrabold text-neutralCustom-800">¿Quieres verlo en acción?</h2>
        <PrimaryButton href="/contacto">Solicitar demo</PrimaryButton>
      </section>
    </SiteLayout>
  );
}
