import { SearchableSelect } from "@ingefact/ui";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function SeccionLineas({
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
}) {
  const productoOptions = productos.map((p) => ({ code: p.id, value: `${p.nombre} (${formatCOP(p.precio)})` }));

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Líneas</h3>

      <div className="space-y-3">
        {lineas.map((linea, index) => {
          const cantidadInvalida = linea.cantidad !== "" && Number(linea.cantidad) <= 0;
          const subtotalLinea = (Number(linea.cantidad) || 0) * (Number(linea.producto?.precio) || 0);
          const impuestoLinea = subtotalLinea * ((Number(linea.producto?.tarifa_impuesto) || 0) / 100);

          return (
            <div key={index} className="border border-neutralCustom-100 rounded-brand-md p-4">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-6">
                  <label className="block text-xs font-medium text-neutralCustom-500 mb-1">Producto / Servicio</label>
                  <SearchableSelect
                    options={productoOptions}
                    value={linea.producto_id}
                    onChange={(productoId) => onLineaProductoChange(index, productoId)}
                    placeholder="Buscar producto..."
                    formatOption={(opt) => opt.value}
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
    </div>
  );
}
