/** Nombre comercial solo si aporta algo distinto a la razón social (misma
 * regla que _render_nombres_emisor del PDF en el backend). */
export function nombreComercialVisible(empresa) {
  const comercial = empresa?.nombre_comercial?.trim();
  if (!comercial) return null;
  return comercial.toLowerCase() === empresa.razon_social?.trim().toLowerCase() ? null : comercial;
}
