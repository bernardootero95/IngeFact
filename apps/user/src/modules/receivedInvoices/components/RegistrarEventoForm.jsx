import { useState } from "react";
import { Button, FieldError } from "@ingefact/ui";
import GeneradorFields from "./GeneradorFields";
import ReclamoFields from "./ReclamoFields";
import { accionPorTipo } from "../eventos";
import { guardarGenerador, leerGeneradorGuardado } from "../generadorGuardado";
import {
  TIPOS_QUE_REQUIEREN_GENERADOR,
  TIPO_RECLAMO,
  validateTipo,
  validateGeneradorField,
  validateClaimCode,
} from "../pages/ReceivedInvoiceDetailPage.validation";

const CAMPOS_GENERADOR_OBLIGATORIOS = ["tipo_identificacion", "numero_identificacion", "nombres", "apellidos"];

function construirPayload(tipo, generador, claimCode, notas) {
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
  return payload;
}

/**
 * Registra el siguiente evento RADIAN de la factura. Solo ofrece los tipos
 * que el backend permite en el estado actual (`eventosPermitidos`), asi que
 * no se puede, p. ej., aceptar sin haber confirmado antes la mercancia.
 */
export default function RegistrarEventoForm({ eventosPermitidos, tipoInicial, tiposIdentificacion, onRegistrar }) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [generador, setGenerador] = useState(leerGeneradorGuardado);
  const [claimCode, setClaimCode] = useState("");
  const [notas, setNotas] = useState("");
  const [errors, setErrors] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState(null);

  const requiereGenerador = TIPOS_QUE_REQUIEREN_GENERADOR.includes(tipo);

  const handleGeneradorChange = (e) => {
    const { name, value } = e.target;
    setGenerador((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [`generador_${name}`]: validateGeneradorField(name, value) }));
  };

  const validar = () => {
    const nuevosErrores = { tipo: validateTipo(tipo) };
    if (requiereGenerador) {
      CAMPOS_GENERADOR_OBLIGATORIOS.forEach((campo) => {
        nuevosErrores[`generador_${campo}`] = validateGeneradorField(campo, generador[campo]);
      });
    }
    if (tipo === TIPO_RECLAMO) nuevosErrores.claim_code = validateClaimCode(claimCode);
    setErrors(nuevosErrores);
    return !Object.values(nuevosErrores).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setIsRegistering(true);
    setRegisterError(null);
    try {
      await onRegistrar(construirPayload(tipo, generador, claimCode, notas));
      if (requiereGenerador) guardarGenerador(generador);
    } catch (error) {
      setRegisterError(error.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const accion = accionPorTipo(tipo);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-4"
    >
      <h3 className="text-base font-semibold text-neutralCustom-800">Registrar evento</h3>

      {registerError && (
        <div role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
          {registerError}
        </div>
      )}

      <div role="radiogroup" aria-label="Evento a registrar" className="flex flex-wrap gap-2">
        {eventosPermitidos.map((codigo) => {
          const opcion = accionPorTipo(codigo);
          const seleccionado = tipo === codigo;
          return (
            <Button
              key={codigo}
              role="radio"
              aria-checked={seleccionado}
              aria-label={opcion.label}
              variant={seleccionado ? (opcion.peligro ? "danger-solid" : "primary") : "secondary"}
              onClick={() => {
                setTipo(codigo);
                setErrors((prev) => ({ ...prev, tipo: "" }));
              }}
            >
              {opcion.label}
            </Button>
          );
        })}
      </div>
      {errors.tipo && <FieldError fieldId="tipo">{errors.tipo}</FieldError>}
      {accion && <p className="text-xs text-neutralCustom-500">{accion.titulo}</p>}

      {requiereGenerador && (
        <GeneradorFields
          generador={generador}
          errors={errors}
          tiposIdentificacion={tiposIdentificacion}
          onChange={handleGeneradorChange}
        />
      )}

      {tipo === TIPO_RECLAMO && (
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

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant={accion?.peligro ? "danger-solid" : "primary"}
          loading={isRegistering}
          disabled={!tipo}
          title="Enviar el evento a la DIAN"
        >
          Enviar a la DIAN
        </Button>
      </div>
    </form>
  );
}
