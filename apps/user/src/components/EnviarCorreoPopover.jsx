import { useState, useId } from "react";
import { createPortal } from "react-dom";
import { validateCorreoDestino } from "./EnviarCorreoPopover.validation";
import { Button, IconButton, useAnchoredPopover } from "@ingefact/ui";

const ANCHO = 288;
const ALTO_ESTIMADO = 200;

/**
 * Boton que pide un correo y envia el documento a ese destinatario. No es un
 * modal: es un panel pequeno anclado al boton (se pinta en un portal para no
 * quedar recortado por las tablas con overflow) que se cierra con Escape, al
 * hacer clic afuera o al desplazar la pagina.
 *
 * `onEnviar(correo)` hace el envio real; si lanza, el mensaje se muestra en el
 * panel y este sigue abierto para reintentar. `onEnviado(correo)` se llama al
 * terminar bien (el padre normalmente muestra un aviso).
 */
export default function EnviarCorreoPopover({
  variant = "icon",
  title = "Enviar por correo",
  label = "Enviar correo",
  defaultEmail = "",
  onEnviar,
  onEnviado,
}) {
  const inputId = useId();
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState(null);
  const [sending, setSending] = useState(false);
  const { triggerRef, panelRef, open, position, show, close } = useAnchoredPopover({
    width: ANCHO,
    estimatedHeight: ALTO_ESTIMADO,
    onClose: () => setSendError(null),
  });

  const handleToggle = () => {
    if (open) {
      close();
      return;
    }
    setCorreo(defaultEmail);
    setError(defaultEmail ? validateCorreoDestino(defaultEmail) : "");
    setSendError(null);
    show();
  };

  const handleChange = (e) => {
    setCorreo(e.target.value);
    setError(validateCorreoDestino(e.target.value));
    setSendError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const mensaje = validateCorreoDestino(correo);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await onEnviar(correo.trim());
      close();
      onEnviado?.(correo.trim());
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const trigger =
    variant === "icon" ? (
      <IconButton title={title} onClick={handleToggle}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </IconButton>
    ) : (
      <Button
        onClick={handleToggle}
      >
        {label}
      </Button>
    );

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        {trigger}
      </span>

      {open &&
        createPortal(
          <form
            ref={panelRef}
            role="dialog"
            aria-label={title}
            onSubmit={handleSubmit}
            // Los eventos de un portal burbujean por el arbol de React hasta la fila de la
            // tabla (que navega al detalle al hacer clic).
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: position.top, left: position.left, width: ANCHO }}
            className="z-50 bg-white border border-neutralCustom-200 rounded-brand-lg shadow-lg p-4 space-y-3"
          >
            <div>
              <label htmlFor={inputId} className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                Enviar a este correo
              </label>
              <input
                id={inputId}
                type="email"
                autoFocus
                value={correo}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                className={`field w-full ${error ? "border-fiscal-danger field-invalid" : ""}`}
              />
              {error && <p className="mt-1 text-sm text-fiscal-danger">{error}</p>}
            </div>

            {sendError && (
              <div className="p-2 bg-red-50 border border-fiscal-danger text-fiscal-danger text-xs rounded-brand-md">
                {sendError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={close}
                disabled={sending}
                size="sm"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={sending || Boolean(error)}
                variant="primary"
                size="sm"
                loading={sending}
              >
                Enviar
              </Button>
            </div>
          </form>,
          document.body,
        )}
    </>
  );
}
