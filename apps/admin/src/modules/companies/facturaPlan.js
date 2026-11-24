/**
 * Textos y estilos del estado de la factura automatica de un paquete vendido
 * (FacturaVentaResponse de la API: emitida | en_proceso | error | anulada | sin_factura).
 */
export const ESTADO_FACTURA = {
  emitida: { label: "Emitida", clase: "bg-brand-50 text-brand-700" },
  en_proceso: { label: "En proceso DIAN", clase: "bg-fiscal-info/10 text-fiscal-info" },
  error: { label: "No emitida", clase: "bg-fiscal-danger/10 text-fiscal-danger" },
  anulada: { label: "Anulada", clase: "bg-neutralCustom-100 text-neutralCustom-600" },
  sin_factura: { label: "Sin factura", clase: "bg-neutralCustom-100 text-neutralCustom-600" },
};

/** Toast para mostrar tras guardar el plan. `factura` es null si no hubo venta. */
export function mensajeFacturaPlan(factura, base) {
  if (!factura) return { message: base, type: "success" };
  if (factura.estado === "emitida") {
    return { message: `${base} Factura ${factura.numero} emitida y enviada al correo de la empresa.`, type: "success" };
  }
  if (factura.estado === "en_proceso") {
    return { message: `${base} La factura ${factura.numero} está en validación de la DIAN.`, type: "success" };
  }
  if (factura.estado === "error") {
    return {
      message: `${base} La factura del paquete no se emitió: ${factura.error} Puedes reintentarla desde la empresa.`,
      type: "warning",
    };
  }
  return { message: base, type: "success" };
}
