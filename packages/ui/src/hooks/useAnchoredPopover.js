import { useCallback, useEffect, useRef, useState } from "react";

const MARGEN = 8;

/**
 * Logica comun de los paneles anclados a un boton (no modales): posicion fija
 * calculada desde el boton (abre hacia abajo o hacia arriba segun el espacio),
 * y cierre con Escape, clic afuera o al desplazar la pagina. El panel debe
 * pintarse en un portal para no quedar recortado por tablas con overflow.
 *
 * `onClose` se llama en cada cierre (para limpiar el estado del panel).
 */
export default function useAnchoredPopover({ width, estimatedHeight, onClose }) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = useCallback(() => {
    setOpen(false);
    onCloseRef.current?.();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeIfOutside = (event) => {
      if (panelRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      close();
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, close]);

  const show = useCallback(() => {
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.max(MARGEN, Math.min(rect.right - width, window.innerWidth - width - MARGEN));
    const cabeAbajo = rect.bottom + MARGEN + estimatedHeight <= window.innerHeight;
    setPosition({
      top: cabeAbajo ? rect.bottom + MARGEN : Math.max(MARGEN, rect.top - estimatedHeight - MARGEN),
      left,
    });
    setOpen(true);
  }, [width, estimatedHeight]);

  return { triggerRef, panelRef, open, position, show, close };
}
