export function validateField(name, value) {
  if (name === "codigo" && !value.trim()) return "El código interno es obligatorio.";
  if (name === "nombre" && !value.trim()) return "El nombre es obligatorio.";
  if (name === "precio") {
    if (value === "" || value === null) return "El precio es obligatorio.";
    if (isNaN(value) || Number(value) < 0) return "El precio debe ser un número mayor o igual a 0.";
  }
  if (name === "unidad_medida" && !value) return "La unidad de medida es obligatoria.";
  return "";
}
