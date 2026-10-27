import { FieldError, fieldA11y } from "@ingefact/ui";
import { CLAIM_CODES } from "../pages/ReceivedInvoiceDetailPage.validation";

/** Motivo (obligatorio) y notas del reclamo (031). */
export default function ReclamoFields({ claimCode, notas, error, onClaimCodeChange, onNotasChange }) {
  return (
    <div className="bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md p-4 space-y-3">
      <div>
        <label htmlFor="claim_code" className="block text-xs font-medium text-neutralCustom-600 mb-1">
          Motivo del rechazo <span className="text-fiscal-danger" aria-hidden="true">*</span>
          <span className="sr-only"> (obligatorio)</span>
        </label>
        <select
          id="claim_code"
          value={claimCode}
          onChange={(e) => onClaimCodeChange(e.target.value)}
          className={`field w-full ${error ? "border-fiscal-danger field-invalid" : ""}`}
          {...fieldA11y("claim_code", error)}
        >
          <option value="">Selecciona...</option>
          {CLAIM_CODES.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.code} - {opt.value}
            </option>
          ))}
        </select>
        <FieldError fieldId="claim_code">{error}</FieldError>
      </div>
      <div>
        <label htmlFor="notas" className="block text-xs font-medium text-neutralCustom-600 mb-1">
          Notas
        </label>
        <textarea
          id="notas"
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          rows={2}
          placeholder="Opcional"
          className="field w-full"
        />
      </div>
    </div>
  );
}
