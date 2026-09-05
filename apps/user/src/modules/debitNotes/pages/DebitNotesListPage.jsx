import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listNotasDebito } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADOS = [
  { value: "", label: "Todos los estados" },
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
];

const ESTADO_BADGE = {
  borrador: "bg-neutralCustom-100 text-neutralCustom-600",
  enviada: "bg-fiscal-info/10 text-fiscal-info",
  aceptada: "bg-brand-50 text-brand-600",
  rechazada: "bg-fiscal-danger/10 text-fiscal-danger",
};

const ESTADO_LABEL = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

function IconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 text-neutralCustom-500 hover:text-brand-600 hover:bg-brand-50 rounded-brand-md transition-colors"
    >
      {children}
    </button>
  );
}

export default function DebitNotesListPage() {
  const navigate = useNavigate();
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [estado, setEstado] = useState("");

  const fetchNotas = useCallback(async (estadoFiltro) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listNotasDebito({ estado: estadoFiltro || undefined });
      setNotas(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotas(estado);
  }, [fetchNotas, estado]);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Notas Débito</h2>
            <p className="text-xs text-neutralCustom-500">Consulta las notas débito emitidas contra tus facturas.</p>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutralCustom-100 bg-neutralCustom-50/50 flex justify-end items-center gap-3">
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
              >
                {ESTADOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando notas débito...
              </div>
            ) : loadError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-fiscal-danger mb-3">No se pudieron cargar las notas: {loadError}</p>
                <button
                  onClick={() => fetchNotas(estado)}
                  className="px-4 py-2 border border-fiscal-danger text-fiscal-danger text-sm font-medium rounded-brand-md hover:bg-red-50 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : notas.length > 0 ? (
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Número</th>
                    <th className="px-6 py-3 font-semibold">Factura asociada</th>
                    <th className="px-6 py-3 font-semibold">Cliente</th>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold">Estado</th>
                    <th className="px-6 py-3 text-right font-semibold">Total</th>
                    <th className="px-6 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {notas.map((n) => (
                    <tr
                      key={n.id}
                      onClick={() => navigate(`/debit-notes/${n.id}`)}
                      className="hover:bg-neutralCustom-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">
                        {n.numero_completo || "Sin enviar"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/invoices/${n.factura_id}`);
                          }}
                          className="text-brand-600 hover:underline"
                        >
                          {n.factura_numero_completo}
                        </button>
                      </td>
                      <td className="px-6 py-4">{n.cliente_nombre}</td>
                      <td className="px-6 py-4">{n.fecha}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            ESTADO_BADGE[n.estado] || ESTADO_BADGE.borrador
                          }`}
                        >
                          {ESTADO_LABEL[n.estado] || n.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-neutralCustom-800">
                        {formatCOP(n.total)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            title={n.cude ? "Ver representación gráfica" : "Vista previa (borrador)"}
                            onClick={() => navigate(`/debit-notes/${n.id}/representacion`)}
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
                          {(n.estado === "borrador" || n.estado === "rechazada") && (
                            <IconButton
                              title={n.estado === "rechazada" ? "Corregir y reenviar" : "Continuar editando"}
                              onClick={() => navigate(`/debit-notes/${n.id}/edit`)}
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
                          <IconButton title="Ver detalle" onClick={() => navigate(`/debit-notes/${n.id}`)}>
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
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">
                  {estado ? "No se encontraron notas débito" : "No tienes notas débito registradas"}
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  {estado
                    ? "Prueba con otro filtro."
                    : "Crea una nota débito desde el detalle de una factura aceptada."}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
