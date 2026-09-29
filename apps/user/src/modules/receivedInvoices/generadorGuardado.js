// Quien firma los eventos suele ser siempre la misma persona: se recuerda en
// este navegador para no teclearla en cada acuse/recibo. Es solo una
// comodidad; si el almacenamiento no esta disponible se sigue sin el.
const CLAVE = "ingefact_generador_eventos";

export const GENERADOR_VACIO = {
  tipo_identificacion: "",
  numero_identificacion: "",
  dv: "",
  nombres: "",
  apellidos: "",
  cargo: "",
};

export function leerGeneradorGuardado() {
  try {
    const guardado = JSON.parse(window.localStorage.getItem(CLAVE) || "null");
    return guardado ? { ...GENERADOR_VACIO, ...guardado } : GENERADOR_VACIO;
  } catch {
    return GENERADOR_VACIO;
  }
}

export function guardarGenerador(generador) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(generador));
  } catch {
    // Sin almacenamiento disponible: no pasa nada.
  }
}
