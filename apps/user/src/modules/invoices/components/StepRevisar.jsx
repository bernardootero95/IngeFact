import { calcularTotales } from "../pages/InvoiceWizardPage.validation";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function StepRevisar({
  empresaNombre,
  empresaNit,
  cliente,
  fecha,
  lineas,
  saveError,
  isSavingDraft,
  isSending,
  onBack,
  onGuardarBorrador,
  onEnviar,
}) {
  const totales = calcularTotales(lineas);
  const disabled = isSavingDraft || isSending;

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
        <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Paso 3: Revisar y Emitir</h3>

        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
            {saveError}
          </div>
        )}

        <div className="border border-neutralCustom-100 rounded-brand-md p-5 bg-neutralCustom-50/50">
          <div className="flex justify-between text-sm mb-4">
            <div>
              <p className="font-semibold text-neutralCustom-800">{empresaNombre}</p>
              <p className="text-xs text-neutralCustom-500">NIT {empresaNit}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutralCustom-500">{fecha}</p>
            </div>
          </div>
          <div className="text-sm mb-4">
            <p className="text-xs text-neutralCustom-500">Cliente</p>
            <p className="font-medium text-neutralCustom-800">
              {cliente?.nombre} — NIT {cliente?.numero_identificacion}
            </p>
          </div>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-xs text-neutralCustom-500 border-b border-neutralCustom-200">
                <th className="text-left font-medium py-1.5">Ítem</th>
                <th className="text-right font-medium py-1.5">Subtotal</th>
                <th className="text-right font-medium py-1.5">Impuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutralCustom-100">
              {lineas.map((linea, index) => {
                const subtotalLinea = (Number(linea.cantidad) || 0) * (Number(linea.producto?.precio) || 0);
                const impuestoLinea = subtotalLinea * ((Number(linea.producto?.tarifa_impuesto) || 0) / 100);
                return (
                  <tr key={index}>
                    <td className="py-1.5">
                      {linea.producto?.nombre} {Number(linea.cantidad) > 1 ? `x${linea.cantidad}` : ""}
                    </td>
                    <td className="py-1.5 text-right">{formatCOP(subtotalLinea)}</td>
                    <td className="py-1.5 text-right">{formatCOP(impuestoLinea)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between text-neutralCustom-600">
                <span>Subtotal</span>
                <span>{formatCOP(totales.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutralCustom-600">
                <span>Impuestos</span>
                <span>{formatCOP(totales.totalImpuestos)}</span>
              </div>
              <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-200 pt-1">
                <span>Total</span>
                <span>{formatCOP(totales.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-neutralCustom-100">
          <button
            type="button"
            onClick={onBack}
            disabled={disabled}
            className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
          >
            ← Atrás
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
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors shadow-sm ml-auto disabled:opacity-50"
          >
            {isSending ? "Enviando..." : "Enviar a DIAN →"}
          </button>
        </div>
      </div>
    </div>
  );
}
