import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emitirEventoMasivo, listPublicReferenceTable, validarEventoMasivo } from "@ingefact/core-api";
import { Button, FormAlert } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";
import CriteriosEventoMasivo from "../components/CriteriosEventoMasivo";
import GeneradorFields from "../components/GeneradorFields";
import ReclamoFields from "../components/ReclamoFields";
import ResultadosEventoMasivo from "../components/ResultadosEventoMasivo";
import { accionPorTipo } from "../eventos";
import { plural } from "../cargaMasiva";
import { guardarGenerador, leerGeneradorGuardado } from "../generadorGuardado";
import { TIPO_RECLAMO, validateClaimCode } from "./ReceivedInvoiceDetailPage.validation";
import {
  CRITERIOS_VACIOS,
  criteriosPayload,
  hayErrores,
  partirEnTandas,
  resultadosDeTandaFallida,
  tandaPayload,
  validarCriterios,
  validarEmision,
  validateGeneradorMasivo,
} from "../eventoMasivo";

const PASO_FORMULARIO = "formulario";
const PASO_CONFIRMAR = "confirmar";
const PASO_ENVIO = "envio";

function ResumenValidacion({ validacion }) {
  if (validacion.cantidad === 0) {
    return (
      <p role="status" className="p-3 bg-neutralCustom-50 border border-neutralCustom-100 text-sm rounded-brand-md">
        Ninguna factura cumple los criterios o todas ya tienen este evento (o uno posterior).
      </p>
    );
  }
  return (
    <div role="status" className="p-4 bg-brand-50 border border-brand-100 rounded-brand-md space-y-1">
      <p className="text-sm font-semibold text-neutralCustom-800">
        {plural(validacion.cantidad, "factura cumple", "facturas cumplen")} los criterios.
      </p>
      <p className="text-xs text-neutralCustom-600">
        Se usarán {plural(validacion.documentos_necesarios, "documento", "documentos")} de tu plan; tienes{" "}
        {validacion.documentos_disponibles} disponibles.
      </p>
    </div>
  );
}

/**
 * Aplica un mismo evento DIAN a todas las facturas recibidas que cumplan los
 * criterios. Pasos: criterios y firmante -> Validar (conteo y cupo) ->
 * confirmacion explicita -> envio por tandas -> resultado por factura.
 */
export default function ReceivedInvoicesBulkEventsPage() {
  const navigate = useNavigate();
  const [tiposIdentificacion, setTiposIdentificacion] = useState([]);
  const [criterios, setCriterios] = useState(CRITERIOS_VACIOS);
  const [generador, setGenerador] = useState(leerGeneradorGuardado);
  const [claimCode, setClaimCode] = useState("");
  const [notas, setNotas] = useState("");
  const [errors, setErrors] = useState({});
  const [validacion, setValidacion] = useState(null);
  const [validando, setValidando] = useState(false);
  const [formError, setFormError] = useState("");
  const [paso, setPaso] = useState(PASO_FORMULARIO);
  const [confirmado, setConfirmado] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [total, setTotal] = useState(0);
  const [resultados, setResultados] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listPublicReferenceTable("tipos_identificacion")
      .then(setTiposIdentificacion)
      .catch((err) => setFormError(err.message));
  }, []);

  const handleCriterio = (name, value) => {
    const siguientes = { ...criterios, [name]: value };
    setCriterios(siguientes);
    const nuevos = validarCriterios(siguientes);
    // Solo se muestra el error del campo tocado (y el de la fecha final si
    // cambia la inicial); los demas aparecen al pulsar Validar.
    setErrors((prev) => ({
      ...prev,
      [name]: nuevos[name],
      ...(name === "fecha_desde" && siguientes.fecha_hasta ? { fecha_hasta: nuevos.fecha_hasta } : {}),
    }));
    // El conteo anterior ya no corresponde a los criterios nuevos.
    setValidacion(null);
  };

  const handleGenerador = (e) => {
    const { name, value } = e.target;
    setGenerador((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [`generador_${name}`]: validateGeneradorMasivo(name, value) }));
  };

  const consultar = async () => {
    const respuesta = await validarEventoMasivo(criteriosPayload(criterios));
    setValidacion(respuesta);
    return respuesta;
  };

  const handleValidar = async () => {
    const nuevos = validarCriterios(criterios);
    setErrors((prev) => ({ ...prev, ...nuevos }));
    if (hayErrores(nuevos)) return;
    setValidando(true);
    setFormError("");
    try {
      await consultar();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setValidando(false);
    }
  };

  const handleEmitir = () => {
    const nuevos = validarEmision(criterios, generador, claimCode);
    setErrors((prev) => ({ ...prev, ...nuevos }));
    if (hayErrores(nuevos)) return;
    setConfirmado(false);
    setPaso(PASO_CONFIRMAR);
  };

  const enviar = async (facturas) => {
    setTotal(facturas.length);
    setResultados([]);
    setEnviando(true);
    setPaso(PASO_ENVIO);
    for (const tanda of partirEnTandas(facturas)) {
      let respuesta;
      try {
        respuesta = await emitirEventoMasivo(
          tandaPayload(criterios, tanda.map((f) => f.id), generador, claimCode, notas)
        );
      } catch (err) {
        respuesta = resultadosDeTandaFallida(tanda, err.message);
      }
      setResultados((previos) => [...previos, ...respuesta]);
    }
    setEnviando(false);
  };

  // Segunda verificacion: se vuelve a validar justo antes de enviar, por si
  // cambiaron las facturas o el cupo desde el conteo que vio el usuario.
  const handleConfirmar = async () => {
    setPreparando(true);
    setFormError("");
    try {
      const confirmadas = validacion.cantidad;
      const fresca = await consultar();
      const motivo =
        fresca.bloqueo ||
        (fresca.cantidad === 0 && "Ya no hay facturas a las que aplicar este evento.") ||
        (fresca.cantidad !== confirmadas &&
          `Ahora ${plural(fresca.cantidad, "factura cumple", "facturas cumplen")} los criterios. Revisa y vuelve a emitir.`);
      if (motivo) {
        setFormError(`${motivo} No se envió nada.`);
        setPaso(PASO_FORMULARIO);
        return;
      }
      guardarGenerador(generador);
      await enviar(fresca.facturas);
    } catch (err) {
      setFormError(err.message);
      setPaso(PASO_FORMULARIO);
    } finally {
      setPreparando(false);
    }
  };

  const reiniciar = () => {
    setPaso(PASO_FORMULARIO);
    setValidacion(null);
    setResultados([]);
    setFormError("");
  };

  const accion = criterios.tipo ? accionPorTipo(criterios.tipo) : null;
  const puedeEmitir = validacion && validacion.cantidad > 0 && !validacion.bloqueo;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="relative flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <Button onClick={() => navigate("/received-invoices")} variant="link" disabled={enviando}>
                Facturas recibidas
              </Button>
              <span>/</span>
              <span>Eventos en bloque</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Aplicar un evento a varias facturas</h2>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <section className="max-w-3xl mx-auto bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-6">
            {formError && <FormAlert>{formError}</FormAlert>}

            {paso === PASO_FORMULARIO && (
              <>
                <CriteriosEventoMasivo criterios={criterios} errors={errors} onChange={handleCriterio} />

                <GeneradorFields
                  generador={generador}
                  errors={errors}
                  tiposIdentificacion={tiposIdentificacion}
                  onChange={handleGenerador}
                  cargoObligatorio
                />

                {criterios.tipo === TIPO_RECLAMO && (
                  <ReclamoFields
                    claimCode={claimCode}
                    notas={notas}
                    error={errors.claim_code}
                    onClaimCodeChange={(valor) => {
                      setClaimCode(valor);
                      setErrors((prev) => ({ ...prev, claim_code: validateClaimCode(valor) }));
                    }}
                    onNotasChange={setNotas}
                  />
                )}

                {validacion && <ResumenValidacion validacion={validacion} />}
                {validacion?.bloqueo && (
                  <p role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    {validacion.bloqueo} No se enviará nada.
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button variant="secondary" onClick={handleValidar} loading={validando}>
                    Validar
                  </Button>
                  <Button
                    variant={accion?.peligro ? "danger-solid" : "primary"}
                    onClick={handleEmitir}
                    disabled={!puedeEmitir}
                    title={puedeEmitir ? "Revisar y enviar los eventos a la DIAN" : "Primero valida los criterios"}
                  >
                    Emitir
                  </Button>
                </div>
              </>
            )}

            {paso === PASO_CONFIRMAR && validacion && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-neutralCustom-800">Confirma el envío</h3>
                <p className="text-sm text-neutralCustom-600">
                  Vas a registrar <strong>{accion.titulo.toLowerCase()}</strong> ante la DIAN en{" "}
                  <strong>{plural(validacion.cantidad, "factura", "facturas")}</strong>, a nombre de {generador.nombres}{" "}
                  {generador.apellidos} ({generador.cargo}). Cada evento aceptado usa un documento de tu plan y no se
                  puede deshacer.
                </p>
                <label className="flex items-start gap-2 text-sm text-neutralCustom-800">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={confirmado}
                    onChange={(e) => setConfirmado(e.target.checked)}
                  />
                  Revisé los criterios y quiero enviar {plural(validacion.cantidad, "evento", "eventos")} a la DIAN.
                </label>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button variant="ghost" onClick={() => setPaso(PASO_FORMULARIO)} disabled={preparando}>
                    Volver
                  </Button>
                  <Button
                    variant={accion.peligro ? "danger-solid" : "primary"}
                    onClick={handleConfirmar}
                    disabled={!confirmado}
                    loading={preparando}
                  >
                    Sí, enviar {plural(validacion.cantidad, "evento", "eventos")}
                  </Button>
                </div>
              </div>
            )}

            {paso === PASO_ENVIO && (
              <>
                <ResultadosEventoMasivo total={total} resultados={resultados} enviando={enviando} />
                {enviando ? (
                  <p className="p-3 bg-amber-50 border border-fiscal-warning text-amber-800 text-sm rounded-brand-md">
                    No cierres esta página hasta que termine el envío.
                  </p>
                ) : (
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                    <Button variant="ghost" onClick={reiniciar}>
                      Aplicar otro evento
                    </Button>
                    <Button variant="primary" onClick={() => navigate("/received-invoices")}>
                      Ir a facturas recibidas
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
        <Footer />
      </main>
    </div>
  );
}
