import type { PricingPackage } from "@/data/pricing";

export function PriceCard({ documentos, precio, destacado }: PricingPackage) {
  return (
    <div
      className={`relative rounded-brand-lg border bg-white p-7 text-center ${
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
      <div className="text-xl font-extrabold text-brand-600">{precio}</div>
    </div>
  );
}
