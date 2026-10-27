import { Link } from "react-router-dom";
import { plural } from "../cargaMasiva";
import { RESULTADO_BADGE, RESULTADO_LABELS, contarResultadosEvento } from "../eventoMasivo";

/** Avance del envio y resultado de cada factura a medida que llega. */
export default function ResultadosEventoMasivo({ total, resultados, enviando }) {
  const procesadas = resultados.length;
  const porcentaje = total ? Math.round((procesadas / total) * 100) : 0;
  const conteo = contarResultadosEvento(resultados);
  const fallidos = resultados.filter((r) => r.resultado === "fallido");

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <p role="status" aria-atomic="true" className="font-medium text-neutralCustom-800">
            {enviando
              ? `Enviando ${procesadas} de ${total} eventos...`
              : `Listo: ${plural(conteo.aceptado, "evento aplicado", "eventos aplicados")}, ${plural(
                  conteo.fallido,
                  "fallido",
                  "fallidos"
                )}`}
          </p>
          <span className="text-neutralCustom-500 tabular-nums" aria-hidden="true">{porcentaje}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Avance del envío"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={procesadas}
          className="h-2 w-full bg-neutralCustom-100 rounded-full overflow-hidden"
        >
          <div className="h-full bg-brand-600 transition-[width] duration-300" style={{ width: `${porcentaje}%` }} />
        </div>
      </div>

      {!enviando && procesadas > 0 && (
        <dl className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-brand-md bg-brand-50">
            <dt className="text-xs text-brand-600">Aplicados</dt>
            <dd className="text-2xl font-semibold text-brand-600 tabular-nums">{conteo.aceptado}</dd>
          </div>
          <div className="p-3 rounded-brand-md bg-fiscal-danger/10">
            <dt className="text-xs text-fiscal-danger">Fallidos</dt>
            <dd className="text-2xl font-semibold text-fiscal-danger tabular-nums">{conteo.fallido}</dd>
          </div>
        </dl>
      )}

      {(enviando ? resultados : fallidos).length > 0 && (
        <div className="max-h-96 overflow-auto border border-neutralCustom-100 rounded-brand-md">
          <table className="w-full text-left text-sm text-neutralCustom-600">
            <caption className="sr-only">{enviando ? "Resultado de cada factura" : "Eventos que fallaron y su motivo"}</caption>
            <thead className="sticky top-0 bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Número</th>
                <th scope="col" className="px-4 py-2 font-semibold">Proveedor</th>
                <th scope="col" className="px-4 py-2 font-semibold">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutralCustom-100">
              {(enviando ? resultados : fallidos).map((r) => (
                <tr key={r.factura_id}>
                  <td className="px-4 py-2 font-medium text-neutralCustom-800 whitespace-nowrap">
                    <Link to={`/received-invoices/${r.factura_id}`} className="text-brand-600 hover:underline">
                      {r.numero || "Ver factura"}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.proveedor_nombre || "-"}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RESULTADO_BADGE[r.resultado]}`}>
                      {RESULTADO_LABELS[r.resultado]}
                    </span>
                    {r.mensaje && <p className="mt-1 text-xs text-neutralCustom-500">{r.mensaje}</p>}
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
