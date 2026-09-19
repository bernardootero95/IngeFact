export function validateProveedor(proveedorId) {
  if (!proveedorId) return "Debes seleccionar un proveedor.";
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

export function validateLineaPrecio(precio) {
  const numero = Number(precio);
  if (!precio || Number.isNaN(numero) || numero <= 0) return "El precio debe ser mayor a 0.";
  return "";
}

export function validateLineas(lineas) {
  if (lineas.length === 0) return "Agrega al menos una línea.";
  if (lineas.some((linea) => !linea.producto_id)) return "Selecciona un producto en todas las líneas.";
  if (lineas.some((linea) => Boolean(validateLineaCantidad(linea.cantidad)))) {
    return "Revisa las cantidades: deben ser mayores a 0.";
  }
  if (lineas.some((linea) => Boolean(validateLineaPrecio(linea.precio_unitario)))) {
    return "Revisa los precios: deben ser mayores a 0.";
  }
  return "";
}

// El Documento Soporte no lleva impuestos (se le hace a quien no factura),
// asi que el total es la suma de los subtotales, sin IVA del producto.
export function calcularTotales(lineas) {
  let total = 0;
  for (const linea of lineas) {
    const cantidad = Number(linea.cantidad) || 0;
    const precio = Number(linea.precio_unitario ?? linea.producto?.precio) || 0;
    total += cantidad * precio;
  }
  return { total };
}
