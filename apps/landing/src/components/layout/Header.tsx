"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { NAV_ITEMS, type NavKey } from "@/data/nav";
import { WhatsAppIcon } from "@/components/ui/icons";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { PrimaryButton } from "@/components/ui/Button";

export function Header({ active }: { active: NavKey }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutralCustom-100 bg-white">
      <div className="flex h-20 items-center justify-between px-6 md:px-16">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image src="/logo-mark.png" alt="" width={22} height={29} priority className="h-7 w-auto" />
          <span className="text-xl font-extrabold text-neutralCustom-800">
            Inge<span className="text-brand-600">Fact</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`text-[15px] transition-colors hover:text-brand-600 ${
                item.key === active ? "font-bold text-brand-600" : "font-medium text-neutralCustom-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <PrimaryButton
            href={buildWhatsAppLink("Hola, quiero comprar un paquete de documentos de IngeFact.")}
            external
            icon={<WhatsAppIcon className="h-4 w-4" />}
            className="px-5 py-2.5"
          >
            <span className="hidden sm:inline">Comprar</span>
          </PrimaryButton>

          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-brand-md text-neutralCustom-800 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-neutralCustom-100 px-6 py-4 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`rounded-brand-md px-3 py-2.5 text-[15px] ${
                item.key === active ? "bg-brand-50 font-bold text-brand-600" : "font-medium text-neutralCustom-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
