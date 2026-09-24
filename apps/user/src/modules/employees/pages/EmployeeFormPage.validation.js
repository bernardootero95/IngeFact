export function validateField(name, value, formData = {}) {
  if (name === "tipo_documento" && !value) return "El tipo de documento es obligatorio.";
  if (name === "numero_documento" && !String(value || "").trim()) return "El número de documento es obligatorio.";
  if (name === "primer_apellido" && !String(value || "").trim()) return "El primer apellido es obligatorio.";
  if (name === "primer_nombre" && !String(value || "").trim()) return "El primer nombre es obligatorio.";
  if (name === "tipo_trabajador" && !value) return "El tipo de trabajador es obligatorio.";
  if (name === "subtipo_trabajador" && !value) return "El subtipo de trabajador es obligatorio.";
  if (name === "tipo_contrato" && !value) return "El tipo de contrato es obligatorio.";
  if (name === "sueldo") {
    const n = Number(value);
    if (!value || Number.isNaN(n) || n <= 0) return "El sueldo debe ser un número mayor a 0.";
  }
  if (name === "lugar_trabajo_municipio" && !value) return "El municipio de trabajo es obligatorio.";
  if (name === "lugar_trabajo_direccion" && !String(value || "").trim()) return "La dirección de trabajo es obligatoria.";
  if (name === "fecha_ingreso" && !value) return "La fecha de ingreso es obligatoria.";
  if (name === "fecha_retiro" && value && formData.fecha_ingreso && value < formData.fecha_ingreso) {
    return "La fecha de retiro no puede ser anterior a la fecha de ingreso.";
  }
  return "";
}
