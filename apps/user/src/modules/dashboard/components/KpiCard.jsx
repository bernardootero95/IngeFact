const TONO_TENDENCIA = {
  sube: { clase: "text-brand-700", flecha: "M5 15l7-7 7 7", lectura: "Subió" },
  baja: { clase: "text-fiscal-danger", flecha: "M19 9l-7 7-7-7", lectura: "Bajó" },
  igual: { clase: "text-neutralCustom-600", flecha: "M5 12h14", lectura: "Igual" },
};

/**
 * Tarjeta de un indicador. `tendencia` ("sube" | "baja" | "igual") y
 * `detalle` ("+20 % vs. octubre") son opcionales; la flecha acompaña al
 * texto para no depender solo del color.
 */
export default function KpiCard({ titulo, valor, detalle, tendencia, destacado = false }) {
  const tono = tendencia ? TONO_TENDENCIA[tendencia] : null;
  return (
    <div className="rounded-brand-lg border border-neutralCustom-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-neutralCustom-500">{titulo}</p>
      <p
        className={`mt-2 text-3xl font-bold tabular-nums ${destacado ? "text-brand-600" : "text-neutralCustom-800"}`}
      >
        {valor}
      </p>
      {detalle && (
        <p className={`mt-2 flex items-center gap-1 text-sm ${tono?.clase ?? "text-neutralCustom-500"}`}>
          {tono && (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tono.flecha} />
            </svg>
          )}
          {tono && <span className="sr-only">{tono.lectura}:</span>}
          {detalle}
        </p>
      )}
    </div>
  );
}
