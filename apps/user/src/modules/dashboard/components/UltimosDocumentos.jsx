import { Link } from "react-router-dom";
import { formatoFecha } from "../../plan/planEstado";
import { formatoCOP } from "../dashboardResumen";
import { estadoDocumento, etiquetaTipo, rutaDocumento } from "../dashboardActividad";

function EstadoBadge({ estado }) {
  const { etiqueta, clase } = estadoDocumento(estado);
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${clase}`}>
      {etiqueta}
    </span>
  );
}

const numeroDe = (doc) => doc.numero || "Sin número";

/**
 * Últimos documentos emitidos. En pantallas chicas y medianas es una lista; desde xl (descontando el menú lateral),
 * una tabla. Cada número enlaza al detalle.
 */
export default function UltimosDocumentos({ documentos }) {
  return (
    <section
      aria-labelledby="ultimos-titulo"
      className="rounded-brand-lg border border-neutralCustom-100 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 px-6 pt-6">
        <h3 id="ultimos-titulo" className="text-sm font-medium text-neutralCustom-500">
          Últimos documentos
        </h3>
        <Link
          to="/invoices"
          className="rounded-brand-md px-2 py-1 text-sm font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          Ver facturas
        </Link>
      </div>

      {documentos.length === 0 ? (
        <div className="px-6 pb-6 pt-4">
          <p className="text-sm text-neutralCustom-600">Todavía no has emitido documentos.</p>
          <Link
            to="/invoices/new"
            className="mt-2 inline-block text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            Crear tu primera factura
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-neutralCustom-100 xl:hidden">
            {documentos.map((doc) => (
              <li key={`${doc.tipo}-${doc.id}`}>
                <Link
                  to={rutaDocumento(doc)}
                  className="flex min-h-[44px] items-center justify-between gap-3 px-6 py-3 hover:bg-neutralCustom-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutralCustom-800">
                      {etiquetaTipo(doc.tipo)} {numeroDe(doc)}
                    </span>
                    <span className="block truncate text-sm text-neutralCustom-500">
                      {doc.tercero ?? "—"} · {formatoFecha(doc.fecha)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium tabular-nums text-neutralCustom-800">
                      {formatoCOP(doc.total)}
                    </span>
                    <EstadoBadge estado={doc.estado} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 hidden overflow-x-auto xl:block">
            <table className="w-full text-left text-sm text-neutralCustom-600">
              <thead className="border-y border-neutralCustom-100 bg-neutralCustom-50 text-xs uppercase text-neutralCustom-500">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold">Documento</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Tercero</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Fecha</th>
                  <th scope="col" className="px-6 py-3 text-right font-semibold">Total</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutralCustom-100">
                {documentos.map((doc) => (
                  <tr key={`${doc.tipo}-${doc.id}`} className="hover:bg-neutralCustom-50">
                    <td className="px-6 py-3">
                      <Link
                        to={rutaDocumento(doc)}
                        className="font-medium text-neutralCustom-800 underline-offset-2 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                      >
                        {numeroDe(doc)}
                      </Link>
                      <span className="block text-xs text-neutralCustom-500">{etiquetaTipo(doc.tipo)}</span>
                    </td>
                    <td className="max-w-[16rem] truncate px-6 py-3">{doc.tercero ?? "—"}</td>
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums">{formatoFecha(doc.fecha)}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-neutralCustom-800">
                      {formatoCOP(doc.total)}
                    </td>
                    <td className="px-6 py-3">
                      <EstadoBadge estado={doc.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-2" />
        </>
      )}
    </section>
  );
}
