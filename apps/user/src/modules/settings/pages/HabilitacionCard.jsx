import { useState } from "react";
import { enviarSetPruebas } from "@ingefact/core-api";
import { Button, FieldError, fieldA11y } from "@ingefact/ui";
import { validateTestSetId } from "./HabilitacionCard.validation";
import { TIPOS_HABILITACION } from "./habilitacionTipos";

const ESTADOS = {
  habilitada: { label: "Habilitada", classes: "bg-brand-50 text-brand-600" },
  en_proceso: { label: "En proceso", classes: "bg-fiscal-warning/15 text-amber-700" },
  no_habilitada: { label: "Sin habilitar", classes: "bg-neutralCustom-100 text-neutralCustom-600" },
};

const SETS_RECHAZADOS = ["REJECTED", "FAILED"];

export default function HabilitacionCard({ habilitacion, onActualizada, onConsultar, consultando }) {
  const tipo = TIPOS_HABILITACION[habilitacion.tipo];
  const estado = ESTADOS[habilitacion.estado] ?? ESTADOS.no_habilitada;
  const inputId = `test_set_id_${habilitacion.tipo}`;

  const [testSetId, setTestSetId] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [envioError, setEnvioError] = useState(null);

  const rechazado =
    habilitacion.estado !== "habilitada" && SETS_RECHAZADOS.includes(habilitacion.estado_set_pruebas);

  const handleChange = (e) => {
    setTestSetId(e.target.value);
    setError(validateTestSetId(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validacion = validateTestSetId(testSetId);
    if (validacion) {
      setError(validacion);
      return;
    }
    setEnviando(true);
    setEnvioError(null);
    try {
      const actualizada = await enviarSetPruebas(habilitacion.tipo, testSetId.trim());
      setTestSetId("");
      onActualizada(actualizada);
    } catch (err) {
      setEnvioError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section
      aria-labelledby={`titulo_${habilitacion.tipo}`}
      className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`titulo_${habilitacion.tipo}`} className="text-base font-semibold text-neutralCustom-800">
            {tipo.titulo}
          </h3>
          <p className="text-xs text-neutralCustom-500 mt-0.5">{tipo.descripcion}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estado.classes}`}>{estado.label}</span>
      </div>

      {habilitacion.estado === "habilitada" && (
        <div className="mt-4 text-sm text-neutralCustom-600 space-y-2">
          <p>Tu empresa está habilitada ante la DIAN para {tipo.titulo.toLowerCase()}.</p>
          {tipo.despues && <p>{tipo.despues}</p>}
        </div>
      )}

      {habilitacion.estado === "en_proceso" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutralCustom-600">
            La DIAN está procesando tu set de pruebas. Suele tardar unos minutos.
          </p>
          <Button size="sm" onClick={onConsultar} loading={consultando}>
            Consultar estado
          </Button>
        </div>
      )}

      {habilitacion.estado === "no_habilitada" && (
        <>
          {rechazado && (
            <div role="alert" className="mt-4 p-3 bg-red-50 border border-fiscal-danger rounded-brand-md">
              <p className="text-sm font-medium text-fiscal-danger">
                La DIAN no aceptó el set de pruebas enviado. Revisa el TestSetId y vuelve a intentarlo.
              </p>
              {habilitacion.errores_set_pruebas.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-fiscal-danger space-y-1">
                  {habilitacion.errores_set_pruebas.map((mensaje) => (
                    <li key={mensaje}>{mensaje}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ol className="mt-4 list-decimal pl-5 space-y-2 text-sm text-neutralCustom-600">
            {tipo.pasos.map((paso, i) => (
              <li key={i}>{paso}</li>
            ))}
          </ol>

          <form onSubmit={handleSubmit} className="mt-5" noValidate>
            {envioError && (
              <div role="alert" className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {envioError}
              </div>
            )}
            <label htmlFor={inputId} className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
              TestSetId
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  id={inputId}
                  name="test_set_id"
                  value={testSetId}
                  onChange={handleChange}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`field w-full font-mono ${
                    error ? "border-fiscal-danger field-invalid focus:border-fiscal-danger" : "focus:ring-2 focus:ring-brand-50"
                  }`}
                  {...fieldA11y(inputId, error)}
                />
                {error && <FieldError fieldId={inputId}>{error}</FieldError>}
              </div>
              <Button type="submit" variant="primary" loading={enviando} disabled={enviando || Boolean(error)}>
                Enviar set
              </Button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
