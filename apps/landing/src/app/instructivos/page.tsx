import type { Metadata } from "next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { GuideCard } from "@/components/ui/GuideCard";
import { GUIDE_GROUPS } from "@/data/guides";

export const metadata: Metadata = {
  title: "Instructivos",
  description: "Guías paso a paso para configurar tu empresa y emitir facturas, nómina electrónica y documento soporte, o aceptar facturas recibidas.",
  alternates: { canonical: "/instructivos" },
};

export default function InstructivosPage() {
  return (
    <SiteLayout active="instructivos">
      <section className="bg-neutralCustom-50 px-6 pb-12 pt-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">
          Guías para sacarle el máximo provecho a IngeFact
        </h1>
        <p className="mx-auto max-w-[600px] text-base text-neutralCustom-500">
          Paso a paso para configurar tu empresa y emitir facturas, nómina electrónica y documento soporte, o aceptar las
          facturas que recibes.
        </p>
      </section>

      <section className="space-y-14 px-6 pb-14 pt-14 md:px-16">
        {GUIDE_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="mb-5 text-xl font-extrabold text-neutralCustom-800">{group.title}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.guides.map((guide) => (
                <GuideCard key={guide.title} {...guide} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
