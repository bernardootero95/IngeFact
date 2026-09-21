import { calcularTotales } from "../pages/InvoiceFormPage.validation";
import { Button } from "@ingefact/ui";

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
        <Button
          variant="ghost"
          onClick={onCancelar}
          disabled={disabled}
        >
          Cancelar
        </Button>
        <Button
          onClick={onGuardarBorrador}
          disabled={disabled}
          loading={isSavingDraft}
        >
          Guardar borrador
        </Button>
        <Button
          onClick={onEnviar}
          disabled={disabled}
          variant="primary"
          loading={isSending}
        >
          Enviar a DIAN
        </Button>
      </div>
    </div>
  );
}
