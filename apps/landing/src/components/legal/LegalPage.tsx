import type { ReactNode } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LEGAL_LAST_UPDATED } from "@/data/business";

/** Esqueleto de las páginas legales: título, fecha de vigencia y cuerpo con tipografía de lectura. */
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <SiteLayout>
      <section className="bg-neutralCustom-50 px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[760px]">
          <h1 className="mb-3 text-[30px] font-extrabold text-neutralCustom-800 md:text-[36px]">{title}</h1>
          <p className="mb-4 text-sm text-neutralCustom-500">Última actualización: {LEGAL_LAST_UPDATED}</p>
          <div className="text-base leading-relaxed text-neutralCustom-500">{intro}</div>
        </div>
      </section>
      <article className="px-6 py-14 md:px-16">
        <div className="mx-auto flex max-w-[760px] flex-col gap-10">{children}</div>
      </article>
    </SiteLayout>
  );
}

/** Sección numerada. El id permite enlazar directamente (p. ej. /privacidad#derechos). */
export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="mb-3 text-xl font-extrabold text-neutralCustom-800">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-neutralCustom-800 [&_a]:font-semibold [&_a]:text-brand-600 [&_a]:underline hover:[&_a]:text-brand-700 [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ul]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
