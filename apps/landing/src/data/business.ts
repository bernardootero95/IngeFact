import { WHATSAPP_DISPLAY } from "@/lib/whatsapp";

/**
 * Única fuente de verdad de los datos legales del negocio. Los usan el
 * pie de página y las páginas legales (privacidad, términos, cookies,
 * reembolsos). El Estatuto del Consumidor (Ley 1480 de 2011, art. 50) y
 * la Ley 1581 de 2012 exigen publicar la identidad del responsable.
 *
 * Titular, nombre comercial, NIT, dirección y correo confirmados por el
 * usuario (2026-09-24).
 * TODO: el horario (entre corchetes) aún NO está confirmado; reemplazarlo
 * antes de publicar.
 */
export const BUSINESS = {
  marca: "IngeFact",
  // Persona natural comerciante: el titular responde legalmente; el nombre
  // comercial se escribe tal como figura en el RUT / Cámara de Comercio.
  titular: "Bernardo Andrés Otero Jiménez",
  nombreComercial: "TecnoIngenieria B.O.",
  tipoPersona: "persona natural",
  // DV calculado con calculateNitDV / nit_check_digit (ambos dan 7).
  nit: "1083000777-7",
  direccion: "Carrera 15 # 2-23",
  ciudad: "Ciénaga, Magdalena, Colombia",
  correo: "contacto@tecnoingenieriabo.com",
  // Mismo buzón para PQR y para solicitudes de datos personales (Ley 1581).
  correoDatosPersonales: "contacto@tecnoingenieriabo.com",
  telefono: WHATSAPP_DISPLAY,
  horario: "[lunes a viernes, 8:00 a.m. – 6:00 p.m.]",
  sitio: "https://ingefact.com",
  app: "https://app.ingefact.com",
  regimenIva: "No responsable de IVA",
} as const;

/** "Bernardo Andrés Otero Jiménez (TecnoIngenieria B.O.)": identifica al responsable en pies y textos legales. */
export const RESPONSABLE = `${BUSINESS.titular} (${BUSINESS.nombreComercial})`;

/** Fecha desde la que rigen las versiones actuales de las políticas. */
export const LEGAL_LAST_UPDATED = "24 de septiembre de 2026";

/** Condiciones comerciales de los paquetes, citadas en precios y términos. */
export const PACKAGE_TERMS = {
  vigenciaMeses: 12,
  diasRetracto: 5,
} as const;
