/**
 * Textos legales publicados en la landing (apps/landing). Las apps los
 * enlazan en vez de duplicarlos, para que exista una sola version vigente.
 */
export const LANDING_URL = "https://ingefact.com";

export const LEGAL_LINKS = [
  { label: "Términos y condiciones", href: `${LANDING_URL}/terminos` },
  { label: "Tratamiento de datos personales", href: `${LANDING_URL}/privacidad` },
];
