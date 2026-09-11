import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GuideCard } from "@/components/ui/GuideCard";
import { SearchIcon } from "@/components/ui/icons";
import { GUIDE_GROUPS } from "@/data/guides";

export const metadata: Metadata = {
  title: "Instructivos",
  description: "Guías paso a paso para configurar tu empresa, emitir tus documentos y mantener tu facturación al día con la DIAN.",
  alternates: { canonical: "/instructivos" },
};

export default function InstructivosPage() {
  return (
    <>
      <Header active="instructivos" />

      <section className="bg-neutralCustom-50 px-6 pb-12 pt-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">
          Guías para sacarle el máximo provecho a IngeFact
        </h1>
        <p className="mx-auto mb-8 max-w-[580px] text-base text-neutralCustom-500">
          Paso a paso para configurar tu empresa, emitir tus documentos y mantener tu facturación al día con la DIAN.
        </p>
        <div className="mx-auto flex max-w-[480px] items-center gap-2.5 rounded-brand-md border border-neutralCustom-100 bg-white px-4 py-3">
          <SearchIcon className="h-[18px] w-[18px] text-neutralCustom-500" />
          <span className="text-sm text-neutralCustom-500">Buscar en las guías…</span>
        </div>
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

      <Footer />
    </>
  );
}
