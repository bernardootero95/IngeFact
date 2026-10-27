import { Button, FieldError, fieldA11y } from "@ingefact/ui";
import { accionPorTipo } from "../eventos";
import { TIPOS_EVENTO_MASIVO } from "../eventoMasivo";

function Etiqueta({ htmlFor, children, obligatorio = true }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-neutralCustom-600 mb-1">
      {children}
      {obligatorio && (
        <>
          <span className="text-fiscal-danger" aria-hidden="true"> *</span>
          <span className="sr-only"> (obligatorio)</span>
        </>
      )}
    </label>
  );
}

/** Que facturas entran en el bloque y que evento se les aplica. */
export default function CriteriosEventoMasivo({ criterios, errors, onChange, disabled }) {
  const campoFecha = (name, label) => (
    <div>
      <Etiqueta htmlFor={name}>{label}</Etiqueta>
      <input
        type="date"
        id={name}
        name={name}
        value={criterios[name]}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
        className={`field w-full ${errors[name] ? "border-fiscal-danger field-invalid" : ""}`}
        {...fieldA11y(name, errors[name])}
      />
      <FieldError fieldId={name}>{errors[name]}</FieldError>
    </div>
  );

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-semibold text-neutralCustom-800 mb-1">Facturas y evento</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {campoFecha("fecha_desde", "Emitidas desde")}
        {campoFecha("fecha_hasta", "Emitidas hasta")}
        <div className="sm:col-span-2">
          <Etiqueta htmlFor="proveedor_nit" obligatorio={false}>
            NIT del proveedor
          </Etiqueta>
          <input
            type="text"
            inputMode="numeric"
            id="proveedor_nit"
            name="proveedor_nit"
            value={criterios.proveedor_nit}
            onChange={(e) => onChange("proveedor_nit", e.target.value)}
            placeholder="Opcional: vacío incluye todos los proveedores"
            className={`field w-full ${errors.proveedor_nit ? "border-fiscal-danger field-invalid" : ""}`}
            {...fieldA11y("proveedor_nit", errors.proveedor_nit)}
          />
          <FieldError fieldId="proveedor_nit">{errors.proveedor_nit}</FieldError>
        </div>
      </div>

      <div>
        <p id="tipo-label" className="block text-xs font-medium text-neutralCustom-600 mb-1">
          Evento a aplicar<span className="text-fiscal-danger" aria-hidden="true"> *</span>
        </p>
        <div role="radiogroup" aria-labelledby="tipo-label" className="flex flex-wrap gap-2">
          {TIPOS_EVENTO_MASIVO.map((codigo) => {
            const opcion = accionPorTipo(codigo);
            const seleccionado = criterios.tipo === codigo;
            return (
              <Button
                key={codigo}
                role="radio"
                aria-checked={seleccionado}
                aria-label={opcion.label}
                variant={seleccionado ? (opcion.peligro ? "danger-solid" : "primary") : "secondary"}
                onClick={() => onChange("tipo", codigo)}
                disabled={disabled}
              >
                {opcion.label}
              </Button>
            );
          })}
        </div>
        <FieldError fieldId="tipo">{errors.tipo}</FieldError>
        {criterios.tipo && (
          <p className="mt-1 text-xs text-neutralCustom-500">
            {accionPorTipo(criterios.tipo).titulo}. Solo se cuentan las facturas a las que este evento todavía se les
            puede aplicar según los eventos que ya tienen.
          </p>
        )}
      </div>
    </fieldset>
  );
}
