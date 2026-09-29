import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listFacturasRecibidas } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import { Button, ToastAlert, TableSkeleton, useTableView, SortableTh, Pagination, ClickableRow } from "@ingefact/ui";
import EstadoBadge from "../components/EstadoBadge";
import EventoActions from "../components/EventoActions";
import DescargarXmlButton from "../components/DescargarXmlButton";
import { formatCOP } from "../eventos";

export default function ReceivedInvoicesListPage() {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setFacturas(await listFacturasRecibidas());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  const view = useTableView(facturas);
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Facturas Recibidas</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              Acusa recibo, confirma la mercancía y acepta o rechaza las facturas a crédito de tus proveedores (RADIAN).
            </p>
          </div>
          <Button onClick={() => navigate("/received-invoices/new")} variant="primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </Button>
        </header>

        {toast && <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-x-auto">
            {loading ? (
              <TableSkeleton columns={7} label="Cargando facturas recibidas..." />
            ) : loadError ? (
              <div className="p-12 text-center">
                <p role="alert" className="text-sm text-fiscal-danger mb-3">No se pudieron cargar: {loadError}</p>
                <Button onClick={fetchFacturas} variant="danger">
                  Reintentar
                </Button>
              </div>
            ) : facturas.length > 0 ? (
              <>
                <table className="w-full text-left text-sm text-neutralCustom-600">
                  <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                    <tr>
                      <SortableTh sortKey="numero" sort={view.sort} onSort={view.toggleSort}>Número</SortableTh>
                      <SortableTh sortKey="proveedor_nombre" sort={view.sort} onSort={view.toggleSort}>Proveedor</SortableTh>
                      <SortableTh sortKey="fecha" sort={view.sort} onSort={view.toggleSort}>Fecha</SortableTh>
                      <SortableTh sortKey="fecha_vencimiento" sort={view.sort} onSort={view.toggleSort}>Vencimiento</SortableTh>
                      <SortableTh sortKey="total" sort={view.sort} onSort={view.toggleSort} align="right">Total</SortableTh>
                      <SortableTh sortKey="estado_label" sort={view.sort} onSort={view.toggleSort}>Estado</SortableTh>
                      <th scope="col" className="px-6 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutralCustom-100">
                    {view.rows.map((f) => (
                      <ClickableRow key={f.id} to={`/received-invoices/${f.id}`}>
                        <td className="px-6 py-4 font-medium text-neutralCustom-800 whitespace-nowrap">
                          <ClickableRow.Link to={`/received-invoices/${f.id}`}>
                            {f.numero || `${f.cufe.slice(0, 10)}…`}
                          </ClickableRow.Link>
                        </td>
                        <td className="px-6 py-4">{f.proveedor_nombre}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{f.fecha}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{f.fecha_vencimiento || "-"}</td>
                        <td className="px-6 py-4 text-right font-medium text-neutralCustom-800 whitespace-nowrap">
                          {f.total != null ? formatCOP(f.total) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <EstadoBadge
                            estado={f.estado}
                            label={f.estado_label}
                            ultimoEventoRechazado={f.ultimo_evento_rechazado}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <EventoActions facturaId={f.id} eventosPermitidos={f.eventos_permitidos} />
                            <span className="mx-1 h-5 w-px bg-neutralCustom-200" aria-hidden="true" />
                            <DescargarXmlButton
                              facturaId={f.id}
                              onError={(message) => setToast({ message, type: "error" })}
                            />
                          </div>
                        </td>
                      </ClickableRow>
                    ))}
                  </tbody>
                </table>
                <Pagination {...view.pagination} />
              </>
            ) : (
              <div className="p-16 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-50 mb-4">
                  <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">No tienes facturas recibidas</h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  Agrega una factura a crédito de tu proveedor escribiendo su CUFE; traemos sus datos de la DIAN.
                </p>
                <Button onClick={() => navigate("/received-invoices/new")} variant="primary">
                  Agregar
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
