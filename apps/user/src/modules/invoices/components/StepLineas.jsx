import { SearchableSelect } from "@ingefact/ui";
import { calcularTotales } from "../pages/InvoiceWizardPage.validation";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function StepLineas({
  clienteNombre,
  fecha,
  lineas,
  productos,
  formaPago,
  metodoPago,
  formasPago,
  metodosPago,
  errores,
  onAddLinea,
  onRemoveLinea,
  onLineaProductoChange,
  onLineaCantidadChange,
  onFormaPagoChange,
  onMetodoPagoChange,
  onBack,
  onNext,
}) {
  const productoOptions = productos.map((p) => ({ code: p.id, value: `${p.nombre} (${formatCOP(p.precio)})` }));
  const totales = calcularTotales(lineas);

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
        <h3 className="text-base font-semibold text-neutralCustom-800 mb-1">Paso 2: Agregar Líneas</h3>
        <p className="text-xs text-neutralCustom-500 mb-6">
          Cliente: {clienteNombre} · Fecha: {fecha}
        </p>

        <div className="space-y-3">
          {lineas.map((linea, index) => {
            const cantidadInvalida = linea.cantidad !== "" && Number(linea.cantidad) <= 0;
            const subtotalLinea = (Number(linea.cantidad) || 0) * (Number(linea.producto?.precio) || 0);
            const impuestoLinea = subtotalLinea * ((Number(linea.producto?.tarifa_impuesto) || 0) / 100);

            return (
              <div key={index} className="border border-neutralCustom-100 rounded-brand-md p-4">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="block text-xs font-medium text-neutralCustom-500 mb-1">
                      Producto / Servicio
                    </label>
                    <SearchableSelect
                      options={productoOptions}
                      value={linea.producto_id}
                      onChange={(productoId) => onLineaProductoChange(index, productoId)}
                      placeholder="Buscar producto..."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-neutralCustom-500 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={linea.cantidad}
                      onChange={(e) => onLineaCantidadChange(index, e.target.value)}
                      className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                        cantidadInvalida ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                      }`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-neutralCustom-500 mb-1">Precio Unit.</label>
                    <div className="px-3 py-2 border border-neutralCustom-200 rounded-brand-md text-sm text-right">
                      {linea.producto ? formatCOP(linea.producto.precio) : "-"}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-neutralCustom-500 mb-1">Total</label>
                    <div className="px-3 py-2 text-sm font-medium text-right">{formatCOP(subtotalLinea)}</div>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveLinea(index)}
                      className="text-neutralCustom-400 hover:text-fiscal-danger"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {linea.producto?.tributo && (
                  <p className="text-xs text-neutralCustom-500 mt-2">
                    {linea.producto.tributo} {linea.producto.tarifa_impuesto}% = {formatCOP(impuestoLinea)}
                  </p>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAddLinea}
            className="w-full border-2 border-dashed border-neutralCustom-200 hover:border-brand-400 hover:text-brand-600 text-neutralCustom-500 rounded-brand-md py-3 text-sm font-medium transition-colors"
          >
            + Agregar línea
          </button>
          {errores.lineas && <p className="text-xs text-fiscal-danger">{errores.lineas}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutralCustom-100">
          <div>
            <label htmlFor="forma_pago" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
              Forma de pago
            </label>
            <select
              id="forma_pago"
              value={formaPago}
              onChange={(e) => onFormaPagoChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                errores.formaPago ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
              }`}
            >
              {formasPago.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="metodo_pago" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
              Método de pago
            </label>
            <select
              id="metodo_pago"
              value={metodoPago}
              onChange={(e) => onMetodoPagoChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                errores.metodoPago ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
              }`}
            >
              {metodosPago.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-neutralCustom-100">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors"
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors shadow-sm"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <div className="w-72 bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 shrink-0 sticky top-8">
        <h4 className="text-sm font-semibold text-neutralCustom-800 mb-4">Resumen</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-neutralCustom-600">
            <span>Subtotal</span>
            <span>{formatCOP(totales.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutralCustom-600">
            <span>Total impuestos</span>
            <span>{formatCOP(totales.totalImpuestos)}</span>
          </div>
          <div className="border-t border-neutralCustom-100 my-2"></div>
          <div className="flex justify-between text-base font-bold text-neutralCustom-800">
            <span>Total</span>
            <span>{formatCOP(totales.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
