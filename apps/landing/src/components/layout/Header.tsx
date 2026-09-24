"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { NAV_ITEMS, type NavKey } from "@/data/nav";
import { WhatsAppIcon } from "@/components/ui/icons";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { PrimaryButton } from "@/components/ui/Button";

const MOBILE_MENU_ID = "menu-movil";

export function Header({ active }: { active?: NavKey }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-neutralCustom-100 bg-white">
      <div className="flex h-20 items-center justify-between px-6 md:px-16">
        <Link href="/" aria-label="IngeFact, ir al inicio" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image src="/logo-mark.png" alt="" width={22} height={29} priority className="h-7 w-auto" />
          <span className="text-xl font-extrabold text-neutralCustom-800">
            Inge<span className="text-brand-600">Fact</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-9 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === active ? "page" : undefined}
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
            <span className="sr-only sm:not-sr-only">Comprar</span>
          </PrimaryButton>

          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls={MOBILE_MENU_ID}
            onClick={() => setOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-brand-md text-neutralCustom-800 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id={MOBILE_MENU_ID} aria-label="Principal" className="flex flex-col gap-1 border-t border-neutralCustom-100 px-6 py-4 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === active ? "page" : undefined}
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
