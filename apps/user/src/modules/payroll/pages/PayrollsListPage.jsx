import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listNomina, obtenerRepresentacionPdfNomina, enviarNominaPorCorreo } from "@ingefact/core-api";
import { ToastAlert, Button, IconButton, TableSkeleton, useTableView, SortableTh, Pagination } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import EnviarCorreoPopover from "../../../components/EnviarCorreoPopover";
import { abrirRepresentacion } from "../../../utils/representacionPdf";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_BADGE = {
  borrador: "bg-neutralCustom-100 text-neutralCustom-600",
  enviada: "bg-fiscal-info/10 text-fiscal-info",
  aceptada: "bg-brand-50 text-brand-600",
  rechazada: "bg-fiscal-danger/10 text-fiscal-danger",
  anulada: "bg-neutralCustom-200 text-neutralCustom-700",
};

const ESTADO_LABEL = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  anulada: "Anulada",
};

export default function PayrollsListPage() {
  const navigate = useNavigate();
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const handleVerRepresentacion = (nomina) =>
    abrirRepresentacion({
      tieneDocumentoValido: nomina.estado === "aceptada",
      obtenerPdf: () => obtenerRepresentacionPdfNomina(nomina.id),
      navigate,
      rutaPreview: `/payroll/${nomina.id}`,
      onError: (message) => setToast({ message, type: "error" }),
    });

  const fetchNominas = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setNominas(await listNomina());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNominas();
  }, [fetchNominas]);

  const view = useTableView(nominas);
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Nómina Electrónica</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">Comprobantes de nómina electrónica enviados a la DIAN.</p>
          </div>
          <Button onClick={() => navigate("/payroll/new")} variant="primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo comprobante
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-x-auto">
            {loading ? (
              <TableSkeleton columns={6} label="Cargando..." />
            ) : loadError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-fiscal-danger mb-3">No se pudieron cargar: {loadError}</p>
                <Button onClick={fetchNominas} variant="danger">
                  Reintentar
                </Button>
              </div>
            ) : nominas.length > 0 ? (
              <>
                <table className="w-full text-left text-sm text-neutralCustom-600">
                  <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                    <tr>
                      <SortableTh sortKey="numero_completo" sort={view.sort} onSort={view.toggleSort}>Número</SortableTh>
                      <SortableTh sortKey="empleado_nombre" sort={view.sort} onSort={view.toggleSort}>Empleado</SortableTh>
                      <SortableTh sortKey="fecha_liquidacion_fin" sort={view.sort} onSort={view.toggleSort}>Fecha Fin</SortableTh>
                      <SortableTh sortKey="estado" sort={view.sort} onSort={view.toggleSort}>Estado</SortableTh>
                      <SortableTh sortKey="comprobante_total" sort={view.sort} onSort={view.toggleSort} align="right">Neto a Pagar</SortableTh>
                      <th scope="col" className="px-6 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutralCustom-100">
                    {view.rows.map((n) => (
                      <tr
                        key={n.id}
                        onClick={() => navigate(`/payroll/${n.id}`)}
                        className="hover:bg-neutralCustom-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-medium text-neutralCustom-800">{n.numero_completo || "Borrador"}</td>
                        <td className="px-6 py-4">{n.empleado_nombre}</td>
                        <td className="px-6 py-4">{n.fecha_liquidacion_fin}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              ESTADO_BADGE[n.estado] || ESTADO_BADGE.borrador
                            }`}
                          >
                            {ESTADO_LABEL[n.estado] || n.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-neutralCustom-800">{formatCOP(n.comprobante_total)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              title={n.estado === "aceptada" ? "Ver representación gráfica" : "Vista previa"}
                              onClick={() => handleVerRepresentacion(n)}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.75}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </IconButton>
                            {n.estado === "aceptada" && (
                              <EnviarCorreoPopover
                                onEnviar={(correo) => enviarNominaPorCorreo(n.id, correo)}
                                onEnviado={(correo) => setToast({ message: `Nómina enviada a ${correo}.`, type: "success" })}
                              />
                            )}
                            {(n.estado === "borrador" || n.estado === "rechazada") && (
                              <IconButton
                                title={n.estado === "rechazada" ? "Corregir y reenviar" : "Continuar editando"}
                                onClick={() => navigate(`/payroll/${n.id}/edit`)}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.75}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </IconButton>
                            )}
                            <IconButton title="Ver detalle" onClick={() => navigate(`/payroll/${n.id}`)}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.75}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.75}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </IconButton>
                          </div>
                        </td>
                      </tr>
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
                      d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4 4 4 0 004 4z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">No tienes comprobantes de Nómina registrados</h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  Crea el primer comprobante de nómina electrónica para un empleado.
                </p>
                <Button onClick={() => navigate("/payroll/new")} variant="primary">
                  Nuevo comprobante
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
