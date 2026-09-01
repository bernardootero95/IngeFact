import { isValidEmail } from "@ingefact/utils";

export function validateField(name, value) {
  if (name === "tipo_identificacion" && !value) return "El tipo de documento es obligatorio.";
  if (name === "numero_identificacion" && !value.trim()) return "La identificación es obligatoria.";
  if (name === "nombre" && !value.trim()) return "La Razón Social / Nombre es obligatorio.";
  if (name === "correo_electronico") {
    if (!value.trim()) return "El correo es obligatorio.";
    if (!isValidEmail(value)) return "Correo inválido.";
  }
  if (name === "regimen_fiscal" && !value) return "El régimen fiscal es obligatorio.";
  return "";
}
