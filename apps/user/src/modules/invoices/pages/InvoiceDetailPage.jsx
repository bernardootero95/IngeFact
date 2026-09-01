import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFactura, eliminarBorradorFactura, obtenerUrlXmlFactura } from "@ingefact/core-api";
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

export default function InvoiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingXml, setIsDownloadingXml] = useState(false);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const cargarFactura = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getFactura(id);
      setFactura(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarFactura();
  }, [cargarFactura]);

  const handleEliminar = async () => {
    if (!window.confirm("¿Eliminar este borrador de factura?")) return;
    setIsDeleting(true);
    try {
      await eliminarBorradorFactura(id);
      navigate("/invoices");
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDescargarXml = async () => {
    setIsDownloadingXml(true);
    try {
      const { url } = await obtenerUrlXmlFactura(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsDownloadingXml(false);
    }
  };

  const historial = factura
    ? [
        { label: "Factura creada", fecha: factura.creado },
        factura.fecha_envio && { label: "Factura enviada a la DIAN", fecha: factura.fecha_envio },
        factura.fecha_respuesta &&
          (factura.estado === "aceptada"
            ? { label: "Factura aceptada por la DIAN — CUFE generado", fecha: factura.fecha_respuesta }
            : { label: `Factura rechazada por la DIAN — ${factura.razon_rechazo}`, fecha: factura.fecha_respuesta }),
      ].filter(Boolean)
    : [];

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <button onClick={() => navigate("/invoices")} className="text-brand-600 hover:underline font-medium">
                Facturas
              </button>
              <span>/</span>
              <span>{factura?.numero_completo || "Borrador"}</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              Factura {factura?.numero_completo || "(borrador)"}
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
                      (ESTADO_INFO[factura.estado] || ESTADO_INFO.borrador).classes
                    }`}
                  >
                    {(ESTADO_INFO[factura.estado] || ESTADO_INFO.borrador).icon}{" "}
                    {(ESTADO_INFO[factura.estado] || ESTADO_INFO.borrador).label}
                  </span>
                </div>

                {factura.cufe && (
                  <div className="bg-neutralCustom-50 rounded-brand-md p-3 flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-neutralCustom-500">CUFE</p>
                      <p className="text-xs font-mono text-neutralCustom-700 break-all">{factura.cufe}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(factura.cufe)}
                      className="text-brand-600 hover:text-brand-400 text-xs font-medium shrink-0 ml-4"
                    >
                      Copiar
                    </button>
                  </div>
                )}

                {factura.estado === "rechazada" && factura.razon_rechazo && (
                  <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md mb-4">
                    {factura.razon_rechazo}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {factura.estado === "borrador" && (
                    <>
                      <button
                        onClick={() => navigate(`/invoices/${id}/edit`)}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
                      >
                        Continuar Editando
                      </button>
                      <button
                        onClick={handleEliminar}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-white border border-fiscal-danger text-fiscal-danger hover:bg-red-50 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? "Eliminando..." : "Eliminar Borrador"}
                      </button>
                    </>
                  )}
                  {factura.alegra_invoice_id && (
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
                      <dd className="font-medium text-neutralCustom-800">{factura.fecha}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutralCustom-500">Forma de pago</dt>
                      <dd className="font-medium text-neutralCustom-800">{factura.forma_pago || "-"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutralCustom-500">Método de pago</dt>
                      <dd className="font-medium text-neutralCustom-800">{factura.metodo_pago || "-"}</dd>
                    </div>
                  </dl>
                </div>
                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-neutralCustom-800 mb-3">Cliente</h3>
                  <dl className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-neutralCustom-500">Nombre</dt>
                      <dd className="font-medium text-neutralCustom-800">{factura.cliente_nombre}</dd>
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
                    {factura.lineas.map((linea) => (
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
                      <span>{formatCOP(factura.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-neutralCustom-600">
                      <span>Total impuestos</span>
                      <span>{formatCOP(factura.total_impuestos)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-100 pt-1.5">
                      <span>Total</span>
                      <span>{formatCOP(factura.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {historial.length > 0 && (
                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-neutralCustom-800 mb-4">Historial</h3>
                  <div className="space-y-4">
                    {historial.map((evento, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              index === historial.length - 1 ? "bg-brand-600" : "bg-brand-400"
                            }`}
                          />
                          {index < historial.length - 1 && <span className="w-px flex-1 bg-neutralCustom-200" />}
                        </div>
                        <div className="pb-1">
                          <p className="text-sm font-medium text-neutralCustom-800">{evento.label}</p>
                          <p className="text-xs text-neutralCustom-500">{new Date(evento.fecha).toLocaleString("es-CO")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
