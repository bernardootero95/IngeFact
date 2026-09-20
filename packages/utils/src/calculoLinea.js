const redondear = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Mismo calculo que apps/api/src/core/calculo_linea.py (solo para mostrar en
// pantalla; el backend es la fuente de verdad). `valorExcluido` es el valor
// TOTAL de la linea de un impuesto monofasico (ICL/IBUA) embebido en el
// subtotal, que se resta de la base del IVA.
export function calcularLinea({ cantidad, precio, tarifa, valorExcluido = 0 }) {
  const subtotal = redondear((Number(cantidad) || 0) * (Number(precio) || 0));
  const excluido = Math.min(Math.max(Number(valorExcluido) || 0, 0), subtotal);
  const base = redondear(subtotal - excluido);
  const impuesto = redondear(base * ((Number(tarifa) || 0) / 100));
  return { subtotal, excluido, base, impuesto, total: redondear(subtotal + impuesto) };
}

export function excluidoProporcional(valorExcluidoOrigen, cantidadOrigen, cantidad) {
  const origen = Number(cantidadOrigen) || 0;
  if (origen <= 0) return 0;
  return redondear(((Number(valorExcluidoOrigen) || 0) * (Number(cantidad) || 0)) / origen);
}
