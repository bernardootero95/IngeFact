import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  listDocumentosSoporte,
  obtenerRepresentacionPdfDocumentoSoporte,
  enviarDocumentoSoportePorCorreo,
} from "@ingefact/core-api";
import { ToastAlert, Button, IconButton, TableSkeleton } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import EnviarCorreoPopover from "../../../components/EnviarCorreoPopover";
import { abrirRepresentacion } from "../../../utils/representacionPdf";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_BADGE = {
  borrador: "bg-neutralCustom-100 text-neutralCustom-600",
  enviado: "bg-fiscal-info/10 text-fiscal-info",
  aceptado: "bg-brand-50 text-brand-600",
  rechazado: "bg-fiscal-danger/10 text-fiscal-danger",
};

const ESTADO_LABEL = { borrador: "Borrador", enviado: "Enviado", aceptado: "Aceptado", rechazado: "Rechazado" };

export default function SupportDocumentsListPage() {
  const navigate = useNavigate();
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const handleVerRepresentacion = (documento) =>
    abrirRepresentacion({
      tieneDocumentoValido: documento.estado === "aceptado",
      obtenerPdf: () => obtenerRepresentacionPdfDocumentoSoporte(documento.id),
      navigate,
      rutaPreview: `/support-documents/${documento.id}/representacion`,
      onError: (message) => setToast({ message, type: "error" }),
    });

  const fetchDocumentos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDocumentos(await listDocumentosSoporte());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Documento Soporte</h2>
            <p className="text-xs text-neutralCustom-500">
              Documento Soporte de Adquisiciones para compras a proveedores no obligados a facturar.
            </p>
          </div>
          <Button
            onClick={() => navigate("/support-documents/new")}
            variant="primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo documento
          </Button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-x-auto">
            {loading ? (
              <TableSkeleton columns={6} label="Cargando..." />
            ) : loadError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-fiscal-danger mb-3">No se pudieron cargar: {loadError}</p>
                <Button
                  onClick={fetchDocumentos}
                  variant="danger"
                >
                  Reintentar
                </Button>
              </div>
            ) : documentos.length > 0 ? (
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Número</th>
                    <th className="px-6 py-3 font-semibold">Proveedor</th>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold">Estado</th>
                    <th className="px-6 py-3 text-right font-semibold">Total</th>
                    <th className="px-6 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {documentos.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => navigate(`/support-documents/${d.id}`)}
                      className="hover:bg-neutralCustom-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">
                        {d.numero_completo || "Borrador"}
                      </td>
                      <td className="px-6 py-4">{d.proveedor_nombre}</td>
                      <td className="px-6 py-4">{d.fecha}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            ESTADO_BADGE[d.estado] || ESTADO_BADGE.borrador
                          }`}
                        >
                          {ESTADO_LABEL[d.estado] || d.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-neutralCustom-800">
                        {formatCOP(d.total)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            title={d.estado === "aceptado" ? "Ver representación gráfica" : "Vista previa"}
                            onClick={() => handleVerRepresentacion(d)}
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
                          {d.estado === "aceptado" && (
                            <EnviarCorreoPopover
                              onEnviar={(correo) => enviarDocumentoSoportePorCorreo(d.id, correo)}
                              onEnviado={(correo) =>
                                setToast({ message: `Documento soporte enviado a ${correo}.`, type: "success" })
                              }
                            />
                          )}
                          {(d.estado === "borrador" || d.estado === "rechazado") && (
                            <IconButton
                              title={d.estado === "rechazado" ? "Corregir y reenviar" : "Continuar editando"}
                              onClick={() => navigate(`/support-documents/${d.id}/edit`)}
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
                          <IconButton title="Ver detalle" onClick={() => navigate(`/support-documents/${d.id}`)}>
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
                  No tienes Documentos Soporte registrados
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  Crea uno para soportar una compra a un proveedor no obligado a facturar electrónicamente.
                </p>
                <Button
                  onClick={() => navigate("/support-documents/new")}
                  variant="primary"
                >
                  Nuevo documento
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
