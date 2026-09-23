const FORMATEADOR_FECHA_COLOMBIA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Fecha calendario actual en Colombia (America/Bogota, UTC-5 sin horario de
 * verano) como string "YYYY-MM-DD", para usar como valor por defecto de
 * campos de fecha de documentos DIAN (factura, documento soporte, etc.).
 *
 * NUNCA usar `new Date().toISOString().slice(0, 10)` para esto: toISOString()
 * convierte a UTC primero, asi que entre las 7pm y la medianoche hora
 * Colombia devuelve la fecha de MANANA (hallazgo real: una factura creada
 * en la noche quedaba fechada un dia adelante). Intl.DateTimeFormat con
 * timeZone fijo evita el problema sin importar la zona horaria del
 * navegador o del sistema operativo.
 *
 * @param {Date} [fecha] Fecha a formatear (por defecto la actual).
 * @returns {string}
 */
export function fechaHoyColombia(fecha = new Date()) {
  return FORMATEADOR_FECHA_COLOMBIA.format(fecha);
}
