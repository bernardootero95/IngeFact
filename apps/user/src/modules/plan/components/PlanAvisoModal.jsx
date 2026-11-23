import { useEffect, useId, useRef } from "react";
import { Button } from "@ingefact/ui";
import { WhatsAppIcon } from "./iconos";

const TONOS = {
  warning: { icono: "bg-amber-100 text-amber-700", borde: "border-t-amber-500" },
  danger: { icono: "bg-fiscal-danger/10 text-fiscal-danger", borde: "border-t-fiscal-danger" },
};

/**
 * Aviso de plan al ingresar. Usa <dialog> nativo con showModal(): el
 * navegador ya atrapa el foco, cierra con Esc y oculta el fondo para lectores
 * de pantalla. El boton principal abre el chat de WhatsApp para comprar.
 */
export default function PlanAvisoModal({ abierto, titulo, children, tono = "warning", enlaceCompra, onCerrar }) {
  const ref = useRef(null);
  const tituloId = useId();
  const estilos = TONOS[tono] ?? TONOS.warning;

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      onClose={onCerrar}
      onCancel={onCerrar}
      className={`m-auto w-[calc(100%-2rem)] max-w-md rounded-brand-lg border-t-4 ${estilos.borde} bg-white p-0 shadow-xl backdrop:bg-neutralCustom-900/50`}
    >
      <div className="p-6">
        <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full ${estilos.icono}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>
        <h2 id={tituloId} className="text-lg font-semibold text-neutralCustom-800">
          {titulo}
        </h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutralCustom-600">{children}</div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-neutralCustom-100 bg-neutralCustom-50 px-6 py-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCerrar}>
          Entendido
        </Button>
        <Button
          as="a"
          href={enlaceCompra}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
          icon={WhatsAppIcon}
          onClick={onCerrar}
        >
          Comprar paquete
        </Button>
      </div>
    </dialog>
  );
}
