import { useState } from "react";
import { obtenerXmlFacturaRecibida } from "@ingefact/core-api";
import { IconButton } from "@ingefact/ui";

function descargarBase64(nombreArchivo, contenidoBase64) {
  const bytes = Uint8Array.from(atob(contenidoBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/xml" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}

// El XML se pide a la DIAN (via backend) en el momento: no se guarda.
export default function DescargarXmlButton({ facturaId, onError }) {
  const [descargando, setDescargando] = useState(false);

  const handleClick = async () => {
    setDescargando(true);
    try {
      const { nombre_archivo, contenido_base64 } = await obtenerXmlFacturaRecibida(facturaId);
      descargarBase64(nombre_archivo, contenido_base64);
    } catch (error) {
      onError?.(error.message);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <IconButton title={descargando ? "Descargando XML..." : "Descargar XML"} onClick={handleClick} disabled={descargando}>
      <svg className={`w-4 h-4 ${descargando ? "animate-pulse" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    </IconButton>
  );
}
