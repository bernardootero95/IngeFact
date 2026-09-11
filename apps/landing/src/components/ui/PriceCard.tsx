import type { PricingPackage } from "@/data/pricing";
import { WhatsAppIcon } from "@/components/ui/icons";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function PriceCard({ documentos, precio, destacado }: PricingPackage) {
  const message = `Hola, quiero comprar el paquete de ${documentos} documentos (${precio}).`;

  return (
    <div
      className={`relative flex flex-col items-center rounded-brand-lg border bg-white p-7 text-center ${
        destacado ? "border-2 border-brand-600" : "border-neutralCustom-100"
      }`}
    >
      {destacado && (
        <span className="absolute left-1/2 -top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold text-white">
          Más elegido
        </span>
      )}
      <div className="text-[26px] font-extrabold text-neutralCustom-800">{documentos}</div>
      <div className="mb-4 mt-0.5 text-xs uppercase tracking-wide text-neutralCustom-500">documentos</div>
      <div className="mb-5 text-xl font-extrabold text-brand-600">{precio}</div>
      <a
        href={buildWhatsAppLink(message)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex w-full items-center justify-center gap-2 rounded-brand-md px-4 py-2.5 text-[13px] font-semibold transition-colors ${
          destacado
            ? "bg-brand-600 text-white hover:bg-brand-400"
            : "border border-neutralCustom-100 text-neutralCustom-800 hover:border-brand-400 hover:text-brand-600"
        }`}
      >
        <WhatsAppIcon className="h-3.5 w-3.5" />
        Comprar
      </a>
    </div>
  );
}
