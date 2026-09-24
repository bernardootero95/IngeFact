import { WHATSAPP_DISPLAY } from "@/lib/whatsapp";

/**
 * Única fuente de verdad de los datos legales del negocio. Los usan el
 * pie de página y las páginas legales (privacidad, términos, cookies,
 * reembolsos). El Estatuto del Consumidor (Ley 1480 de 2011, art. 50) y
 * la Ley 1581 de 2012 exigen publicar la identidad del responsable.
 *
 * TODO: los valores entre corchetes NO están confirmados. Reemplazarlos por
 * los datos reales (RUT/Cámara de Comercio) antes de publicar.
 */
export const BUSINESS = {
  nombreComercial: "IngeFact",
  razonSocial: "[RAZÓN SOCIAL O NOMBRE DEL TITULAR]",
  nit: "[NIT]",
  direccion: "[DIRECCIÓN]",
  ciudad: "Bogotá D.C., Colombia",
  correo: "[contacto@ingefact.com]",
  correoDatosPersonales: "[datospersonales@ingefact.com]",
  telefono: WHATSAPP_DISPLAY,
  horario: "[lunes a viernes, 8:00 a.m. – 6:00 p.m.]",
  sitio: "https://ingefact.com",
  app: "https://app.ingefact.com",
  regimenIva: "No responsable de IVA",
} as const;

/** Fecha desde la que rigen las versiones actuales de las políticas. */
export const LEGAL_LAST_UPDATED = "24 de septiembre de 2026";

/** Condiciones comerciales de los paquetes, citadas en precios y términos. */
export const PACKAGE_TERMS = {
  vigenciaMeses: 12,
  diasRetracto: 5,
} as const;
