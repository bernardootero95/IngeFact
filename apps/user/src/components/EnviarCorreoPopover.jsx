import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import IconButton from "./IconButton";
import { validateCorreoDestino } from "./EnviarCorreoPopover.validation";

const ANCHO = 288;
const ALTO_ESTIMADO = 200;
const MARGEN = 8;

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
  label = "Enviar por Correo",
  defaultEmail = "",
  onEnviar,
  onEnviado,
}) {
  const inputId = useId();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState(null);
  const [sending, setSending] = useState(false);

  const close = () => {
    setOpen(false);
    setSendError(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeIfOutside = (event) => {
      if (panelRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      setOpen(false);
      setSendError(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSendError(null);
      }
    };
    const closeOnScroll = () => setOpen(false);
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.max(MARGEN, Math.min(rect.right - ANCHO, window.innerWidth - ANCHO - MARGEN));
    const cabeAbajo = rect.bottom + MARGEN + ALTO_ESTIMADO <= window.innerHeight;
    setPosition({ top: cabeAbajo ? rect.bottom + MARGEN : Math.max(MARGEN, rect.top - ALTO_ESTIMADO - MARGEN), left });
    setCorreo(defaultEmail);
    setError(defaultEmail ? validateCorreoDestino(defaultEmail) : "");
    setSendError(null);
    setOpen(true);
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
      setOpen(false);
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
      <button
        type="button"
        onClick={handleToggle}
        className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors"
      >
        {label}
      </button>
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
                className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                  error
                    ? "border-fiscal-danger focus:border-fiscal-danger"
                    : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                }`}
              />
              {error && <p className="mt-1 text-xs text-fiscal-danger">{error}</p>}
            </div>

            {sendError && (
              <div className="p-2 bg-red-50 border border-fiscal-danger text-fiscal-danger text-xs rounded-brand-md">
                {sendError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={sending}
                className="px-3 py-1.5 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sending || Boolean(error)}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>,
          document.body,
        )}
    </>
  );
}
