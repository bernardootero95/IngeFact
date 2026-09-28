/** Resultado del ultimo "Validar" de una resolucion (facturacion o documento soporte). */
export default function ResolutionValidationMessage({ resolucion }) {
  if (resolucion?.estado_validacion === "error" && resolucion.mensaje_validacion) {
    return (
      <div role="alert" className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
        {resolucion.mensaje_validacion}
      </div>
    );
  }
  if (resolucion?.estado_validacion === "validada") {
    return (
      <div className="mb-4 p-3 bg-brand-50 border border-brand-400 text-brand-700 text-sm rounded-brand-md">
        Resolución validada: coincide con la registrada ante la DIAN.
      </div>
    );
  }
  return null;
}
