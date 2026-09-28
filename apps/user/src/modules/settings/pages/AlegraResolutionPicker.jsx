import { Button } from "@ingefact/ui";

/**
 * Lista de resoluciones que Alegra tiene registradas para el NIT, para que
 * el tenant elija cual importar -- Alegra no indica cual esta vigente.
 * Compartido por las resoluciones de facturacion y de documento soporte.
 */
export default function AlegraResolutionPicker({ opciones, onSelect, onCancel }) {
  return (
    <div className="mb-4 border border-neutralCustom-200 rounded-brand-md p-4 space-y-3">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-neutralCustom-800">
          Encontramos {opciones.length} resoluciones registradas para tu NIT. Elige cuál importar:
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-neutralCustom-500 hover:text-neutralCustom-700 shrink-0 ml-3"
        >
          Cancelar
        </button>
      </div>
      {opciones.map((opcion) => (
        <div
          key={`${opcion.numero_resolucion}-${opcion.rango_minimo}`}
          className="flex justify-between items-center gap-3 bg-neutralCustom-100/60 rounded-brand-md p-3"
        >
          <div className="text-sm text-neutralCustom-700">
            <p className="font-semibold">
              {opcion.prefijo || "Sin prefijo"} · Resolución {opcion.numero_resolucion}
            </p>
            <p className="text-xs text-neutralCustom-500">
              Rango {opcion.rango_minimo}–{opcion.rango_maximo} · Vigencia {opcion.fecha_inicio} a{" "}
              {opcion.fecha_fin}
            </p>
          </div>
          <Button type="button" onClick={() => onSelect(opcion)}>
            Usar esta
          </Button>
        </div>
      ))}
    </div>
  );
}
