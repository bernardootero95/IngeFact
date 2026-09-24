import type { Metadata } from "next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";

export const metadata: Metadata = {
  // Next ya agrega noindex a la respuesta 404.
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <SiteLayout>
      <section className="bg-neutralCustom-50 px-6 py-24 text-center md:px-16">
        <p className="mb-3 text-sm font-bold text-brand-600">Error 404</p>
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">
          No encontramos esta página
        </h1>
        <p className="mx-auto mb-8 max-w-[520px] text-base text-neutralCustom-500">
          Es posible que el enlace esté mal escrito o que la página ya no exista.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PrimaryButton href="/">Ir al inicio</PrimaryButton>
          <SecondaryButton href="/instructivos">Ver los instructivos</SecondaryButton>
        </div>
      </section>
    </SiteLayout>
  );
}
