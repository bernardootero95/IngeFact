import { formatCOP } from "../eventos";
import { plural } from "../cargaMasiva";

/** Lo que salió de leer el Excel: facturas a cargar y filas omitidas por motivo. */
export default function ResumenReporteDian({ lectura, nombreArchivo }) {
  const { total_filas: totalFilas, candidatas, omitidas } = lectura;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-neutralCustom-500 truncate" title={nombreArchivo}>
          {nombreArchivo} · {plural(totalFilas, "fila", "filas")}
        </p>
        <p className="mt-1 text-base font-semibold text-neutralCustom-800">
          {candidatas.length > 0
            ? `${plural(candidatas.length, "factura recibida a crédito lista", "facturas recibidas a crédito listas")} para cargar`
            : "No hay facturas nuevas a crédito para cargar"}
        </p>
      </div>

      {omitidas.length > 0 && (
        <div className="p-4 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md">
          <h4 className="text-xs font-semibold uppercase text-neutralCustom-500 mb-2">No se cargan</h4>
          <ul className="space-y-1 text-sm text-neutralCustom-600">
            {omitidas.map((o) => (
              <li key={o.motivo} className="flex justify-between gap-4">
                <span>{o.motivo}</span>
                <span className="font-medium text-neutralCustom-800 tabular-nums">{o.cantidad}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {candidatas.length > 0 && (
        <div className="max-h-80 overflow-auto border border-neutralCustom-100 rounded-brand-md">
          <table className="w-full text-left text-sm text-neutralCustom-600">
            <caption className="sr-only">Facturas que se van a cargar</caption>
            <thead className="sticky top-0 bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Número</th>
                <th scope="col" className="px-4 py-2 font-semibold">Proveedor</th>
                <th scope="col" className="px-4 py-2 font-semibold">Fecha</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutralCustom-100">
              {candidatas.map((c) => (
                <tr key={c.cufe}>
                  <td className="px-4 py-2 font-medium text-neutralCustom-800 whitespace-nowrap">{c.numero || "-"}</td>
                  <td className="px-4 py-2">{c.proveedor_nombre}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{c.fecha}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap tabular-nums">
                    {c.total != null ? formatCOP(c.total) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
