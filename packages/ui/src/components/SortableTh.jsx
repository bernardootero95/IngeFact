/**
 * Encabezado de columna ordenable. El boton interno permite ordenar con teclado
 * y `aria-sort` anuncia el estado a lectores de pantalla. Hereda tamano y
 * mayusculas del <thead>.
 */
function SortIcon({ dir }) {
  return (
    <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M6 1.5L9.5 5h-7z" className={dir === "asc" ? "opacity-100" : "opacity-30"} />
      <path d="M6 10.5L2.5 7h7z" className={dir === "desc" ? "opacity-100" : "opacity-30"} />
    </svg>
  );
}

export default function SortableTh({ sortKey, sort, onSort, align = "left", children }) {
  const dir = sort?.key === sortKey ? sort.dir : null;
  const ariaSort = dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none";
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`px-6 py-3 font-semibold ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded-sm uppercase transition-colors hover:text-neutralCustom-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${dir ? "text-neutralCustom-800" : ""}`}
      >
        {children}
        <SortIcon dir={dir} />
      </button>
    </th>
  );
}
