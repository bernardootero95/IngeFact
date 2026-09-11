import { CheckIcon } from "@/components/ui/icons";

const QR_PATTERN = [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0];

export function InvoiceMockup() {
  return (
    <div className="w-full max-w-[420px] flex-shrink-0 rounded-brand-lg border border-neutralCustom-100 bg-white p-6 shadow-[0_20px_40px_-18px_rgba(26,28,35,0.18)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutralCustom-500">
            Factura electrónica
          </div>
          <div className="text-[15px] font-bold text-neutralCustom-800">N.° FE-000482</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-600">
          <CheckIcon className="h-3 w-3" />
          Aceptada DIAN
        </span>
      </div>
      <div className="border-t border-neutralCustom-100 pt-3.5">
        <div className="mb-2.5 flex justify-between text-[13px] text-neutralCustom-500">
          <span>Producto</span>
          <span>Total</span>
        </div>
        <div className="mb-2 flex justify-between text-sm text-neutralCustom-800">
          <span>Asesoría contable · 1</span>
          <span>$450.000</span>
        </div>
        <div className="mb-2 flex justify-between text-sm text-neutralCustom-800">
          <span>Soporte mensual · 1</span>
          <span>$120.000</span>
        </div>
        <div className="mb-3.5 flex justify-between text-sm text-neutralCustom-800">
          <span>IVA (19%)</span>
          <span>$108.300</span>
        </div>
        <div className="flex justify-between border-t border-neutralCustom-100 pt-3.5 text-base font-extrabold text-neutralCustom-800">
          <span>Total</span>
          <span>$678.300</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[11px] text-neutralCustom-500">CUFE: 8f3a...e21c</span>
        <div className="grid grid-cols-4 grid-rows-4 gap-0.5">
          {QR_PATTERN.map((filled, index) => (
            <div key={index} className={`h-1.5 w-1.5 ${filled ? "bg-neutralCustom-800" : "bg-white"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
