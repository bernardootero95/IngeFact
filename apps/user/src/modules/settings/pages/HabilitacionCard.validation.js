// Mismo patron que valida el backend (y el proveedor tecnologico): 8-4-4-4-12
// caracteres alfanumericos. No es un UUID hexadecimal estricto.
const TEST_SET_ID_PATTERN = /^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/;

export function validateTestSetId(value) {
  const limpio = value.trim();
  if (!limpio) return "Este campo es obligatorio.";
  if (!TEST_SET_ID_PATTERN.test(limpio)) {
    return "El TestSetId debe tener el formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.";
  }
  return "";
}
