import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getNomina,
  getEmpleado,
  eliminarBorradorNomina,
  enviarNomina,
  anularNomina,
  enviarNominaPorCorreo,
  obtenerUrlXmlNomina,
  obtenerRepresentacionPdfNomina,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import { ToastAlert, Button, FormSkeleton, ConfirmPopover } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import EnviarCorreoPopover from "../../../components/EnviarCorreoPopover";
import { abrirRepresentacion } from "../../../utils/representacionPdf";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const nombreCatalogo = (catalogo, code) => catalogo.find((item) => item.code === code)?.value || code;

const ESTADO_INFO = {
  borrador: { label: "Borrador", classes: "bg-neutralCustom-100 text-neutralCustom-600" },
  enviada: { label: "Enviada a la DIAN", classes: "bg-fiscal-info/10 text-fiscal-info" },
  aceptada: { label: "Aceptada por la DIAN", classes: "bg-brand-50 text-brand-600" },
  rechazada: { label: "Rechazada por la DIAN", classes: "bg-fiscal-danger/10 text-fiscal-danger" },
  anulada: { label: "Anulada", classes: "bg-fiscal-danger/10 text-fiscal-danger" },
};

// Misma tabla de etiquetas que core/nomina_pdf.py::_ETIQUETAS -- mantener en
// sincronia si se agrega un bloque nuevo de Devengados/Deducciones.
const ETIQUETAS = {
  Basico: "Sueldo Básico",
  Transporte: "Auxilio de Transporte",
  HEDs: "Horas Extra Diurnas",
  HENs: "Horas Extra Nocturnas",
  HRNs: "Horas Recargo Nocturno",
  HEDDFs: "Horas Extra Diurnas Dom./Fest.",
  HRDDFs: "Horas Recargo Diurno Dom./Fest.",
  HENDFs: "Horas Extra Nocturnas Dom./Fest.",
  HRNDFs: "Horas Recargo Nocturno Dom./Fest.",
  Vacaciones: "Vacaciones",
  Primas: "Prima",
  Cesantias: "Cesantías",
  Incapacidades: "Incapacidades",
  Dotacion: "Dotación",
  ApoyoSost: "Apoyo de Sostenimiento",
  Teletrabajo: "Teletrabajo",
  BonifRetiro: "Bonificación de Retiro",
  Indemnizacion: "Indemnización",
  Reintegro: "Reintegro",
  Salud: "Salud",
  FondoPension: "Fondo de Pensión",
  FondoSP: "Fondo de Solidaridad Pensional",
  PensionVoluntaria: "Pensión Voluntaria",
  RetencionFuente: "Retención en la Fuente",
  AFC: "AFC",
  Cooperativa: "Cooperativa",
  EmbargoFiscal: "Embargo Fiscal",
  PlanComplementarios: "Plan Complementario de Salud",
  Educacion: "Educación",
  Deuda: "Deuda",
};

const CAMPOS_MONTO = [
  "Pago",
  "Deduccion",
  "DeduccionSP",
  "SueldoTrabajado",
  "PagoIntereses",
  "AuxilioTransporte",
];

function extraerMonto(valor) {
  if (typeof valor === "number") return valor;
  if (Array.isArray(valor)) return valor.reduce((total, item) => total + extraerMonto(item), 0);
  if (valor && typeof valor === "object") {
    const totalCampos = CAMPOS_MONTO.reduce((total, campo) => total + (typeof valor[campo] === "number" ? valor[campo] : 0), 0);
    if (totalCampos) return totalCampos;
    return Object.values(valor).reduce((total, v) => total + (typeof v === "number" ? v : 0), 0);
  }
  return 0;
}

function ConceptosBloque({ titulo, bloque, total }) {
  const filas = Object.entries(bloque || {})
    .map(([clave, valor]) => ({ clave, etiqueta: ETIQUETAS[clave] || clave, monto: extraerMonto(valor) }))
    .filter((f) => f.monto);

  return (
    <div>
      <h4 className="text-sm font-semibold text-neutralCustom-800 mb-2">{titulo}</h4>
      <div className="space-y-1 text-sm">
        {filas.map((f) => (
          <div key={f.clave} className="flex justify-between text-neutralCustom-600">
            <span>{f.etiqueta}</span>
            <span>{formatCOP(f.monto)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold text-neutralCustom-800 border-t border-neutralCustom-100 pt-1 mt-1">
          <span>Total {titulo}</span>
          <span>{formatCOP(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PayrollDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [nomina, setNomina] = useState(null);
  const [empleadoCorreo, setEmpleadoCorreo] = useState("");
  const [periodos, setPeriodos] = useState([]);
  const [formasPago, setFormasPago] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAnulando, setIsAnulando] = useState(false);
  const [isDownloadingXml, setIsDownloadingXml] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nominaData, periodosData, formasPagoData, metodosPagoData] = await Promise.all([
        getNomina(id),
        listPublicReferenceTable("periodos_nomina"),
        listPublicReferenceTable("formas_pago"),
        listPublicReferenceTable("metodos_pago"),
      ]);
      setNomina(nominaData);
      setPeriodos(periodosData);
      setFormasPago(formasPagoData);
      setMetodosPago(metodosPagoData);
      getEmpleado(nominaData.empleado_id)
        .then((empleado) => setEmpleadoCorreo(empleado.correo_electronico || ""))
        .catch(() => setEmpleadoCorreo(""));
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
    setIsDeleting(true);
    try {
      await eliminarBorradorNomina(id);
      navigate("/payroll");
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEnviar = async () => {
    setIsSending(true);
    try {
      const actualizada = await enviarNomina(id);
      setNomina(actualizada);
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleAnular = async () => {
    setIsAnulando(true);
    try {
      const actualizada = await anularNomina(id);
      setNomina(actualizada);
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsAnulando(false);
    }
  };

  const handleDescargarXml = async () => {
    setIsDownloadingXml(true);
    try {
      const { url } = await obtenerUrlXmlNomina(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsDownloadingXml(false);
    }
  };

  const handleVerRepresentacion = async () => {
    setIsLoadingPdf(true);
    await abrirRepresentacion({
      tieneDocumentoValido: nomina.estado === "aceptada" || nomina.estado === "anulada",
      obtenerPdf: () => obtenerRepresentacionPdfNomina(id),
      navigate,
      rutaPreview: `/payroll/${id}`,
      onError: (message) => setToast({ message, type: "error" }),
    });
    setIsLoadingPdf(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-8">
          <FormSkeleton label="Cargando..." />
        </main>
      </div>
    );
  }

  if (loadError || !nomina) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
            {loadError || "Comprobante de Nómina no encontrado."}
          </div>
        </main>
      </div>
    );
  }

  const editable = nomina.estado === "borrador" || nomina.estado === "rechazada";
  const tieneDocumento = nomina.estado === "aceptada" || nomina.estado === "anulada";
  const estadoInfo = ESTADO_INFO[nomina.estado] || ESTADO_INFO.borrador;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <Button onClick={() => navigate("/payroll")} variant="link">
                Nómina
              </Button>
              <span>/</span>
              <span>{nomina.numero_completo || "Borrador"}</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">{nomina.empleado_nombre}</h2>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${estadoInfo.classes}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                  {estadoInfo.label}
                </span>
                <div className="flex flex-wrap justify-end gap-3">
                  {editable && (
                    <>
                      <Button onClick={() => navigate(`/payroll/${id}/edit`)} title="Continuar editando">
                        {nomina.estado === "rechazada" ? "Corregir" : "Editar"}
                      </Button>
                      <ConfirmPopover message="¿Eliminar este comprobante de nómina?" confirmLabel="Eliminar" onConfirm={handleEliminar}>
                        {({ ask }) => (
                          <Button onClick={ask} variant="danger" loading={isDeleting}>
                            Eliminar
                          </Button>
                        )}
                      </ConfirmPopover>
                      <Button onClick={handleEnviar} variant="primary" loading={isSending}>
                        Enviar a DIAN
                      </Button>
                    </>
                  )}
                  {tieneDocumento && (
                    <>
                      <Button
                        onClick={handleVerRepresentacion}
                        loading={isLoadingPdf}
                        title="Ver representación gráfica"
                      >
                        Ver PDF
                      </Button>
                      <Button onClick={handleDescargarXml} loading={isDownloadingXml}>
                        Descargar XML
                      </Button>
                    </>
                  )}
                  {nomina.estado === "aceptada" && (
                    <>
                      <EnviarCorreoPopover
                        variant="button"
                        label="Enviar correo"
                        defaultEmail={empleadoCorreo}
                        onEnviar={(correo) => enviarNominaPorCorreo(id, correo)}
                        onEnviado={(correo) => setToast({ message: `Nómina enviada a ${correo}.`, type: "success" })}
                      />
                      <ConfirmPopover
                        message="¿Anular este comprobante de nómina? Se enviará una anulación a la DIAN."
                        confirmLabel="Anular"
                        onConfirm={handleAnular}
                      >
                        {({ ask }) => (
                          <Button onClick={ask} variant="danger" loading={isAnulando} title="Anular comprobante">
                            Anular
                          </Button>
                        )}
                      </ConfirmPopover>
                    </>
                  )}
                </div>
              </div>

              {nomina.cune && (
                <div className="bg-neutralCustom-50 rounded-brand-md p-3 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-neutralCustom-500">CUNE</p>
                    <p className="text-xs font-mono text-neutralCustom-700 break-all">{nomina.cune}</p>
                  </div>
                  <Button onClick={() => navigator.clipboard?.writeText(nomina.cune)} variant="link" className="shrink-0 ml-4 text-xs">
                    Copiar
                  </Button>
                </div>
              )}

              {nomina.estado === "rechazada" && nomina.razon_rechazo && (
                <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md mb-2">
                  <p className="font-medium">{nomina.razon_rechazo}</p>
                </div>
              )}

              {nomina.notificaciones_dian && nomina.notificaciones_dian.length > 0 && (
                <div
                  className={`p-3 border text-sm rounded-brand-md mb-2 ${
                    nomina.estado === "rechazada"
                      ? "bg-red-50 border-fiscal-danger text-fiscal-danger"
                      : "bg-amber-50 border-amber-300 text-amber-700"
                  }`}
                >
                  <p className="font-medium mb-1">Detalle de la DIAN</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {nomina.notificaciones_dian.map((item, index) => (
                      <li key={index}>{typeof item === "string" ? item : item.message || JSON.stringify(item)}</li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="text-sm space-y-2 mt-2">
                <div className="flex justify-between">
                  <dt className="text-neutralCustom-500">Período</dt>
                  <dd className="font-medium text-neutralCustom-800">
                    {nombreCatalogo(periodos, nomina.periodo_nomina)} ({nomina.fecha_liquidacion_inicio} a {nomina.fecha_liquidacion_fin})
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutralCustom-500">Fecha de Pago</dt>
                  <dd className="font-medium text-neutralCustom-800">{nomina.fecha_pago?.join(", ")}</dd>
                </div>
                {nomina.forma_pago && (
                  <div className="flex justify-between">
                    <dt className="text-neutralCustom-500">Forma de pago</dt>
                    <dd className="font-medium text-neutralCustom-800">{nombreCatalogo(formasPago, nomina.forma_pago)}</dd>
                  </div>
                )}
                {nomina.metodo_pago && (
                  <div className="flex justify-between">
                    <dt className="text-neutralCustom-500">Método de pago</dt>
                    <dd className="font-medium text-neutralCustom-800">{nombreCatalogo(metodosPago, nomina.metodo_pago)}</dd>
                  </div>
                )}
                {nomina.banco && (
                  <div className="flex justify-between">
                    <dt className="text-neutralCustom-500">Banco</dt>
                    <dd className="font-medium text-neutralCustom-800">
                      {nomina.banco} {nomina.tipo_cuenta} {nomina.numero_cuenta}
                    </dd>
                  </div>
                )}
                {nomina.notas && (
                  <div className="flex justify-between">
                    <dt className="text-neutralCustom-500">Notas</dt>
                    <dd className="font-medium text-neutralCustom-800">{nomina.notas}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConceptosBloque titulo="Devengados" bloque={nomina.devengados} total={nomina.devengados_total} />
              <ConceptosBloque titulo="Deducciones" bloque={nomina.deducciones} total={nomina.deducciones_total} />
            </div>

            <div className="bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-lg p-6 flex justify-between items-center">
              <p className="text-base font-bold text-neutralCustom-800">Neto a Pagar</p>
              <p className="text-xl font-bold text-brand-600">{formatCOP(nomina.comprobante_total)}</p>
            </div>
          </div>
        </div>
      </main>

      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
