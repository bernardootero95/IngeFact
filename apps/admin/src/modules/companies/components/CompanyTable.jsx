import { ClickableRow, Pagination, SortableTh, useTableView } from "@ingefact/ui";
import { formatoFecha } from "../companyRows";
import PlanBadge from "./PlanBadge";

const ESTADO_EMPRESA = {
  activo: { clase: "bg-brand-50 text-brand-700", label: "Activa" },
  inactivo: { clase: "bg-neutralCustom-100 text-neutralCustom-600", label: "Inactiva" },
  error_alegra: { clase: "bg-fiscal-danger/10 text-fiscal-danger", label: "Error en Alegra" },
};

const rutaEmpresa = (id) => `/admin/companies/${id}/edit`;

function textoVencimiento(fila) {
  if (fila.dias_para_vencer === null) return null;
  if (fila.dias_para_vencer < 0) return `Venció hace ${-fila.dias_para_vencer} días`;
  if (fila.dias_para_vencer === 0) return "Vence hoy";
  return `Vence en ${fila.dias_para_vencer} días`;
}

function BarraDocumentos({ fila }) {
  if (fila.max_documentos === null) return <span className="text-neutralCustom-500">—</span>;
  const alerta = fila.porcentaje >= 90;
  return (
    <div className="w-full max-w-[160px]">
      <div className="mb-1 flex justify-between gap-2 text-xs tabular-nums">
        <span className={alerta ? "font-semibold text-fiscal-danger" : "text-neutralCustom-700"}>
          {fila.documentos_usados.toLocaleString("es-CO")} / {fila.max_documentos.toLocaleString("es-CO")}
        </span>
        <span className="text-neutralCustom-500">{fila.porcentaje}%</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-neutralCustom-100"
        role="progressbar"
        aria-label="Documentos usados"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(fila.porcentaje, 100)}
      >
        <div
          className={`h-1.5 rounded-full ${alerta ? "bg-fiscal-danger" : "bg-brand-500"}`}
          style={{ width: `${Math.min(fila.porcentaje, 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Tabla de empresas. Recibe las filas ya aplanadas y filtradas (companyRows.js). */
export default function CompanyTable({ filas, hayFiltros }) {
  const view = useTableView(filas, { initialSort: { key: "razon_social", dir: "asc" } });

  if (filas.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-sm font-medium text-neutralCustom-700">
          {hayFiltros ? "Ninguna empresa coincide con los filtros" : "No hay empresas registradas"}
        </p>
        <p className="text-xs text-neutralCustom-500">
          {hayFiltros ? "Prueba con otra búsqueda o limpia los filtros." : "Crea la primera con «Nueva empresa»."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutralCustom-600">
          <thead className="border-b border-neutralCustom-100 bg-neutralCustom-50 text-xs uppercase text-neutralCustom-500">
            <tr>
              <SortableTh sortKey="razon_social" sort={view.sort} onSort={view.toggleSort}>Empresa</SortableTh>
              <SortableTh sortKey="gravedad_plan" sort={view.sort} onSort={view.toggleSort}>Plan</SortableTh>
              <SortableTh sortKey="fecha_fin" sort={view.sort} onSort={view.toggleSort}>Vigencia</SortableTh>
              <SortableTh sortKey="porcentaje" sort={view.sort} onSort={view.toggleSort}>Documentos</SortableTh>
              <SortableTh sortKey="estado" sort={view.sort} onSort={view.toggleSort}>Estado</SortableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutralCustom-100">
            {view.rows.map((fila) => {
              const estado = ESTADO_EMPRESA[fila.estado] || { clase: ESTADO_EMPRESA.inactivo.clase, label: fila.estado };
              return (
                <ClickableRow key={fila.id} to={rutaEmpresa(fila.id)}>
                  <td className="min-w-[220px] px-6 py-4">
                    <ClickableRow.Link to={rutaEmpresa(fila.id)} className="font-medium text-neutralCustom-800">
                      {fila.razon_social}
                    </ClickableRow.Link>
                    <p className="mt-0.5 font-mono text-xs text-neutralCustom-500">NIT {fila.nit}</p>
                  </td>
                  <td className="px-6 py-4">
                    <PlanBadge estado={fila.estado_plan} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {fila.fecha_fin ? (
                      <>
                        <p className="text-neutralCustom-700 tabular-nums">
                          {formatoFecha(fila.fecha_inicio)} – {formatoFecha(fila.fecha_fin)}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${
                            fila.dias_para_vencer < 0
                              ? "text-fiscal-danger"
                              : fila.estado_plan === "por_vencer"
                                ? "text-amber-700"
                                : "text-neutralCustom-500"
                          }`}
                        >
                          {textoVencimiento(fila)}
                        </p>
                      </>
                    ) : (
                      <span className="text-neutralCustom-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <BarraDocumentos fila={fila} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>
                      {estado.label}
                    </span>
                  </td>
                </ClickableRow>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination {...view.pagination} />
    </>
  );
}
