const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function SeccionLineasCredito({ seleccion, error, onToggleLinea, onCantidadChange }) {
  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <h3 className="text-base font-semibold text-neutralCustom-800 mb-1">Líneas a acreditar</h3>
      <p className="text-xs text-neutralCustom-500 mb-4">
        Selecciona las líneas y ajusta la cantidad — no puede superar lo que aún queda sin acreditar.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[680px]">
          <thead>
            <tr className="text-xs text-neutralCustom-500 uppercase border-b border-neutralCustom-200">
              <th className="pb-2 font-semibold w-8"></th>
              <th className="pb-2 font-semibold">Descripción</th>
              <th className="pb-2 font-semibold text-right w-24">Cant. original</th>
              <th className="pb-2 font-semibold text-right w-24">Ya acreditado</th>
              <th className="pb-2 font-semibold text-right w-32">Cant. a acreditar</th>
              <th className="pb-2 font-semibold text-right w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutralCustom-100">
            {seleccion.map((linea) => {
              const cantidadOriginal = Number(linea.facturaLinea.cantidad);
              const yaAcreditado = cantidadOriginal - linea.disponible;
              const cantidadInvalida = linea.incluida && (linea.cantidad === "" || Number(linea.cantidad) <= 0);
              const subtotalLinea = linea.incluida ? (Number(linea.cantidad) || 0) * Number(linea.facturaLinea.precio_unitario) : 0;
              const sinDisponible = linea.disponible <= 0;

              return (
                <tr key={linea.facturaLinea.id} className={sinDisponible ? "opacity-50" : ""}>
                  <td className="py-2 align-top">
                    <input
                      type="checkbox"
                      checked={linea.incluida}
                      disabled={sinDisponible}
                      onChange={(e) => onToggleLinea(linea.facturaLinea.id, e.target.checked)}
                      className="w-4 h-4 accent-brand-600"
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    {linea.facturaLinea.descripcion}
                    <p className="text-xs text-neutralCustom-500 mt-0.5">
                      Cod: {linea.facturaLinea.codigo || "-"}
                      {linea.facturaLinea.tributo && ` · ${linea.facturaLinea.tributo} ${linea.facturaLinea.tarifa_impuesto}%`}
                    </p>
                  </td>
                  <td className="py-2 pr-2 text-right align-top">{cantidadOriginal}</td>
                  <td className="py-2 pr-2 text-right align-top">{yaAcreditado}</td>
                  <td className="py-2 pr-2 align-top">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={linea.cantidad}
                      disabled={!linea.incluida}
                      onChange={(e) => onCantidadChange(linea.facturaLinea.id, e.target.value)}
                      className={`w-full px-2 py-1.5 border rounded-brand-md text-sm text-right focus:outline-none disabled:bg-neutralCustom-50 disabled:text-neutralCustom-400 ${
                        cantidadInvalida ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                      }`}
                    />
                  </td>
                  <td className="py-2 text-right align-top font-medium">
                    {linea.incluida ? formatCOP(subtotalLinea) : formatCOP(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-fiscal-danger mt-2">{error}</p>}
    </div>
  );
}
