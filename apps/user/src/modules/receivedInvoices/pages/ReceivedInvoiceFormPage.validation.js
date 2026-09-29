export const CUFE_MAX_LENGTH = 200;

export function validateCufe(cufe) {
  const valor = cufe?.trim() || "";
  if (!valor) return "El CUFE es obligatorio.";
  if (valor.length > CUFE_MAX_LENGTH) return `El CUFE no puede tener más de ${CUFE_MAX_LENGTH} caracteres.`;
  if (/\s/.test(valor)) return "El CUFE no debe tener espacios.";
  return "";
}
