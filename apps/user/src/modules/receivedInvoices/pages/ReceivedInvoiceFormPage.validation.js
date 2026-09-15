export function validateProveedor(proveedorId) {
  if (!proveedorId) return "Debes seleccionar un proveedor.";
  return "";
}

export function validateCufe(cufe) {
  if (!cufe || !cufe.trim()) return "El CUFE es obligatorio.";
  return "";
}

export function validateFecha(fecha) {
  if (!fecha) return "La fecha es obligatoria.";
  return "";
}
