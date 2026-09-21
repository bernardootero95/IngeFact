import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFacturaRecibida, registrarEventoReceptor, listPublicReferenceTable } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import { Button } from "@ingefact/ui";
import {
  TIPOS_EVENTO,
  TIPOS_QUE_REQUIEREN_GENERADOR,
  TIPO_RECLAMO,
  CLAIM_CODES,
  validateTipo,
  validateGeneradorField,
  validateClaimCode,
} from "./ReceivedInvoiceDetailPage.validation";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_BADGE = {
  ACCEPTED: "bg-brand-50 text-brand-600",
  ACCEPTED_WITH_OBSERVATIONS: "bg-fiscal-warning/10 text-amber-700",
  REJECTED: "bg-fiscal-danger/10 text-fiscal-danger",
};

const emptyGenerador = { tipo_identificacion: "", numero_identificacion: "", dv: "", nombres: "", apellidos: "", cargo: "" };

export default function ReceivedInvoiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [factura, setFactura] = useState(null);
  const [tiposIdentificacion, setTiposIdentificacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [tipo, setTipo] = useState("");
  const [generador, setGenerador] = useState(emptyGenerador);
  const [claimCode, setClaimCode] = useState("");
  const [notas, setNotas] = useState("");
  const [errors, setErrors] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [facturaData, tiposIdentificacionData] = await Promise.all([
        getFacturaRecibida(id),
        listPublicReferenceTable("tipos_identificacion"),
      ]);
      setFactura(facturaData);
      setTiposIdentificacion(tiposIdentificacionData);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleGeneradorChange = (e) => {
    const { name, value } = e.target;
    setGenerador((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [`generador_${name}`]: validateGeneradorField(name, value) }));
  };

  const resetFormularioEvento = () => {
    setTipo("");
    setGenerador(emptyGenerador);
    setClaimCode("");
    setNotas("");
    setErrors({});
  };

  const handleSubmitEvento = async (e) => {
    e.preventDefault();

    const nuevosErrores = { tipo: validateTipo(tipo) };
    if (TIPOS_QUE_REQUIEREN_GENERADOR.includes(tipo)) {
      nuevosErrores.generador_tipo_identificacion = validateGeneradorField("tipo_identificacion", generador.tipo_identificacion);
      nuevosErrores.generador_numero_identificacion = validateGeneradorField("numero_identificacion", generador.numero_identificacion);
      nuevosErrores.generador_nombres = validateGeneradorField("nombres", generador.nombres);
      nuevosErrores.generador_apellidos = validateGeneradorField("apellidos", generador.apellidos);
    }
    if (tipo === TIPO_RECLAMO) {
      nuevosErrores.claim_code = validateClaimCode(claimCode);
    }
    if (Object.values(nuevosErrores).some(Boolean)) {
      setErrors(nuevosErrores);
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    try {
      const payload = { tipo };
      if (TIPOS_QUE_REQUIEREN_GENERADOR.includes(tipo)) {
        payload.generador = {
          tipo_identificacion: generador.tipo_identificacion,
          numero_identificacion: generador.numero_identificacion.trim(),
          dv: generador.dv.trim() || null,
          nombres: generador.nombres.trim(),
          apellidos: generador.apellidos.trim(),
          cargo: generador.cargo.trim() || null,
        };
      }
      if (tipo === TIPO_RECLAMO) {
        payload.claim_code = claimCode;
        payload.notas = notas.trim() || null;
      }
      const actualizada = await registrarEventoReceptor(id, payload);
      setFactura(actualizada);
      resetFormularioEvento();
    } catch (error) {
      setRegisterError(error.message);
    } finally {
      setIsRegistering(false);
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

  if (loadError || !factura) {
    return (
      <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
            {loadError || "Factura recibida no encontrada."}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <Button
                onClick={() => navigate("/received-invoices")}
                variant="link"
              >
                Facturas recibidas
              </Button>
              <span>/</span>
              <span>Detalle</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">{factura.proveedor_nombre}</h2>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutralCustom-500">CUFE</span>
                  <p className="font-mono text-xs break-all text-neutralCustom-800">{factura.cufe}</p>
                </div>
                <div>
                  <span className="text-neutralCustom-500">Fecha</span>
                  <p className="text-neutralCustom-800">{factura.fecha}</p>
                </div>
                {factura.numero_documento_proveedor && (
                  <div>
                    <span className="text-neutralCustom-500">Número de factura del proveedor</span>
                    <p className="text-neutralCustom-800">{factura.numero_documento_proveedor}</p>
                  </div>
                )}
                {factura.monto_total != null && (
                  <div>
                    <span className="text-neutralCustom-500">Monto total</span>
                    <p className="text-neutralCustom-800">{formatCOP(factura.monto_total)}</p>
                  </div>
                )}
              </div>
              {factura.observaciones && (
                <p className="text-sm text-neutralCustom-600 border-t border-neutralCustom-100 pt-3 mt-3">
                  {factura.observaciones}
                </p>
              )}
            </div>

            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
              <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Eventos registrados</h3>
              {factura.eventos.length === 0 ? (
                <p className="text-sm text-neutralCustom-500 text-center py-6 border-2 border-dashed border-neutralCustom-200 rounded-brand-md">
                  Aún no has registrado ningún evento sobre esta factura.
                </p>
              ) : (
                <div className="space-y-3">
                  {factura.eventos.map((evento) => (
                    <div key={evento.id} className="border border-neutralCustom-100 rounded-brand-md p-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            ESTADO_BADGE[evento.legal_status] || "bg-neutralCustom-100 text-neutralCustom-600"
                          }`}
                        >
                          {evento.tipo_label}
                        </span>
                        <span className="text-xs text-neutralCustom-500">
                          {new Date(evento.creado).toLocaleString("es-CO")}
                        </span>
                      </div>
                      {evento.razon_rechazo && (
                        <p className="text-xs text-fiscal-danger mt-2">{evento.razon_rechazo}</p>
                      )}
                      {evento.notas && <p className="text-xs text-neutralCustom-600 mt-2">{evento.notas}</p>}
                      {evento.cude && (
                        <p className="text-xs text-neutralCustom-400 mt-1 font-mono break-all">CUDE: {evento.cude}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmitEvento}
              className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-4"
            >
              <h3 className="text-base font-semibold text-neutralCustom-800">Registrar nuevo evento</h3>

              {registerError && (
                <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                  {registerError}
                </div>
              )}

              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                  Tipo de evento <span className="text-fiscal-danger">*</span>
                </label>
                <select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => {
                    setTipo(e.target.value);
                    setErrors((prev) => ({ ...prev, tipo: validateTipo(e.target.value) }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none ${
                    errors.tipo ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                  }`}
                >
                  <option value="">Selecciona...</option>
                  {TIPOS_EVENTO.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.value}
                    </option>
                  ))}
                </select>
                {errors.tipo && <p className="mt-1 text-xs text-fiscal-danger">{errors.tipo}</p>}
              </div>

              {TIPOS_QUE_REQUIEREN_GENERADOR.includes(tipo) && (
                <div className="bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md p-4 space-y-3">
                  <p className="text-xs font-semibold text-neutralCustom-700">Datos de quien registra el evento</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="generador-tipo" className="block text-xs font-medium text-neutralCustom-600 mb-1">
                        Tipo de Documento <span className="text-fiscal-danger">*</span>
                      </label>
                      <select
                        id="generador-tipo"
                        name="tipo_identificacion"
                        value={generador.tipo_identificacion}
                        onChange={handleGeneradorChange}
                        className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                          errors.generador_tipo_identificacion
                            ? "border-fiscal-danger"
                            : "border-neutralCustom-200 focus:border-brand-400"
                        }`}
                      >
                        <option value="">Selecciona...</option>
                        {tiposIdentificacion.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.code} - {t.value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="generador-numero" className="block text-xs font-medium text-neutralCustom-600 mb-1">
                        Número de Documento <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="generador-numero"
                        name="numero_identificacion"
                        value={generador.numero_identificacion}
                        onChange={handleGeneradorChange}
                        className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                          errors.generador_numero_identificacion
                            ? "border-fiscal-danger"
                            : "border-neutralCustom-200 focus:border-brand-400"
                        }`}
                      />
                    </div>
                    <div>
                      <label htmlFor="generador-nombres" className="block text-xs font-medium text-neutralCustom-600 mb-1">
                        Nombres <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="generador-nombres"
                        name="nombres"
                        value={generador.nombres}
                        onChange={handleGeneradorChange}
                        className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                          errors.generador_nombres ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                        }`}
                      />
                    </div>
                    <div>
                      <label htmlFor="generador-apellidos" className="block text-xs font-medium text-neutralCustom-600 mb-1">
                        Apellidos <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="generador-apellidos"
                        name="apellidos"
                        value={generador.apellidos}
                        onChange={handleGeneradorChange}
                        className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                          errors.generador_apellidos ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                        }`}
                      />
                    </div>
                    <div>
                      <label htmlFor="generador-cargo" className="block text-xs font-medium text-neutralCustom-600 mb-1">
                        Cargo
                      </label>
                      <input
                        type="text"
                        id="generador-cargo"
                        name="cargo"
                        value={generador.cargo}
                        onChange={handleGeneradorChange}
                        placeholder="Opcional"
                        className="w-full px-3 py-2 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {tipo === TIPO_RECLAMO && (
                <div className="bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md p-4 space-y-3">
                  <div>
                    <label htmlFor="claim_code" className="block text-xs font-medium text-neutralCustom-600 mb-1">
                      Motivo del reclamo <span className="text-fiscal-danger">*</span>
                    </label>
                    <select
                      id="claim_code"
                      value={claimCode}
                      onChange={(e) => {
                        setClaimCode(e.target.value);
                        setErrors((prev) => ({ ...prev, claim_code: validateClaimCode(e.target.value) }));
                      }}
                      className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                        errors.claim_code ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                      }`}
                    >
                      <option value="">Selecciona...</option>
                      {CLAIM_CODES.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.code} - {opt.value}
                        </option>
                      ))}
                    </select>
                    {errors.claim_code && <p className="mt-1 text-xs text-fiscal-danger">{errors.claim_code}</p>}
                  </div>
                  <div>
                    <label htmlFor="notas" className="block text-xs font-medium text-neutralCustom-600 mb-1">
                      Notas
                    </label>
                    <textarea
                      id="notas"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={2}
                      placeholder="Opcional"
                      className="w-full px-3 py-2 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isRegistering}
                >
                  Registrar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
