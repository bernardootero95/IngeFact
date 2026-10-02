// Mismo tope y formatos que valida el backend (core/logo_empresa.py).
export const MAX_KB_LOGO = 300;
export const TIPOS_LOGO = ["image/png", "image/jpeg"];

export function validateLogoFile(file) {
  if (!file) return "Selecciona una imagen.";
  if (!TIPOS_LOGO.includes(file.type)) return "El logo debe ser una imagen PNG o JPG.";
  if (file.size > MAX_KB_LOGO * 1024) return `El logo no puede pesar más de ${MAX_KB_LOGO} KB.`;
  return "";
}
