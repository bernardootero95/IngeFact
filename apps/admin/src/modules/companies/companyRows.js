import { filterItems } from "@ingefact/ui";

/** Mismo umbral que el dashboard (DIAS_ALERTA_VENCIMIENTO_PLAN en la API). */
export const DIAS_POR_VENCER = 30;

export const ESTADOS_PLAN = [
  { value: "vigente", label: "Vigentes" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vencido", label: "Vencidas" },
  { value: "agotado", label: "Cupo agotado" },
  { value: "sin_plan", label: "Sin plan" },
];

export const ESTADOS_EMPRESA = [
  { value: "activo", label: "Activa" },
  { value: "inactivo", label: "Inactiva" },
  { value: "error_alegra", label: "Error en Alegra" },
];

// Orden de gravedad: al ordenar por "Plan" las que requieren accion van primero.
const GRAVEDAD_PLAN = { vencido: 0, agotado: 1, por_vencer: 2, sin_plan: 3, vigente: 4 };

const MS_DIA = 24 * 60 * 60 * 1000;

/** Fecha "AAAA-MM-DD" de hoy en la zona del navegador. */
export const hoyIso = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

const diasEntre = (desdeIso, hastaIso) => Math.round((Date.parse(hastaIso) - Date.parse(desdeIso)) / MS_DIA);

/** "2026-10-06" -> "06/10/2026". */
export const formatoFecha = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

export function estadoPlan(sub, hoy) {
  if (!sub) return { estado: "sin_plan", dias: null };
  const dias = diasEntre(hoy, sub.fecha_fin);
  if (dias < 0) return { estado: "vencido", dias };
  if (sub.documentos_usados >= sub.max_documentos) return { estado: "agotado", dias };
  if (dias <= DIAS_POR_VENCER) return { estado: "por_vencer", dias };
  return { estado: "vigente", dias };
}

/**
 * Aplana una empresa de la API en una fila con claves directas, para que la
 * tabla pueda ordenar por cualquier columna (useTableView ordena por clave).
 */
export function aFilaEmpresa(company, hoy = hoyIso()) {
  const sub = company.suscripcion || null;
  const { estado, dias } = estadoPlan(sub, hoy);
  const porcentaje = sub && sub.max_documentos > 0 ? Math.round((sub.documentos_usados / sub.max_documentos) * 100) : null;
  return {
    ...company,
    nit: `${company.numero_identificacion}-${company.digito_verificacion}`,
    fecha_inicio: sub?.fecha_inicio ?? null,
    fecha_fin: sub?.fecha_fin ?? null,
    documentos_usados: sub?.documentos_usados ?? null,
    max_documentos: sub?.max_documentos ?? null,
    porcentaje,
    estado_plan: estado,
    gravedad_plan: GRAVEDAD_PLAN[estado],
    dias_para_vencer: dias,
  };
}

/** Cuenta filas por estado de plan, para las pestañas de filtro. */
export function contarPorPlan(filas) {
  return filas.reduce(
    (acc, fila) => ({ ...acc, [fila.estado_plan]: (acc[fila.estado_plan] || 0) + 1 }),
    {},
  );
}

const CLAVES_BUSQUEDA = ["razon_social", "nombre_comercial", "numero_identificacion", "correo_electronico"];

export function filtrarEmpresas(filas, { search = "", plan = "", estado = "" } = {}) {
  const porPlan = plan ? filas.filter((f) => f.estado_plan === plan) : filas;
  const porEstado = estado ? porPlan.filter((f) => f.estado === estado) : porPlan;
  return filterItems(porEstado, CLAVES_BUSQUEDA, search);
}
