/**
 * Abre la representacion grafica de un documento (Factura/Nota Credito/Nota
 * Debito) -- si ya tiene CUFE/CUDE, pide el PDF real al backend y lo abre en
 * pestana nueva; si es un borrador, navega a la vista previa de React (el
 * PDF final no existe todavia, falta CUFE/CUDE/QR/firma reales).
 *
 * Compartido entre las paginas de listado y de detalle de los 3 tipos de
 * documento -- misma logica, solo cambia de donde sale el PDF y a donde
 * navegar para el borrador.
 */
export async function abrirRepresentacion({ tieneDocumentoValido, obtenerPdf, navigate, rutaPreview, onError }) {
  if (!tieneDocumentoValido) {
    navigate(rutaPreview);
    return;
  }
  try {
    const blob = await obtenerPdf();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    onError(error.message);
  }
}
