import Link from "next/link";
import Image from "next/image";
import { WHATSAPP_DISPLAY, buildWhatsAppLink } from "@/lib/whatsapp";
import { BUSINESS } from "@/data/business";
import { LEGAL_NAV_ITEMS } from "@/data/nav";
import { NewTabHint } from "@/components/ui/NewTabHint";

// neutralCustom-300 sobre neutralCustom-800 = 7:1 (el -500 daba 3,4:1, no cumplía AA).
const mutedText = "text-neutralCustom-300";
const linkClasses = "mb-3 block text-sm text-neutralCustom-100 hover:text-brand-400";

export function Footer() {
  return (
    <footer className="bg-neutralCustom-800 px-6 py-14 md:px-16">
      <div className="mx-auto grid max-w-[1312px] grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="mb-3.5 flex items-center gap-2.5">
            <Image src="/logo-mark.png" alt="" width={18} height={24} className="h-6 w-auto" />
            <span className="text-lg font-extrabold text-white">IngeFact</span>
          </div>
          <p className={`mb-4 max-w-[320px] text-sm leading-relaxed ${mutedText}`}>
            Software de facturación electrónica, nómina electrónica y documento soporte para empresas en Colombia.
          </p>
          <address className={`not-italic text-[13px] leading-relaxed ${mutedText}`}>
            {BUSINESS.razonSocial} · NIT {BUSINESS.nit}
            <br />
            {BUSINESS.direccion}, {BUSINESS.ciudad}
            <br />
            <a href={`mailto:${BUSINESS.correo}`} className="hover:text-brand-400">
              {BUSINESS.correo}
            </a>
          </address>
        </div>

        <FooterColumn
          title="Producto"
          links={[
            { label: "Características", href: "/caracteristicas" },
            { label: "Precios", href: "/precios" },
            { label: "Instructivos", href: "/instructivos" },
          ]}
        />
        <FooterColumn title="Legal" links={LEGAL_NAV_ITEMS} />

        <div>
          <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${mutedText}`}>Contacto</h2>
          <a href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer" className={linkClasses}>
            WhatsApp: {WHATSAPP_DISPLAY}
            <NewTabHint />
          </a>
          <Link href="/contacto" className={linkClasses}>
            Peticiones, quejas y reclamos
          </Link>
          <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" className={linkClasses}>
            Superintendencia de Industria y Comercio
            <NewTabHint />
          </a>
        </div>
      </div>

      <div
        className={`mx-auto mt-10 flex max-w-[1312px] flex-col gap-2 border-t border-white/10 pt-6 text-[13px] sm:flex-row sm:items-center sm:justify-between ${mutedText}`}
      >
        <span>
          © {new Date().getFullYear()} {BUSINESS.razonSocial}. Todos los derechos reservados.
        </span>
        <span>{BUSINESS.ciudad}</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${mutedText}`}>{title}</h2>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={linkClasses}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}
