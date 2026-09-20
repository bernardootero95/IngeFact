export function validateField(name, value, context = {}) {
  if (name === "codigo" && !value.trim()) return "El código interno es obligatorio.";
  if (name === "nombre" && !value.trim()) return "El nombre es obligatorio.";
  if (name === "precio") {
    if (value === "" || value === null) return "El precio es obligatorio.";
    if (isNaN(value) || Number(value) < 0) return "El precio debe ser un número mayor o igual a 0.";
  }
  if (name === "unidad_medida" && !value) return "La unidad de medida es obligatoria.";
  if (name === "valor_impuesto_excluido") {
    if (value === "" || value === null) return "";
    if (isNaN(value) || Number(value) < 0) return "El impuesto excluido debe ser un número mayor o igual a 0.";
    const { precio } = context;
    if (precio !== "" && precio !== undefined && precio !== null && Number(value) > Number(precio)) {
      return "El impuesto excluido no puede ser mayor al precio.";
    }
  }
  return "";
}
