import { Button } from "@ingefact/ui";
import { WhatsAppIcon } from "./iconos";
import { enlaceCompraPaquete, formatoFecha } from "../planEstado";

/** Aviso fijo del dashboard cuando la empresa gasto todos los documentos del paquete. */
export default function SinCupoBanner({ empresa }) {
  const suscripcion = empresa?.suscripcion;
  return (
    <section
      role="alert"
      aria-labelledby="sin-cupo-titulo"
      className="flex flex-col gap-4 rounded-brand-lg border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h3 id="sin-cupo-titulo" className="text-base font-semibold text-amber-900">
          Te quedaste sin documentos
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-amber-900">
          Usaste los {suscripcion?.max_documentos?.toLocaleString("es-CO")} documentos de tu paquete. No podrás emitir
          facturas, notas, documentos soporte, nómina ni eventos hasta que adquieras un nuevo paquete.
          {suscripcion?.fecha_fin && ` Tu plan sigue vigente hasta el ${formatoFecha(suscripcion.fecha_fin)}.`}
        </p>
      </div>
      <Button
        as="a"
        href={enlaceCompraPaquete(empresa)}
        target="_blank"
        rel="noopener noreferrer"
        variant="primary"
        icon={WhatsAppIcon}
        className="shrink-0"
      >
        Comprar paquete
      </Button>
    </section>
  );
}
