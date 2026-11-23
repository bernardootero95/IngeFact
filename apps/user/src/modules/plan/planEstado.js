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

export function enlaceCompraPaquete(empresa) {
  const quien = empresa ? `${empresa.razon_social} (NIT ${empresa.numero_identificacion})` : "un cliente de IngeFact";
  const texto = `Hola, soy ${quien}. Quiero adquirir un nuevo paquete de documentos de IngeFact.`;
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
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
