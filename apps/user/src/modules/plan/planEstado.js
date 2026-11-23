/**
 * Estado comercial del plan tal como lo calcula la API
 * (EmpresaDetailResponse.suscripcion.estado_plan, ver domain/estado_plan.py).
 */
export const ESTADO_PLAN = {
  VIGENTE: "vigente",
  SIN_CUPO: "sin_cupo",
  VENCIDO: "vencido",
  SIN_PLAN: "sin_plan",
};

// Mismo numero que la landing (apps/landing/src/lib/whatsapp.ts).
export const WHATSAPP_NUMERO = "573046402211";

export function estadoPlanDe(empresa) {
  return empresa?.suscripcion?.estado_plan ?? ESTADO_PLAN.SIN_PLAN;
}

export function enlaceCompraPaquete(empresa, { renovar = false } = {}) {
  const quien = empresa ? `${empresa.razon_social} (NIT ${empresa.numero_identificacion})` : "un cliente de IngeFact";
  const pedido = renovar ? "renovar mi paquete" : "adquirir un nuevo paquete";
  const texto = `Hola, soy ${quien}. Quiero ${pedido} de documentos de IngeFact.`;
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
}

// Mismos umbrales que el admin (30 dias, companyRows.js) y que el correo de
// alerta de cupo (se envia al usar el 90 %, suscripcion_service.py).
export const DIAS_AVISO_VENCIMIENTO = 30;
export const FRACCION_AVISO_DOCUMENTOS = 0.1;

/**
 * Avisos de plan proximo a terminar, solo con el plan vigente (sin cupo y
 * vencido tienen sus propios avisos):
 * - fecha: vence en DIAS_AVISO_VENCIMIENTO dias o menos.
 * - documentos: le queda el 10 % del paquete o menos (minimo 1 documento).
 * Devuelve null si no hay nada que avisar.
 */
export function alertasPorVencer(empresa) {
  const s = empresa?.suscripcion;
  if (!s || estadoPlanDe(empresa) !== ESTADO_PLAN.VIGENTE) return null;

  const dias = s.dias_para_vencer;
  const fecha = dias != null && dias <= DIAS_AVISO_VENCIMIENTO ? { dias, fechaFin: s.fecha_fin } : null;

  const restantes = s.max_documentos - s.documentos_usados;
  const umbral = Math.max(Math.ceil(s.max_documentos * FRACCION_AVISO_DOCUMENTOS), 1);
  const documentos = restantes > 0 && restantes <= umbral ? { restantes, max: s.max_documentos } : null;

  return fecha || documentos ? { fecha, documentos } : null;
}

export function textoVencimiento({ dias, fechaFin }) {
  if (dias <= 0) return `Tu plan vence hoy (${formatoFecha(fechaFin)}).`;
  if (dias === 1) return `Tu plan vence mañana (${formatoFecha(fechaFin)}).`;
  return `Tu plan vence en ${dias} días, el ${formatoFecha(fechaFin)}.`;
}

export function textoDocumentos({ restantes, max }) {
  const cuantos = restantes === 1 ? "1 documento" : `${restantes.toLocaleString("es-CO")} documentos`;
  return `Te queda${restantes === 1 ? "" : "n"} ${cuantos} de ${max.toLocaleString("es-CO")} en tu paquete.`;
}

export function tituloPorVencer({ fecha, documentos }) {
  if (fecha && documentos) return "Tu plan está por terminar";
  return fecha ? "Tu plan vence pronto" : "Te quedan pocos documentos";
}

/** "2026-10-06" -> "06/10/2026" sin pasar por Date (evita el corrimiento de zona). */
export function formatoFecha(iso) {
  if (!iso) return "";
  const [anio, mes, dia] = String(iso).slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

/**
 * El aviso de plan se muestra una vez por ingreso: se recuerda en
 * sessionStorage, que se limpia al cerrar la pestaña. Si el navegador no deja
 * usarlo (modo privado estricto), se muestra siempre.
 */
const CLAVE_AVISO = "ingefact_aviso_plan";

const storageDeSesion = () => globalThis.sessionStorage;

export function avisoPendiente(empresaId, estado, storage = storageDeSesion()) {
  try {
    return storage.getItem(CLAVE_AVISO) !== `${empresaId}:${estado}`;
  } catch {
    return true;
  }
}

export function marcarAvisoVisto(empresaId, estado, storage = storageDeSesion()) {
  try {
    storage.setItem(CLAVE_AVISO, `${empresaId}:${estado}`);
  } catch {
    // Sin storage el aviso vuelve a salir en la siguiente pantalla; no es grave.
  }
}

/** Documentos con CUFE/CUDE/CUDS/CUNE ya existen en la DIAN: tienen PDF y XML reales. */
export function tieneArchivosDian(documento) {
  return Boolean(documento.cufe || documento.cude || documento.cuds || documento.cune);
}
