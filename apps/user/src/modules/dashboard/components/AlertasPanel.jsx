import { Link } from "react-router-dom";

const TONO = {
  critico: {
    contenedor: "border-fiscal-danger/30 bg-fiscal-danger/10",
    icono: "text-fiscal-danger",
    lectura: "Urgente",
    path: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  },
  aviso: {
    contenedor: "border-fiscal-warning/40 bg-fiscal-warning/10",
    icono: "text-amber-700",
    lectura: "Atención",
    path: "M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  info: {
    contenedor: "border-fiscal-info/30 bg-fiscal-info/10",
    icono: "text-fiscal-info",
    lectura: "Información",
    path: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
};

/** Lo que requiere acción del usuario (ver alertasDashboard). No se pinta si no hay nada. */
export default function AlertasPanel({ alertas }) {
  if (!alertas.length) return null;

  return (
    <section aria-labelledby="alertas-titulo" className="space-y-3">
      <h3 id="alertas-titulo" className="text-sm font-medium text-neutralCustom-500">
        Pendientes
      </h3>
      <ul className="space-y-2">
        {alertas.map((alerta) => {
          const tono = TONO[alerta.tono];
          return (
            <li
              key={alerta.id}
              className={`flex min-h-[44px] items-center gap-3 rounded-brand-lg border px-4 py-3 ${tono.contenedor}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`h-5 w-5 shrink-0 ${tono.icono}`}
                fill="none"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tono.path} />
              </svg>
              <p className="min-w-0 flex-1 text-sm text-neutralCustom-800">
                <span className="sr-only">{tono.lectura}: </span>
                {alerta.texto}
              </p>
              <Link
                to={alerta.ruta}
                className="shrink-0 rounded-brand-md px-2 py-1 text-sm font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                {alerta.accion}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
