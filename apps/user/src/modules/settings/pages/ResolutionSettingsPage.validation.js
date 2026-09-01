export function validateField(name, value, formData) {
  if (["numero_resolucion", "prefijo", "technical_key"].includes(name)) {
    if (!value.trim()) return "Este campo es obligatorio.";
    return "";
  }
  if (name === "rango_minimo" || name === "rango_maximo") {
    if (value === "" || value === null) return "Este campo es obligatorio.";
    if (isNaN(value) || Number(value) <= 0) return "Debe ser un número mayor a 0.";
    const min = name === "rango_minimo" ? Number(value) : Number(formData.rango_minimo);
    const max = name === "rango_maximo" ? Number(value) : Number(formData.rango_maximo);
    if (formData.rango_minimo !== "" && formData.rango_maximo !== "" && max <= min) {
      return "El rango máximo debe ser mayor al rango mínimo.";
    }
    return "";
  }
  if (name === "fecha_inicio" || name === "fecha_fin") {
    if (!value) return "Este campo es obligatorio.";
    if (formData.fecha_inicio && formData.fecha_fin && formData.fecha_fin <= formData.fecha_inicio) {
      return "La fecha fin debe ser posterior a la fecha inicio.";
    }
    return "";
  }
  return "";
}
