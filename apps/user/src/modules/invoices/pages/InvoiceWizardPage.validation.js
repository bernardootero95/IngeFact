export function validateCliente(clienteId) {
  if (!clienteId) return "Debes seleccionar un cliente.";
  return "";
}

export function validateFecha(fecha) {
  if (!fecha) return "La fecha es obligatoria.";
  return "";
}

export function validateLineaCantidad(cantidad) {
  const numero = Number(cantidad);
  if (!cantidad || Number.isNaN(numero) || numero <= 0) return "La cantidad debe ser mayor a 0.";
  return "";
}

export function validateLineas(lineas) {
  if (lineas.length === 0) return "Agrega al menos una línea.";
  if (lineas.some((linea) => !linea.producto_id)) return "Selecciona un producto en todas las líneas.";
  if (lineas.some((linea) => Boolean(validateLineaCantidad(linea.cantidad)))) {
    return "Revisa las cantidades: deben ser mayores a 0.";
  }
  return "";
}

export function validateFormaPago(formaPago) {
  if (!formaPago) return "Selecciona una forma de pago.";
  return "";
}

export function validateMetodoPago(metodoPago) {
  if (!metodoPago) return "Selecciona un método de pago.";
  return "";
}

export function calcularTotales(lineas) {
  let subtotal = 0;
  let totalImpuestos = 0;
  for (const linea of lineas) {
    const cantidad = Number(linea.cantidad) || 0;
    const precio = Number(linea.producto?.precio) || 0;
    const tarifa = Number(linea.producto?.tarifa_impuesto) || 0;
    const subtotalLinea = cantidad * precio;
    subtotal += subtotalLinea;
    totalImpuestos += subtotalLinea * (tarifa / 100);
  }
  return { subtotal, totalImpuestos, total: subtotal + totalImpuestos };
}
