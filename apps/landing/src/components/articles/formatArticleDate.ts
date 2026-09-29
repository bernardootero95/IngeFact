const formatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-09-28" → "28 de septiembre de 2026" (UTC para que la fecha no se corra un día). */
export function formatArticleDate(iso: string): string {
  return formatter.format(new Date(`${iso}T00:00:00Z`));
}
