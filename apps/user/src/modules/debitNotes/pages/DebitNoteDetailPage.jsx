import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getNotaDebito, eliminarBorradorNotaDebito, obtenerUrlXmlNotaDebito } from "@ingefact/core-api";
import { ToastAlert } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_INFO = {
  borrador: { icon: "📝", label: "Borrador", classes: "bg-neutralCustom-100 text-neutralCustom-600" },
  enviada: { icon: "⏳", label: "Enviada a la DIAN", classes: "bg-fiscal-info/10 text-fiscal-info" },
  aceptada: { icon: "✅", label: "Aceptada por la DIAN", classes: "bg-brand-50 text-brand-600" },
  rechazada: { icon: "❌", label: "Rechazada por la DIAN", classes: "bg-fiscal-danger/10 text-fiscal-danger" },
};

export default function DebitNoteDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [nota, setNota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingXml, setIsDownloadingXml] = useState(false);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const cargarNota = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getNotaDebito(id);
      setNota(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarNota();
  }, [cargarNota]);

  const handleEliminar = async () => {
    if (!window.confirm("¿Eliminar este borrador de nota débito?")) return;
    setIsDeleting(true);
    try {
      await eliminarBorradorNotaDebito(id);
      navigate("/debit-notes");
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDescargarXml = async () => {
    setIsDownloadingXml(true);
    try {
      const { url } = await obtenerUrlXmlNotaDebito(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsDownloadingXml(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <button onClick={() => navigate("/debit-notes")} className="text-brand-600 hover:underline font-medium">
                Notas Débito
              </button>
              <span>/</span>
              <span>{nota?.numero_completo || "Borrador"}</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              Nota Débito {nota?.numero_completo || "(borrador)"}
            </h2>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</div>
          ) : loadError ? (
            <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md max-w-3xl mx-auto">
              {loadError}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                      (ESTADO_INFO[nota.estado] || ESTADO_INFO.borrador).classes
                    }`}
                  >
                    {(ESTADO_INFO[nota.estado] || ESTADO_INFO.borrador).icon}{" "}
                    {(ESTADO_INFO[nota.estado] || ESTADO_INFO.borrador).label}
                  </span>
                </div>

                <div className="bg-brand-50 border border-brand-400 rounded-brand-md p-3 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-brand-600 font-semibold uppercase">Factura afectada</p>
                    <p className="text-sm font-semibold text-neutralCustom-800">{nota.factura_numero_completo}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/invoices/${nota.factura_id}`)}
                    className="text-brand-600 hover:text-brand-400 text-xs font-medium shrink-0 ml-4"
                  >
                    Ver factura →
                  </button>
                </div>

                {nota.cude && (
                  <div className="bg-neutralCustom-50 rounded-brand-md p-3 flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-neutralCustom-500">CUDE</p>
                      <p className="text-xs font-mono text-neutralCustom-700 break-all">{nota.cude}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(nota.cude)}
                      className="text-brand-600 hover:text-brand-400 text-xs font-medium shrink-0 ml-4"
                    >
                      Copiar
                    </button>
                  </div>
                )}

                {nota.estado === "rechazada" && nota.razon_rechazo && (
                  <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md mb-2">
                    <p className="font-medium">{nota.razon_rechazo}</p>
                  </div>
                )}

                {nota.notificaciones_dian && nota.notificaciones_dian.length > 0 && (
                  <div
                    className={`p-3 border text-sm rounded-brand-md mb-4 ${
                      nota.estado === "rechazada"
                        ? "bg-red-50 border-fiscal-danger text-fiscal-danger"
                        : "bg-amber-50 border-amber-300 text-amber-700"
                    }`}
                  >
                    <p className="font-medium mb-1">Detalle de la DIAN</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {nota.notificaciones_dian.map((item, index) => (
                        <li key={index}>{typeof item === "string" ? item : item.message || JSON.stringify(item)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {(nota.estado === "borrador" || nota.estado === "rechazada") && (
                    <>
                      <button
                        onClick={() => navigate(`/debit-notes/${id}/edit`)}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
                      >
                        {nota.estado === "rechazada" ? "Corregir y Reenviar" : "Continuar Editando"}
                      </button>
                      <button
                        onClick={handleEliminar}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-white border border-fiscal-danger text-fiscal-danger hover:bg-red-50 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                      >
                        {isDeleting
                          ? "Eliminando..."
                          : nota.estado === "rechazada"
                            ? "Eliminar Nota"
                            : "Eliminar Borrador"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate(`/debit-notes/${id}/representacion`)}
                    className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors"
                  >
                    {nota.cude ? "Ver Representación Gráfica" : "Vista Previa (Borrador)"}
                  </button>
                  {nota.cude && (
                    <button
                      onClick={handleDescargarXml}
                      disabled={isDownloadingXml}
                      className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                    >
                      {isDownloadingXml ? "Obteniendo..." : "Descargar XML"}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-neutralCustom-800 mb-3">Información general</h3>
                  <dl className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-neutralCustom-500">Fecha</dt>
                      <dd className="font-medium text-neutralCustom-800">{nota.fecha}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutralCustom-500">Motivo</dt>
                      <dd className="font-medium text-neutralCustom-800">{nota.motivo_codigo}</dd>
                    </div>
                  </dl>
                </div>
                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-neutralCustom-800 mb-3">Cliente</h3>
                  <dl className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-neutralCustom-500">Nombre</dt>
                      <dd className="font-medium text-neutralCustom-800">{nota.cliente_nombre}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm overflow-hidden">
                <h3 className="text-sm font-semibold text-neutralCustom-800 px-6 pt-6 mb-3">Líneas</h3>
                <table className="w-full text-left text-sm text-neutralCustom-600">
                  <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-y border-neutralCustom-100">
                    <tr>
                      <th className="px-6 py-2.5 font-semibold">Descripción</th>
                      <th className="px-6 py-2.5 text-right font-semibold">Cantidad</th>
                      <th className="px-6 py-2.5 text-right font-semibold">Precio</th>
                      <th className="px-6 py-2.5 text-right font-semibold">Impuesto</th>
                      <th className="px-6 py-2.5 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutralCustom-100">
                    {nota.lineas.map((linea) => (
                      <tr key={linea.id}>
                        <td className="px-6 py-3">{linea.descripcion}</td>
                        <td className="px-6 py-3 text-right">{linea.cantidad}</td>
                        <td className="px-6 py-3 text-right">{formatCOP(linea.precio_unitario)}</td>
                        <td className="px-6 py-3 text-right">{formatCOP(linea.impuesto_linea)}</td>
                        <td className="px-6 py-3 text-right font-medium text-neutralCustom-800">
                          {formatCOP(linea.total_linea)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end p-6">
                  <div className="w-56 space-y-1 text-sm">
                    <div className="flex justify-between text-neutralCustom-600">
                      <span>Subtotal</span>
                      <span>{formatCOP(nota.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-neutralCustom-600">
                      <span>Total impuestos</span>
                      <span>{formatCOP(nota.total_impuestos)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-100 pt-1.5">
                      <span>Total</span>
                      <span>{formatCOP(nota.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
