/**
 * Marcadores de carga: reservan el espacio del contenido para que la pagina no
 * salte cuando llegan los datos (antes era solo el texto "Cargando..."). Los
 * contenedores llevan role="status" con el texto solo para lectores de pantalla,
 * y la animacion se desactiva con prefers-reduced-motion.
 */
const WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-1/3"];

export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-brand-md bg-neutralCustom-100 animate-pulse motion-reduce:animate-none ${className}`}
    />
  );
}

/** Tabla de listado: fila de encabezado + `rows` filas con `columns` celdas. */
export function TableSkeleton({ rows = 5, columns = 4, label = "Cargando..." }) {
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="grid gap-6 px-6 py-3 bg-neutralCustom-50 border-b border-neutralCustom-100" style={grid}>
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} className="h-3 w-16" />
        ))}
      </div>
      <div className="divide-y divide-neutralCustom-100">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="grid gap-6 px-6 py-4" style={grid}>
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} className={`h-4 ${WIDTHS[(r + c) % WIDTHS.length]}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Formulario o detalle: pares etiqueta + campo en dos columnas. */
export function FormSkeleton({ fields = 6, label = "Cargando..." }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-6 p-2">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-[38px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
