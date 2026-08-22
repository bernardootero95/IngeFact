/**
 * URL base del API de Alegra e-provider. Configurable por entorno via la
 * variable ALLEGRA_API_URL (secret de la funcion):
 *   - Sandbox local: https://sandbox-api.alegra.com/e-provider/col/v1
 *   - Produccion:    https://api.alegra.com/e-provider/col/v1 (default)
 *
 * Sin esto, el sandbox local terminaba llamando siempre a la API real de
 * Alegra sin importar el entorno.
 */
export const ALEGRA_BASE_URL = (
  Deno.env.get("ALLEGRA_API_URL") || "https://api.alegra.com/e-provider/col/v1"
).replace(/\/$/, "");
