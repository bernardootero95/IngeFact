import { ESTADO_PLAN, alertasPorVencer, estadoPlanDe } from "../plan/planEstado";

const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const formatoCOP = (valor) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor ?? 0);

/** Nombre del mes anterior a `hoy` ("octubre"), para "vs. octubre". */
export function nombreMesAnterior(hoy = new Date()) {
  return NOMBRES_MES[(hoy.getMonth() + 11) % 12];
}

/**
 * Variacion del mes actual frente al anterior, en entero redondeado.
 * - null si el mes anterior fue 0 (no hay contra que comparar).
 * - tendencia: "sube" | "baja" | "igual".
 */
export function variacion(actual, anterior) {
  if (!anterior) return null;
  const porcentaje = Math.round(((actual - anterior) / anterior) * 100);
  const tendencia = porcentaje > 0 ? "sube" : porcentaje < 0 ? "baja" : "igual";
  return { porcentaje, tendencia };
}

export function textoVariacion(v, mesAnterior) {
  if (!v) return null;
  const signo = v.porcentaje > 0 ? "+" : "";
  return `${signo}${v.porcentaje} % vs. ${mesAnterior}`;
}

/**
 * Estado de la barra de consumo del plan.
 * tono: "normal" | "aviso" (por vencer) | "critico" (sin cupo o vencido).
 * Devuelve null sin plan.
 */
export function consumoPlan(empresa) {
  const s = empresa?.suscripcion;
  if (!s) return null;
  const estado = estadoPlanDe(empresa);
  const usados = Math.min(s.documentos_usados, s.max_documentos);
  const porcentaje = s.max_documentos > 0 ? Math.round((usados / s.max_documentos) * 100) : 100;
  let tono = "normal";
  if (estado === ESTADO_PLAN.SIN_CUPO || estado === ESTADO_PLAN.VENCIDO) tono = "critico";
  else if (alertasPorVencer(empresa)) tono = "aviso";
  return {
    usados: s.documentos_usados,
    max: s.max_documentos,
    disponibles: Math.max(s.max_documentos - s.documentos_usados, 0),
    porcentaje,
    diasParaVencer: s.dias_para_vencer,
    fechaFin: s.fecha_fin,
    tono,
  };
}

export function textoDiasPlan(dias) {
  if (dias == null) return null;
  if (dias < 0) return "Plan vencido";
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}

/**
 * Pasos para dejar la empresa lista para facturar, en el orden en que se
 * hacen. `kpis` viene de /tenant/dashboard.
 */
export function pasosConfiguracion(empresa, kpis) {
  return [
    {
      id: "alegra",
      titulo: "Habilitar facturación electrónica",
      ayuda: "Completa la habilitación ante la DIAN.",
      ruta: "/settings/habilitacion",
      hecho: Boolean(empresa?.id_alegra),
    },
    {
      id: "resolucion",
      titulo: "Configurar la resolución DIAN",
      ayuda: "Registra el prefijo y el rango autorizado.",
      ruta: "/settings/resolution",
      hecho: Boolean(kpis?.resolucion_configurada),
    },
    {
      id: "cliente",
      titulo: "Registrar tu primer cliente",
      ayuda: "Los datos de a quién le vas a facturar.",
      ruta: "/customers/new",
      hecho: (kpis?.clientes_registrados ?? 0) > 0,
    },
    {
      id: "producto",
      titulo: "Crear tu primer producto o servicio",
      ayuda: "Lo que vendes, con su precio e impuesto.",
      ruta: "/products/new",
      hecho: (kpis?.productos_registrados ?? 0) > 0,
    },
    {
      id: "factura",
      titulo: "Emitir tu primera factura",
      ayuda: "Queda lista cuando la DIAN la acepta.",
      ruta: "/invoices/new",
      hecho: Boolean(kpis?.tiene_facturas),
    },
  ];
}

export const configuracionCompleta = (pasos) => pasos.every((p) => p.hecho);
