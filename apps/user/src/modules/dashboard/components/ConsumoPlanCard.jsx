import { Button } from "@ingefact/ui";
import { WhatsAppIcon } from "../../plan/components/iconos";
import { enlaceCompraPaquete, formatoFecha } from "../../plan/planEstado";
import { consumoPlan, textoDiasPlan } from "../dashboardResumen";

const BARRA_POR_TONO = {
  normal: "bg-brand-600",
  aviso: "bg-fiscal-warning",
  critico: "bg-fiscal-danger",
};

const TEXTO_DIAS_POR_TONO = {
  normal: "text-neutralCustom-600",
  aviso: "text-amber-700",
  critico: "text-fiscal-danger",
};

/** Consumo del paquete de documentos, vencimiento y botón para renovar o comprar. */
export default function ConsumoPlanCard({ empresa }) {
  const consumo = consumoPlan(empresa);

  return (
    <section
      aria-labelledby="consumo-plan-titulo"
      className="flex flex-col rounded-brand-lg border border-neutralCustom-100 bg-white p-6 shadow-sm"
    >
      <h3 id="consumo-plan-titulo" className="text-sm font-medium text-neutralCustom-500">
        Tu plan
      </h3>

      {consumo ? (
        <>
          <p className="mt-2 text-3xl font-bold tabular-nums text-neutralCustom-800">
            {consumo.disponibles.toLocaleString("es-CO")}
            <span className="ml-2 text-base font-medium text-neutralCustom-500">documentos disponibles</span>
          </p>

          <div
            role="progressbar"
            aria-label="Documentos usados del paquete"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={consumo.porcentaje}
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutralCustom-100"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${BARRA_POR_TONO[consumo.tono]}`}
              style={{ width: `${consumo.porcentaje}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-neutralCustom-600 tabular-nums">
            {consumo.usados.toLocaleString("es-CO")} de {consumo.max.toLocaleString("es-CO")} usados (
            {consumo.porcentaje} %)
          </p>

          <p className={`mt-1 text-sm font-medium ${TEXTO_DIAS_POR_TONO[consumo.tono]}`}>
            {textoDiasPlan(consumo.diasParaVencer)}
            <span className="font-normal text-neutralCustom-500"> · hasta el {formatoFecha(consumo.fechaFin)}</span>
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-neutralCustom-600">
          No tienes un plan activo. Adquiere un paquete para empezar a facturar.
        </p>
      )}

      <div className="mt-auto pt-5">
        <Button
          as="a"
          href={enlaceCompraPaquete(empresa, { renovar: Boolean(consumo) })}
          target="_blank"
          rel="noopener noreferrer"
          variant={consumo?.tono === "normal" ? "secondary" : "outline"}
          icon={WhatsAppIcon}
          fullWidth
        >
          {consumo ? "Renovar paquete" : "Adquirir paquete"}
        </Button>
      </div>
    </section>
  );
}
