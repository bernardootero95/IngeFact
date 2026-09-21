import { createPortal } from "react-dom";
import { useId } from "react";
import Button from "./Button.jsx";
import useAnchoredPopover from "../hooks/useAnchoredPopover.js";

const ANCHO = 288;

/**
 * Confirmacion para acciones destructivas o irreversibles. Reemplaza a
 * window.confirm: no es un modal, es un panel pequeno anclado al boton que
 * dispara la accion. El foco cae en "Cancelar" (opcion segura) y se cierra con
 * Escape, clic afuera o al desplazar.
 *
 * Uso: el hijo es una funcion que recibe `ask` y pinta el boton disparador:
 *
 *   <ConfirmPopover message="¿Eliminar este borrador?" confirmLabel="Eliminar" onConfirm={handleEliminar}>
 *     {({ ask }) => <Button variant="danger" onClick={ask}>Eliminar</Button>}
 *   </ConfirmPopover>
 */
export default function ConfirmPopover({
  message,
  confirmLabel = "Confirmar",
  confirmVariant = "danger-solid",
  onConfirm,
  children,
}) {
  const messageId = useId();
  const { triggerRef, panelRef, open, position, show, close } = useAnchoredPopover({
    width: ANCHO,
    estimatedHeight: 140,
  });

  const ask = () => (open ? close() : show());

  const handleConfirm = () => {
    close();
    onConfirm();
  };

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        {children({ ask, open })}
      </span>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="alertdialog"
            aria-describedby={messageId}
            // Los eventos de un portal burbujean por el arbol de React hasta la fila de la
            // tabla (que navega al detalle al hacer clic).
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: position.top, left: position.left, width: ANCHO }}
            className="z-50 bg-white border border-neutralCustom-200 rounded-brand-lg shadow-lg p-4 space-y-4"
          >
            <p id={messageId} className="text-sm text-neutralCustom-800">
              {message}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={close} autoFocus>
                Cancelar
              </Button>
              <Button variant={confirmVariant} size="sm" onClick={handleConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
