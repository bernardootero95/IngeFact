import { isValidEmail } from "@ingefact/utils";

export function validateCorreoDestino(value) {
  const correo = String(value || "").trim();
  if (!correo) return "Escribe el correo al que quieres enviarlo.";
  if (!isValidEmail(correo)) return "Correo inválido.";
  return "";
}
