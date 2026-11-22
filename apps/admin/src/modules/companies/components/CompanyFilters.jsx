import { ESTADOS_EMPRESA, ESTADOS_PLAN } from "../companyRows";

/**
 * Barra de filtros del listado de empresas: opciones por estado del plan (con
 * conteo), busqueda libre y filtro por estado de la empresa.
 */
export default function CompanyFilters({ filtros, onChange, conteo, total, onLimpiar, hayFiltros }) {
  const set = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });
  const opciones = [{ value: "", label: "Todas", cantidad: total }, ...ESTADOS_PLAN.map((p) => ({ ...p, cantidad: conteo[p.value] || 0 }))];

  return (
    <div className="border-b border-neutralCustom-100 bg-neutralCustom-50/50">
      <div role="group" aria-label="Filtrar por estado del plan" className="flex flex-wrap gap-2 px-4 pt-4">
        {opciones.map((p) => {
          const activa = filtros.plan === p.value;
          return (
            <button
              key={p.value || "todas"}
              type="button"
              aria-pressed={activa}
              onClick={() => set("plan")(p.value)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                activa
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-neutralCustom-200 bg-white text-neutralCustom-700 hover:border-neutralCustom-300 hover:bg-neutralCustom-50"
              }`}
            >
              {p.label}
              <span
                className={`min-w-5 rounded-full px-1.5 text-xs tabular-nums ${
                  activa ? "bg-white/20 text-white" : "bg-neutralCustom-100 text-neutralCustom-600"
                }`}
              >
                {p.cantidad}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative w-full sm:w-80">
          <input
            type="search"
            value={filtros.search}
            onChange={(e) => set("search")(e.target.value)}
            aria-label="Buscar por razón social, NIT o correo"
            placeholder="Buscar por razón social, NIT o correo..."
            className="field w-full pl-9 pr-4"
          />
          <svg
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutralCustom-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filtros.estado}
          aria-label="Filtrar por estado de la empresa"
          onChange={(e) => set("estado")(e.target.value)}
          className="field w-full sm:w-auto"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_EMPRESA.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hayFiltros && (
          <button
            type="button"
            onClick={onLimpiar}
            className="min-h-9 rounded-sm px-2 text-sm font-medium text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
