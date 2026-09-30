import { useState } from "react";
import { ConfirmPopover, IconButton, TrashIcon } from "@ingefact/ui";

/**
 * Accion de fila "Eliminar" para un borrador, con confirmacion. `onEliminar`
 * es async; si falla, el error lo maneja quien llama (normalmente un toast).
 */
export default function EliminarBorradorAccion({ mensaje, onEliminar }) {
  const [eliminando, setEliminando] = useState(false);

  const handleConfirm = async () => {
    setEliminando(true);
    try {
      await onEliminar();
    } finally {
      setEliminando(false);
    }
  };

  return (
    <ConfirmPopover message={mensaje} confirmLabel="Eliminar" onConfirm={handleConfirm}>
      {({ ask }) => (
        <IconButton title="Eliminar borrador" variant="danger" onClick={ask} disabled={eliminando}>
          <TrashIcon />
        </IconButton>
      )}
    </ConfirmPopover>
  );
}
