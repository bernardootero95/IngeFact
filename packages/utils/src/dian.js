/**
 * Calcula el Digito de Verificacion (DV) para un NIT colombiano usando el
 * algoritmo oficial de la DIAN (modulo 11 con pesos primos). El mismo
 * algoritmo vive en el backend (apps/api/src/core/nit.py::nit_check_digit) --
 * mantenerlos en sincronia si alguno cambia.
 *
 * @param {string} nit
 * @returns {string} El digito de verificacion calculado, o "" si nit esta vacio.
 */
export function calculateNitDV(nit) {
  const cleanNit = (nit || "").replace(/\D/g, "");
  if (!cleanNit) return "";

  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;

  for (let i = 0; i < cleanNit.length; i++) {
    sum += parseInt(cleanNit.charAt(cleanNit.length - 1 - i), 10) * primes[i];
  }

  const mod = sum % 11;
  return mod > 1 ? (11 - mod).toString() : mod.toString();
}
