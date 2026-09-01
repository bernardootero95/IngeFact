import { Link } from "react-router-dom";
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-neutralCustom-800">Productos y Servicios</h3>
        <Link
          to="/products/new"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-brand-600 hover:text-brand-400"
        >
          + Nuevo Producto
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead>
            <tr className="text-xs text-neutralCustom-500 uppercase border-b border-neutralCustom-200">
              <th className="pb-2 font-semibold w-24">Cod</th>
              <th className="pb-2 font-semibold">Descripción</th>
              <th className="pb-2 font-semibold text-right w-20">Cant.</th>
              <th className="pb-2 font-semibold text-right w-28">Precio Unit.</th>
              <th className="pb-2 font-semibold text-right w-28">Subtotal</th>
              <th className="pb-2 font-semibold text-right w-24">IVA</th>
              <th className="pb-2 font-semibold text-right w-28">Total</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutralCustom-100">
            {lineas.map((linea, index) => {
              const cantidadInvalida = linea.cantidad !== "" && Number(linea.cantidad) <= 0;
              const subtotalLinea = (Number(linea.cantidad) || 0) * (Number(linea.producto?.precio) || 0);
              const impuestoLinea = subtotalLinea * ((Number(linea.producto?.tarifa_impuesto) || 0) / 100);

              return (
                <tr key={index}>
                  <td className="py-2 pr-2 text-xs text-neutralCustom-500 align-top">{linea.producto?.codigo || "-"}</td>
                  <td className="py-2 pr-2 align-top">
                    <SearchableSelect
                      options={productoOptions}
                      value={linea.producto_id}
                      onChange={(productoId) => onLineaProductoChange(index, productoId)}
                      placeholder="Buscar producto..."
                      formatOption={(opt) => opt.value}
                    />
                    {linea.producto?.tributo && (
                      <p className="text-xs text-neutralCustom-500 mt-1">
                        {linea.producto.tributo} {linea.producto.tarifa_impuesto}%
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={linea.cantidad}
                      onChange={(e) => onLineaCantidadChange(index, e.target.value)}
                      className={`w-full px-2 py-2 border rounded-brand-md text-sm text-right focus:outline-none ${
                        cantidadInvalida ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                      }`}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right align-top">
                    {linea.producto ? formatCOP(linea.producto.precio) : "-"}
                  </td>
                  <td className="py-2 pr-2 text-right align-top">{formatCOP(subtotalLinea)}</td>
                  <td className="py-2 pr-2 text-right align-top">{formatCOP(impuestoLinea)}</td>
                  <td className="py-2 pr-2 text-right font-medium align-top">
                    {formatCOP(subtotalLinea + impuestoLinea)}
                  </td>
                  <td className="py-2 text-right align-top">
                    <button
                      type="button"
                      onClick={() => onRemoveLinea(index)}
                      className="text-neutralCustom-400 hover:text-fiscal-danger"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAddLinea}
        className="w-full border-2 border-dashed border-neutralCustom-200 hover:border-brand-400 hover:text-brand-600 text-neutralCustom-500 rounded-brand-md py-3 text-sm font-medium transition-colors mt-3"
      >
        + Agregar línea
      </button>
      {errores.lineas && <p className="text-xs text-fiscal-danger mt-2">{errores.lineas}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutralCustom-100">
        <div>
          <label htmlFor="forma_pago" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
            Forma de pago <span className="text-fiscal-danger">*</span>
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
            Método de pago <span className="text-fiscal-danger">*</span>
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
          {errores.metodoPago && <p className="mt-1 text-xs text-fiscal-danger">{errores.metodoPago}</p>}
        </div>
      </div>
    </div>
  );
}
