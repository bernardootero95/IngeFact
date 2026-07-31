/**
 * Calcula el Dígito de Verificación (DV) para un NIT colombiano
 * usando el algoritmo oficial de la DIAN (módulo 11 y números primos).
 *
 * @param {string} nit - El número de identificación tributaria
 * @returns {string} El dígito de verificación calculado
 */
export const calculateColombianNITDV = (nit) => {
  const cleanNit = nit.replace(/\D/g, "");
  if (!cleanNit) return "";

  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;

  for (let i = 0; i < cleanNit.length; i++) {
    sum += parseInt(cleanNit.charAt(cleanNit.length - 1 - i), 10) * primes[i];
  }

  const mod = sum % 11;
  return mod > 1 ? (11 - mod).toString() : mod.toString();
};
