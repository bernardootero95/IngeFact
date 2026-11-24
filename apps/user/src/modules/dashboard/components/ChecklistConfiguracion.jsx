import { Link } from "react-router-dom";

function MarcaPaso({ hecho }) {
  if (hecho) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  return <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border-2 border-neutralCustom-300" />;
}

/**
 * Pasos para quedar listo para facturar (ver pasosConfiguracion). El padre
 * lo oculta cuando todos están hechos.
 */
export default function ChecklistConfiguracion({ pasos }) {
  const hechos = pasos.filter((p) => p.hecho).length;

  return (
    <section
      aria-labelledby="checklist-titulo"
      className="rounded-brand-lg border border-neutralCustom-100 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="checklist-titulo" className="text-base font-semibold text-neutralCustom-800">
          Deja tu empresa lista para facturar
        </h3>
        <p className="text-sm text-neutralCustom-600 tabular-nums">
          {hechos} de {pasos.length} pasos
        </p>
      </div>

      <ol className="mt-4 divide-y divide-neutralCustom-100">
        {pasos.map((paso) => (
          <li key={paso.id} className="flex min-h-[44px] items-center gap-3 py-3">
            <MarcaPaso hecho={paso.hecho} />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${paso.hecho ? "text-neutralCustom-500 line-through" : "text-neutralCustom-800"}`}
              >
                {paso.titulo}
                <span className="sr-only">{paso.hecho ? " (hecho)" : " (pendiente)"}</span>
              </p>
              {!paso.hecho && <p className="text-sm text-neutralCustom-500">{paso.ayuda}</p>}
            </div>
            {!paso.hecho && (
              <Link
                to={paso.ruta}
                className="shrink-0 rounded-brand-md px-2 py-1 text-sm font-medium text-brand-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                Ir<span className="sr-only"> a {paso.titulo.toLowerCase()}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
