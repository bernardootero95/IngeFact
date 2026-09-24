import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { NavKey } from "@/data/nav";

/**
 * Esqueleto común de todas las páginas: enlace para saltar al contenido,
 * encabezado, región <main> (landmark para lectores de pantalla) y pie.
 */
export function SiteLayout({ active, children }: { active?: NavKey; children: ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-brand-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-600 focus:shadow"
      >
        Saltar al contenido
      </a>
      <Header active={active} />
      <main id="contenido" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
