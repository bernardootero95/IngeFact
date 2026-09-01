import { calcularTotales } from "../pages/InvoiceFormPage.validation";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function SeccionResumen({
  lineas,
  saveError,
  isSavingDraft,
  isSending,
  onCancelar,
  onGuardarBorrador,
  onEnviar,
}) {
  const totales = calcularTotales(lineas);
  const disabled = isSavingDraft || isSending;

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
          {saveError}
        </div>
      )}

      <div className="flex justify-end mb-6">
        <div className="w-56 space-y-1 text-sm">
          <div className="flex justify-between text-neutralCustom-600">
            <span>Subtotal</span>
            <span>{formatCOP(totales.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutralCustom-600">
            <span>Total impuestos</span>
            <span>{formatCOP(totales.totalImpuestos)}</span>
          </div>
          <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-100 pt-1">
            <span>Total</span>
            <span>{formatCOP(totales.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancelar}
          disabled={disabled}
          className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onGuardarBorrador}
          disabled={disabled}
          className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
        >
          {isSavingDraft ? "Guardando..." : "Guardar Borrador"}
        </button>
        <button
          type="button"
          onClick={onEnviar}
          disabled={disabled}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors shadow-sm disabled:opacity-50"
        >
          {isSending ? "Enviando..." : "Enviar a DIAN"}
        </button>
      </div>
    </div>
  );
}
