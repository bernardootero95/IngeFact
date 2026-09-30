import { useState } from "react";
import { DuplicateIcon, IconButton } from "@ingefact/ui";

/**
 * Accion de fila "Duplicar": crea un borrador con los datos del documento.
 * `onDuplicar` es async (crea el borrador y navega a editarlo); si falla, el
 * error lo maneja quien llama.
 */
export default function DuplicarAccion({ onDuplicar }) {
  const [duplicando, setDuplicando] = useState(false);

  const handleClick = async () => {
    setDuplicando(true);
    try {
      await onDuplicar();
    } finally {
      setDuplicando(false);
    }
  };

  return (
    <IconButton title="Duplicar como borrador" onClick={handleClick} disabled={duplicando}>
      <DuplicateIcon />
    </IconButton>
  );
}
