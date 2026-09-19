import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getDocumentoSoporte,
  eliminarBorradorDocumentoSoporte,
  enviarDocumentoSoporte,
  enviarDocumentoSoportePorCorreo,
  obtenerRepresentacionPdfDocumentoSoporte,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import { ToastAlert } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import { abrirRepresentacion } from "../../../utils/representacionPdf";
import SeccionPagoDocumentoSoporte from "../components/SeccionPagoDocumentoSoporte";
import { validateFormaPago, validateMetodoPago } from "../components/SeccionPagoDocumentoSoporte.validation";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const nombreCatalogo = (catalogo, code) => catalogo.find((item) => item.code === code)?.value || code;

const ESTADO_INFO = {
  borrador: { icon: "📝", label: "Borrador", classes: "bg-neutralCustom-100 text-neutralCustom-600" },
  enviado: { icon: "⏳", label: "Enviado a la DIAN", classes: "bg-fiscal-info/10 text-fiscal-info" },
  aceptado: { icon: "✅", label: "Aceptado por la DIAN", classes: "bg-brand-50 text-brand-600" },
  rechazado: { icon: "❌", label: "Rechazado por la DIAN", classes: "bg-fiscal-danger/10 text-fiscal-danger" },
};

export default function SupportDocumentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [documento, setDocumento] = useState(null);
  const [formasPago, setFormasPago] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const [formaPago, setFormaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [errors, setErrors] = useState({});

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [documentoData, formasPagoData, metodosPagoData] = await Promise.all([
        getDocumentoSoporte(id),
        listPublicReferenceTable("formas_pago"),
        listPublicReferenceTable("metodos_pago"),
      ]);
      // Codigo "1" = "Instrumento no definido" -- un placeholder del catalogo
      // DIAN, no un metodo de pago real (mismo criterio que InvoiceFormPage).
      const metodosPagoValidos = metodosPagoData.filter((m) => m.code !== "1");
      setDocumento(documentoData);
      setFormasPago(formasPagoData);
      setMetodosPago(metodosPagoValidos);
      setFormaPago(documentoData.forma_pago || formasPagoData[0]?.code || "");
      setMetodoPago(documentoData.metodo_pago || metodosPagoValidos[0]?.code || "");
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleEliminar = async () => {
    if (!window.confirm("¿Eliminar este documento soporte?")) return;
    setIsDeleting(true);
    try {
      await eliminarBorradorDocumentoSoporte(id);
      navigate("/support-documents");
    } catch (error) {
      setSendError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    const nuevosErrores = {
      formaPago: validateFormaPago(formaPago),
      metodoPago: validateMetodoPago(metodoPago),
    };
    setErrors(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    setIsSending(true);
    setSendError(null);
    try {
      const actualizado = await enviarDocumentoSoporte(id, { forma_pago: formaPago, metodo_pago: metodoPago });
      setDocumento(actualizado);
    } catch (error) {
      setSendError(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerRepresentacion = async () => {
    setIsLoadingPdf(true);
    await abrirRepresentacion({
      tieneDocumentoValido: documento.estado === "aceptado",
      obtenerPdf: () => obtenerRepresentacionPdfDocumentoSoporte(id),
      navigate,
      rutaPreview: `/support-documents/${id}/representacion`,
      onError: (message) => setToast({ message, type: "error" }),
    });
    setIsLoadingPdf(false);
  };

  const handleEnviarCorreo = async () => {
    setIsSendingEmail(true);
    try {
      await enviarDocumentoSoportePorCorreo(id);
      setToast({ message: "Documento soporte enviado por correo al proveedor.", type: "success" });
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</main>
      </div>
    );
  }

  if (loadError || !documento) {
    return (
      <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
            {loadError || "Documento Soporte no encontrado."}
          </div>
        </main>
      </div>
    );
  }

  const editable = documento.estado === "borrador" || documento.estado === "rechazado";
  // Los documentos nuevos no llevan impuestos; solo los anteriores a ese cambio pueden traerlos.
  const tieneImpuestos = Number(documento.total_impuestos) > 0;
  const estadoInfo = ESTADO_INFO[documento.estado] || ESTADO_INFO.borrador;

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <button
                onClick={() => navigate("/support-documents")}
                className="text-brand-600 hover:underline font-medium"
              >
                Documento Soporte
              </button>
              <span>/</span>
              <span>{documento.numero_completo || "Borrador"}</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">{documento.proveedor_nombre}</h2>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${estadoInfo.classes}`}
                >
                  {estadoInfo.icon} {estadoInfo.label}
                </span>
                <div className="flex flex-wrap justify-end gap-3">
                  {editable && (
                    <>
                      <button
                        onClick={() => navigate(`/support-documents/${id}/edit`)}
                        className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors"
                      >
                        {documento.estado === "rechazado" ? "Corregir" : "Continuar Editando"}
                      </button>
                      <button
                        onClick={handleEliminar}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-white border border-fiscal-danger text-fiscal-danger hover:bg-red-50 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? "Eliminando..." : "Eliminar"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleVerRepresentacion}
                    disabled={isLoadingPdf}
                    className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                  >
                    {isLoadingPdf
                      ? "Generando PDF..."
                      : documento.estado === "aceptado"
                        ? "Ver Representación Gráfica"
                        : "Vista Previa"}
                  </button>
                  {documento.estado === "aceptado" && (
                    <button
                      onClick={handleEnviarCorreo}
                      disabled={isSendingEmail}
                      className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                    >
                      {isSendingEmail ? "Enviando..." : "Reenviar por Correo"}
                    </button>
                  )}
                </div>
              </div>

              {documento.cuds && (
                <div className="bg-neutralCustom-50 rounded-brand-md p-3 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-neutralCustom-500">CUDS</p>
                    <p className="text-xs font-mono text-neutralCustom-700 break-all">{documento.cuds}</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard?.writeText(documento.cuds)}
                    className="text-brand-600 hover:text-brand-400 text-xs font-medium shrink-0 ml-4"
                  >
                    Copiar
                  </button>
                </div>
              )}

              {documento.estado === "rechazado" && documento.razon_rechazo && (
                <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md mb-2">
                  <p className="font-medium">{documento.razon_rechazo}</p>
                </div>
              )}

              {documento.notificaciones_dian && documento.notificaciones_dian.length > 0 && (
                <div
                  className={`p-3 border text-sm rounded-brand-md mb-2 ${
                    documento.estado === "rechazado"
                      ? "bg-red-50 border-fiscal-danger text-fiscal-danger"
                      : "bg-amber-50 border-amber-300 text-amber-700"
                  }`}
                >
                  <p className="font-medium mb-1">Detalle de la DIAN</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {documento.notificaciones_dian.map((item, index) => (
                      <li key={index}>{typeof item === "string" ? item : item.message || JSON.stringify(item)}</li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="text-sm space-y-2 mt-2">
                <div className="flex justify-between">
                  <dt className="text-neutralCustom-500">Fecha</dt>
                  <dd className="font-medium text-neutralCustom-800">{documento.fecha}</dd>
                </div>
                {documento.forma_pago && (
                  <div className="flex justify-between">
                    <dt className="text-neutralCustom-500">Forma de pago</dt>
                    <dd className="font-medium text-neutralCustom-800">
                      {nombreCatalogo(formasPago, documento.forma_pago)}
                    </dd>
                  </div>
                )}
                {documento.metodo_pago && (
                  <div className="flex justify-between">
                    <dt className="text-neutralCustom-500">Método de pago</dt>
                    <dd className="font-medium text-neutralCustom-800">
                      {nombreCatalogo(metodosPago, documento.metodo_pago)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm overflow-hidden">
              <h3 className="text-sm font-semibold text-neutralCustom-800 px-6 pt-6 mb-3">Líneas</h3>
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-y border-neutralCustom-100">
                  <tr>
                    <th className="px-6 py-2.5 font-semibold">Descripción</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Cantidad</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Precio</th>
                    {tieneImpuestos && <th className="px-6 py-2.5 text-right font-semibold">Impuesto</th>}
                    <th className="px-6 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {documento.lineas.map((linea) => (
                    <tr key={linea.id}>
                      <td className="px-6 py-3">{linea.descripcion}</td>
                      <td className="px-6 py-3 text-right">{linea.cantidad}</td>
                      <td className="px-6 py-3 text-right">{formatCOP(linea.precio_unitario)}</td>
                      {tieneImpuestos && <td className="px-6 py-3 text-right">{formatCOP(linea.impuesto_linea)}</td>}
                      <td className="px-6 py-3 text-right font-medium text-neutralCustom-800">
                        {formatCOP(linea.total_linea)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end p-6">
                <div className="w-56 space-y-1 text-sm">
                  {tieneImpuestos && (
                    <>
                      <div className="flex justify-between text-neutralCustom-600">
                        <span>Subtotal</span>
                        <span>{formatCOP(documento.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-neutralCustom-600">
                        <span>Total impuestos</span>
                        <span>{formatCOP(documento.total_impuestos)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-100 pt-1.5">
                    <span>Total</span>
                    <span>{formatCOP(documento.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {editable && (
              <form
                onSubmit={handleEnviar}
                className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-4"
              >
                <h3 className="text-base font-semibold text-neutralCustom-800">Enviar a la DIAN</h3>

                {sendError && (
                  <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    {sendError}
                  </div>
                )}

                <SeccionPagoDocumentoSoporte
                  formaPago={formaPago}
                  metodoPago={metodoPago}
                  formasPago={formasPago}
                  metodosPago={metodosPago}
                  errors={errors}
                  onFormaPagoChange={(value) => {
                    setFormaPago(value);
                    setErrors((prev) => ({ ...prev, formaPago: validateFormaPago(value) }));
                  }}
                  onMetodoPagoChange={(value) => {
                    setMetodoPago(value);
                    setErrors((prev) => ({ ...prev, metodoPago: validateMetodoPago(value) }));
                  }}
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                  >
                    {isSending ? "Enviando..." : "Enviar a la DIAN"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
