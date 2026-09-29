import { FieldError, fieldA11y } from "@ingefact/ui";

const CAMPOS_TEXTO = [
  { name: "numero_identificacion", label: "Número de documento", obligatorio: true },
  { name: "nombres", label: "Nombres", obligatorio: true },
  { name: "apellidos", label: "Apellidos", obligatorio: true },
  { name: "cargo", label: "Cargo", obligatorio: false },
];

function Obligatorio() {
  return (
    <>
      <span className="text-fiscal-danger" aria-hidden="true"> *</span>
      <span className="sr-only"> (obligatorio)</span>
    </>
  );
}

// Datos de la persona que firma el evento (issuerParty): la DIAN los exige
// para el acuse de recibo (030) y el recibo de la mercancía (032).
export default function GeneradorFields({ generador, errors, tiposIdentificacion, onChange }) {
  const idError = (name) => errors[`generador_${name}`];

  return (
    <fieldset className="bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md p-4 space-y-3">
      <legend className="text-xs font-semibold text-neutralCustom-700 px-1">Datos de quien registra el evento</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="generador-tipo_identificacion" className="block text-xs font-medium text-neutralCustom-600 mb-1">
            Tipo de documento
            <Obligatorio />
          </label>
          <select
            id="generador-tipo_identificacion"
            name="tipo_identificacion"
            value={generador.tipo_identificacion}
            onChange={onChange}
            className={`field w-full ${idError("tipo_identificacion") ? "border-fiscal-danger field-invalid" : ""}`}
            {...fieldA11y("generador-tipo_identificacion", idError("tipo_identificacion"))}
          >
            <option value="">Selecciona...</option>
            {tiposIdentificacion.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} - {t.value}
              </option>
            ))}
          </select>
          <FieldError fieldId="generador-tipo_identificacion">{idError("tipo_identificacion")}</FieldError>
        </div>
        {CAMPOS_TEXTO.map((campo) => (
          <div key={campo.name}>
            <label htmlFor={`generador-${campo.name}`} className="block text-xs font-medium text-neutralCustom-600 mb-1">
              {campo.label}
              {campo.obligatorio && <Obligatorio />}
            </label>
            <input
              type="text"
              id={`generador-${campo.name}`}
              name={campo.name}
              value={generador[campo.name]}
              onChange={onChange}
              placeholder={campo.obligatorio ? undefined : "Opcional"}
              className={`field w-full ${idError(campo.name) ? "border-fiscal-danger field-invalid" : ""}`}
              {...fieldA11y(`generador-${campo.name}`, idError(campo.name))}
            />
            <FieldError fieldId={`generador-${campo.name}`}>{idError(campo.name)}</FieldError>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
