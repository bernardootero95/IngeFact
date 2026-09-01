export function validateField(name, value) {
  if (name === "tributo" && !value) return "El tributo es obligatorio.";
  if (name === "tarifa") {
    if (value === "" || value === null) return "La tarifa es obligatoria.";
    if (isNaN(value) || Number(value) < 0 || Number(value) > 100) return "La tarifa debe estar entre 0 y 100.";
  }
  return "";
}
