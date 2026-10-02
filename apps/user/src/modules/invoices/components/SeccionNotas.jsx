import { FieldError, fieldA11y } from "@ingefact/ui";
import { MAX_LARGO_NOTAS } from "../pages/InvoiceFormPage.validation";

export default function SeccionNotas({ notas, error, onNotasChange }) {
  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor="notas" className="text-base font-semibold text-neutralCustom-800">
          Notas <span className="text-sm font-normal text-neutralCustom-500">(opcional)</span>
        </label>
        <span className="text-xs text-neutralCustom-500" aria-live="polite">
          {notas.length}/{MAX_LARGO_NOTAS}
        </span>
      </div>
      <p className="text-xs text-neutralCustom-500 mb-3">
        Aparecen en la factura que recibe tu cliente: condiciones, orden de compra, datos para el pago, etc.
      </p>
      <textarea
        id="notas"
        rows={3}
        value={notas}
        onChange={(e) => onNotasChange(e.target.value)}
        placeholder="Ej: Orden de compra 4512. Consignar a la cuenta de ahorros No. ..."
        className={`field w-full resize-y ${error ? "border-fiscal-danger field-invalid" : ""}`}
        {...fieldA11y("notas", error)}
      />
      {error && <FieldError fieldId="notas">{error}</FieldError>}
    </div>
  );
}
