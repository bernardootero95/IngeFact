// Logica pura de la carga masiva desde el reporte de la DIAN. La pantalla
// solo presenta; el backend decide que filas se cargan.

export const MAX_MB_REPORTE = 5;
// El backend acepta hasta 20; lotes mas chicos dan un avance mas fluido.
export const TAMANO_LOTE = 5;

export const RESULTADO_LABELS = {
  cargada: "Cargada",
  omitida: "No se cargó",
  error: "Error",
};

export const RESULTADO_BADGE = {
  cargada: "bg-brand-50 text-brand-600",
  omitida: "bg-neutralCustom-100 text-neutralCustom-600",
  error: "bg-fiscal-danger/10 text-fiscal-danger",
};

export function validateReporteFile(file) {
  if (!file) return "Elige el archivo del reporte.";
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return "Sube el reporte en Excel (.xlsx) tal como lo descargas de la DIAN.";
  }
  if (file.size > MAX_MB_REPORTE * 1024 * 1024) {
    return `El archivo pesa más de ${MAX_MB_REPORTE} MB. Descarga el reporte por un rango de fechas más corto.`;
  }
  return "";
}

export function partirEnLotes(items, tamano = TAMANO_LOTE) {
  const lotes = [];
  for (let i = 0; i < items.length; i += tamano) lotes.push(items.slice(i, i + tamano));
  return lotes;
}

export function contarResultados(resultados) {
  const conteo = { cargada: 0, omitida: 0, error: 0 };
  for (const r of resultados) conteo[r.resultado] = (conteo[r.resultado] || 0) + 1;
  return conteo;
}

// Un lote que falla entero (red caida, sesion vencida) marca sus CUFE como
// error para poder reintentarlos sin perder el resto.
export function resultadosDeLoteFallido(cufes, mensaje) {
  return cufes.map((cufe) => ({ cufe, resultado: "error", mensaje, factura: null }));
}

export function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}
