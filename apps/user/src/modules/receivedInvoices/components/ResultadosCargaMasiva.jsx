import { Link } from "react-router-dom";
import { RESULTADO_BADGE, RESULTADO_LABELS, contarResultados, plural } from "../cargaMasiva";

/** Avance de la carga y resultado de cada factura a medida que llega. */
export default function ResultadosCargaMasiva({ candidatas, resultados, cargando }) {
  const total = candidatas.length;
  const procesadas = resultados.length;
  const porcentaje = total ? Math.round((procesadas / total) * 100) : 0;
  const conteo = contarResultados(resultados);
  const porCufe = new Map(candidatas.map((c) => [c.cufe, c]));

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <p role="status" aria-atomic="true" className="font-medium text-neutralCustom-800">
            {cargando
              ? `Cargando ${procesadas} de ${total} facturas...`
              : `Listo: ${plural(conteo.cargada, "factura cargada", "facturas cargadas")}`}
          </p>
          <span className="text-neutralCustom-500 tabular-nums" aria-hidden="true">{porcentaje}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Avance de la carga"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={procesadas}
          className="h-2 w-full bg-neutralCustom-100 rounded-full overflow-hidden"
        >
          <div className="h-full bg-brand-600 transition-[width] duration-300" style={{ width: `${porcentaje}%` }} />
        </div>
        {!cargando && (conteo.omitida > 0 || conteo.error > 0) && (
          <p className="mt-2 text-xs text-neutralCustom-500">
            {conteo.omitida > 0 && `${plural(conteo.omitida, "no se cargó", "no se cargaron")} al revisarlas en la DIAN. `}
            {conteo.error > 0 && `${plural(conteo.error, "tuvo error", "tuvieron error")}; puedes reintentarlas.`}
          </p>
        )}
      </div>

      {procesadas > 0 && (
        <div className="max-h-96 overflow-auto border border-neutralCustom-100 rounded-brand-md">
          <table className="w-full text-left text-sm text-neutralCustom-600">
            <caption className="sr-only">Resultado de cada factura</caption>
            <thead className="sticky top-0 bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Número</th>
                <th scope="col" className="px-4 py-2 font-semibold">Proveedor</th>
                <th scope="col" className="px-4 py-2 font-semibold">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutralCustom-100">
              {resultados.map((r) => {
                const candidata = porCufe.get(r.cufe);
                return (
                  <tr key={r.cufe}>
                    <td className="px-4 py-2 font-medium text-neutralCustom-800 whitespace-nowrap">
                      {r.factura ? (
                        <Link to={`/received-invoices/${r.factura.id}`} className="text-brand-600 hover:underline">
                          {r.factura.numero || candidata?.numero}
                        </Link>
                      ) : (
                        candidata?.numero || "-"
                      )}
                    </td>
                    <td className="px-4 py-2">{candidata?.proveedor_nombre}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RESULTADO_BADGE[r.resultado]}`}>
                        {RESULTADO_LABELS[r.resultado]}
                      </span>
                      {r.mensaje && <p className="mt-1 text-xs text-neutralCustom-500">{r.mensaje}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
