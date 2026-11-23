import { Button } from "@ingefact/ui";
import { WhatsAppIcon } from "./iconos";
import { enlaceCompraPaquete, textoDocumentos, textoVencimiento, tituloPorVencer } from "../planEstado";

/**
 * Aviso del dashboard cuando el plan vigente esta por terminar, por fecha
 * (30 dias o menos) o por documentos (10 % o menos). `alertas` viene de
 * alertasPorVencer().
 */
export default function PorVencerBanner({ empresa, alertas }) {
  return (
    <section
      aria-labelledby="por-vencer-titulo"
      className="flex flex-col gap-4 rounded-brand-lg border border-fiscal-info/30 bg-fiscal-info/10 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h3 id="por-vencer-titulo" className="text-base font-semibold text-neutralCustom-800">
          {tituloPorVencer(alertas)}
        </h3>
        <ul className="mt-1 space-y-0.5 text-sm leading-relaxed text-neutralCustom-700">
          {alertas.fecha && <li>{textoVencimiento(alertas.fecha)}</li>}
          {alertas.documentos && <li>{textoDocumentos(alertas.documentos)}</li>}
        </ul>
        <p className="mt-1 text-sm text-neutralCustom-600">Renueva a tiempo para no quedarte sin poder facturar.</p>
      </div>
      <Button
        as="a"
        href={enlaceCompraPaquete(empresa, { renovar: true })}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        icon={WhatsAppIcon}
        className="shrink-0"
      >
        Renovar paquete
      </Button>
    </section>
  );
}
