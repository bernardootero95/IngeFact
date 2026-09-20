import { calcularLinea, excluidoProporcional } from "@ingefact/utils";

export function validateMotivo(motivoCodigo) {
  if (!motivoCodigo) return "Selecciona un motivo.";
  return "";
}

export function validateLineaCantidad(cantidad, disponible) {
  const numero = Number(cantidad);
  if (!cantidad || Number.isNaN(numero) || numero <= 0) return "La cantidad debe ser mayor a 0.";
  if (numero > disponible) return `No puede superar lo disponible (${disponible}).`;
  return "";
}

export function validateLineasCredito(seleccion) {
  const incluidas = seleccion.filter((linea) => linea.incluida);
  if (incluidas.length === 0) return "Selecciona al menos una línea a acreditar.";
  if (incluidas.some((linea) => Boolean(validateLineaCantidad(linea.cantidad, linea.disponible)))) {
    return "Revisa las cantidades: deben ser mayores a 0 y no superar lo disponible.";
  }
  return "";
}

export function calcularTotalesNota(seleccion) {
  let subtotal = 0;
  let totalImpuestos = 0;
  for (const linea of seleccion.filter((l) => l.incluida)) {
    const { facturaLinea } = linea;
    const calculo = calcularLinea({
      cantidad: linea.cantidad,
      precio: facturaLinea.precio_unitario,
      tarifa: facturaLinea.tarifa_impuesto,
      valorExcluido: excluidoProporcional(facturaLinea.valor_impuesto_excluido, facturaLinea.cantidad, linea.cantidad),
    });
    subtotal += calculo.subtotal;
    totalImpuestos += calculo.impuesto;
  }
  return { subtotal, totalImpuestos, total: subtotal + totalImpuestos };
}
