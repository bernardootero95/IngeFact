// Acciones de evento en el orden RADIAN. El backend decide cuales estan
// habilitadas (`eventos_permitidos`); aqui solo vive la presentacion.
export const ACCIONES_EVENTO = [
  { tipo: "030", label: "Acuse de recibo", corto: "Acusar recibo", titulo: "Acuse de recibo de la factura" },
  { tipo: "032", label: "Recibo de mercancía", corto: "Recibir mercancía", titulo: "Recibo de la mercancía o servicio" },
  { tipo: "033", label: "Aceptar factura", corto: "Aceptar", titulo: "Aceptación expresa de la factura" },
  { tipo: "031", label: "Rechazar factura", corto: "Rechazar", titulo: "Reclamo (rechazo) de la factura", peligro: true },
];

export const ESTADO_BADGE = {
  sin_evento: "bg-neutralCustom-100 text-neutralCustom-600",
  factura_recibida: "bg-sky-50 text-sky-700",
  mercancia_recibida: "bg-fiscal-warning/10 text-amber-700",
  aceptada: "bg-brand-50 text-brand-600",
  rechazada: "bg-fiscal-danger/10 text-fiscal-danger",
};

export const LEGAL_STATUS_BADGE = {
  ACCEPTED: "bg-brand-50 text-brand-600",
  ACCEPTED_WITH_OBSERVATIONS: "bg-fiscal-warning/10 text-amber-700",
  REJECTED: "bg-fiscal-danger/10 text-fiscal-danger",
};

export function accionPorTipo(tipo) {
  return ACCIONES_EVENTO.find((a) => a.tipo === tipo) || null;
}

// Solo devuelve el tipo pedido por URL si el backend lo permite ahora mismo.
export function tipoInicial(tipoSolicitado, eventosPermitidos) {
  if (tipoSolicitado && eventosPermitidos.includes(tipoSolicitado)) return tipoSolicitado;
  return eventosPermitidos.length === 1 ? eventosPermitidos[0] : "";
}

export const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
