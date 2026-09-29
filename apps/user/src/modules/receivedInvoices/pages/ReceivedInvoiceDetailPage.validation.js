export const TIPOS_QUE_REQUIEREN_GENERADOR = ["030", "032"];
export const TIPO_RECLAMO = "031";

export const CLAIM_CODES = [
  { code: "01", value: "Documento con inconsistencias" },
  { code: "02", value: "Mercancía no entregada" },
  { code: "03", value: "Mercancía entregada parcialmente" },
  { code: "04", value: "Servicio no prestado" },
];

export function validateTipo(tipo) {
  if (!tipo) return "Selecciona un tipo de evento.";
  return "";
}

export function validateGeneradorField(name, value) {
  if ((name === "tipo_identificacion" || name === "numero_identificacion" || name === "nombres" || name === "apellidos") && !value?.trim()) {
    return "Este campo es obligatorio.";
  }
  return "";
}

export function validateClaimCode(claimCode) {
  if (!claimCode) return "Selecciona el motivo del reclamo.";
  return "";
}
