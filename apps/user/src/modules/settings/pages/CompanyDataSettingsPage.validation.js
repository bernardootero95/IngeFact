const PHONE_REGEX = /^[0-9+()\-\s]{7,20}$/;

export function validateField(name, value) {
  const trimmed = (value || "").trim();
  if (name === "nombre_comercial" && trimmed.length > 200) {
    return "El nombre comercial no puede superar 200 caracteres.";
  }
  if (name === "telefono" && trimmed && !PHONE_REGEX.test(trimmed)) {
    return "Ingresa un teléfono válido.";
  }
  if (name === "direccion" && trimmed.length > 300) {
    return "La dirección no puede superar 300 caracteres.";
  }
  return "";
}
