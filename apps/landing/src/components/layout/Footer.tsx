import Link from "next/link";
import { WHATSAPP_DISPLAY, buildWhatsAppLink } from "@/lib/whatsapp";

export function Footer() {
  return (
    <footer className="bg-neutralCustom-800 px-6 py-14 md:px-16">
      <div className="mx-auto grid max-w-[1312px] grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="mb-3.5 flex items-center gap-2.5">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3D9E3A"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
              <path d="M14 3v5h5" />
            </svg>
            <span className="text-lg font-extrabold text-white">IngeFact</span>
          </div>
          <p className="max-w-[280px] text-sm leading-relaxed text-neutralCustom-500">
            Facturación electrónica para empresas colombianas, integrada con la DIAN.
          </p>
        </div>

        <FooterColumn
          title="Producto"
          links={[
            { label: "Características", href: "/caracteristicas" },
            { label: "Precios", href: "/precios" },
          ]}
        />
        <FooterColumn
          title="Recursos"
          links={[
            { label: "Instructivos", href: "/instructivos" },
            { label: "Contacto", href: "/contacto" },
          ]}
        />
        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-wide text-neutralCustom-500">Contacto directo</div>
          <a
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block text-sm text-neutralCustom-100 hover:text-brand-400"
          >
            WhatsApp: {WHATSAPP_DISPLAY}
          </a>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-[1312px] flex-col gap-2 border-t border-white/10 pt-6 text-[13px] text-neutralCustom-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} IngeFact. Todos los derechos reservados.</span>
        <span>Bogotá, Colombia</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="mb-4 text-xs font-bold uppercase tracking-wide text-neutralCustom-500">{title}</div>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="mb-3 block text-sm text-neutralCustom-100 hover:text-brand-400">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
