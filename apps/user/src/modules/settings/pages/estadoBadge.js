/** Badge de la tarjeta "Resolución Activa" segun estado_validacion. */
export function estadoBadge(estadoValidacion) {
  if (estadoValidacion === "validada") {
    return { label: "✓ Validada ante la DIAN", className: "bg-white/20" };
  }
  if (estadoValidacion === "error") {
    return { label: "⚠ Error de validación", className: "bg-fiscal-danger/30" };
  }
  return { label: "Pendiente de validar", className: "bg-white/20" };
}
