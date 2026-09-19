import { calcularLinea, excluidoProporcional } from "@ingefact/utils";

export function validateMotivo(motivoCodigo) {
  if (!motivoCodigo) return "Selecciona un motivo.";
  return "";
}

export function validateLineaCantidad(cantidad) {
  const numero = Number(cantidad);
  if (!cantidad || Number.isNaN(numero) || numero <= 0) return "La cantidad debe ser mayor a 0.";
  return "";
}

export function validateLineasDebito(seleccion) {
  const incluidas = seleccion.filter((linea) => linea.incluida);
  if (incluidas.length === 0) return "Selecciona al menos una línea a cargar.";
  if (incluidas.some((linea) => Boolean(validateLineaCantidad(linea.cantidad)))) {
    return "Revisa las cantidades: deben ser mayores a 0.";
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
