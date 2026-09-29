import { useId } from "react";
import { Button, PlusIcon, TrashIcon, IconButton } from "@ingefact/ui";

function CampoNumero({ label, value, onChange, sufijo }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-neutralCustom-600 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="field w-full tabular-nums"
        />
        {sufijo && <span className="text-xs text-neutralCustom-500">{sufijo}</span>}
      </div>
    </div>
  );
}

function Grupo({ titulo, children }) {
  return (
    <fieldset className="mt-5">
      <legend className="text-xs font-medium uppercase tracking-wide text-neutralCustom-500 mb-3">{titulo}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </fieldset>
  );
}

/** Lista editable de tramos {desde, tarifa}; el primero siempre empieza en 0. */
function Tramos({ titulo, tramos, onChange, unidadDesde }) {
  const actualizar = (i, campo, valor) => onChange(tramos.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));
  const agregar = () => {
    const ultimo = tramos[tramos.length - 1];
    onChange([...tramos, { desde: ultimo.desde * 2 || 1000, tarifa: ultimo.tarifa }]);
  };

  return (
    <fieldset className="mt-5">
      <legend className="text-xs font-medium uppercase tracking-wide text-neutralCustom-500 mb-3">{titulo}</legend>
      <ul className="space-y-2">
        {tramos.map((tramo, i) => (
          <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            {i === 0 ? (
              <p className="text-xs text-neutralCustom-600 pb-2.5">Desde el primer documento</p>
            ) : (
              <CampoNumero
                label={`Tramo ${i + 1} desde (${unidadDesde})`}
                value={tramo.desde}
                onChange={(v) => actualizar(i, "desde", v)}
              />
            )}
            <CampoNumero
              label={`Tarifa tramo ${i + 1}`}
              value={tramo.tarifa}
              onChange={(v) => actualizar(i, "tarifa", v)}
              sufijo="$/doc"
            />
            {i === 0 ? (
              <span className="w-8" />
            ) : (
              <IconButton
                onClick={() => onChange(tramos.filter((_, j) => j !== i))}
                title={`Quitar tramo ${i + 1}`}
                variant="danger"
              >
                <TrashIcon className="h-4 w-4" />
              </IconButton>
            )}
          </li>
        ))}
      </ul>
      <Button variant="link" icon={PlusIcon} onClick={agregar} className="mt-2 text-sm">
        Agregar tramo
      </Button>
    </fieldset>
  );
}

export default function ParametrosFormula({ params, costos, onParams, onCostos, onRestaurar }) {
  const setParam = (campo) => (valor) => onParams({ ...params, [campo]: valor });
  const setCosto = (campo) => (valor) => onCostos({ ...costos, [campo]: valor });

  return (
    <details className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm">
      <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-neutralCustom-800">
        Parámetros de la fórmula (editables)
      </summary>
      <div className="border-t border-neutralCustom-100 px-6 pb-6">
        <Grupo titulo="Paquetes pequeños">
          <CampoNumero label="Precio mínimo de un paquete" value={params.precioMinimo} onChange={setParam("precioMinimo")} sufijo="$" />
          <CampoNumero label="Tope del tramo micro" value={params.microTope} onChange={setParam("microTope")} sufijo="docs" />
          <CampoNumero label="Precio en el tope del micro" value={params.microAncla} onChange={setParam("microAncla")} sufijo="$" />
        </Grupo>

        <Grupo titulo="Fórmula estándar">
          <CampoNumero label="Base fija" value={params.base} onChange={setParam("base")} sufijo="$" />
          <CampoNumero label="Precio base como % del precio" value={params.margenPct} onChange={setParam("margenPct")} sufijo="%" />
          <CampoNumero label="Comisión del vendedor" value={params.comisionPct} onChange={setParam("comisionPct")} sufijo="%" />
        </Grupo>

        <Tramos
          titulo="Descuento por volumen (documentos del paquete)"
          tramos={params.tramos}
          onChange={setParam("tramos")}
          unidadDesde="docs"
        />

        <Grupo titulo="Proveedor tecnológico">
          <CampoNumero label="Mensualidad" value={costos.mensualidad} onChange={setCosto("mensualidad")} sufijo="$" />
        </Grupo>
        <Tramos
          titulo="Tarifas del proveedor (documentos al mes)"
          tramos={costos.tramos}
          onChange={setCosto("tramos")}
          unidadDesde="docs/mes"
        />
        <p className="mt-3 text-xs text-neutralCustom-500">
          El costo de un paquete se estima con su promedio mensual (documentos ÷ 12), cobrado desde el primer documento
          sin descontar los incluidos en la mensualidad. Los tramos del proveedor suman los documentos de todos los
          clientes en el mes calendario.
        </p>

        <div className="mt-6">
          <Button variant="secondary" onClick={onRestaurar}>
            Restaurar
          </Button>
        </div>
      </div>
    </details>
  );
}
