/**
 * Piezas para que los errores de formulario sean accesibles (WCAG 1.3.1,
 * 3.3.1 y 4.1.3): el campo con error queda marcado con aria-invalid y
 * vinculado a su mensaje con aria-describedby, y los errores generales se
 * anuncian a los lectores de pantalla.
 *
 * Uso:
 *   <input id="email" {...fieldA11y("email", errors.email)} />
 *   <FieldError fieldId="email">{errors.email}</FieldError>
 */

export const fieldErrorId = (fieldId) => `${fieldId}-error`;

/** Atributos ARIA para un input/select/textarea segun tenga o no error. */
export function fieldA11y(fieldId, error) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? fieldErrorId(fieldId) : undefined,
  };
}

/** Mensaje de error debajo de un campo. No renderiza nada si no hay error. */
export function FieldError({ fieldId, children, className = "" }) {
  if (!children) return null;
  return (
    <p id={fieldErrorId(fieldId)} className={`mt-1 text-sm text-fiscal-danger ${className}`}>
      {children}
    </p>
  );
}

/**
 * Error general de un formulario o de una carga (p. ej. la respuesta del
 * servidor al guardar). role="alert" hace que se anuncie apenas aparece.
 */
export function FormAlert({ children, className = "" }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={`p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md ${className}`}
    >
      {children}
    </div>
  );
}

/** Mensaje de exito o informativo que se anuncia sin interrumpir. */
export function FormSuccess({ children, className = "" }) {
  if (!children) return null;
  return (
    <div role="status" className={`p-4 bg-brand-50 border border-brand-400 text-brand-700 text-sm rounded-brand-md ${className}`}>
      {children}
    </div>
  );
}
