/**
 * Barra superior de un listado de documentos: busqueda por texto libre y
 * filtro por estado. `estados` es [{ value, label }] sin la opcion "Todos".
 */
export default function FiltrosListado({ search, onSearch, placeholder, estado, onEstado, estados }) {
  return (
    <div className="p-4 border-b border-neutralCustom-100 bg-neutralCustom-50/50 flex flex-wrap justify-between items-center gap-3">
      <div className="relative w-full sm:w-80">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label={placeholder}
          placeholder={placeholder}
          className="field w-full pl-9 pr-4"
        />
        <svg
          className="w-4 h-4 absolute left-3 top-2.5 text-neutralCustom-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <select value={estado} aria-label="Filtrar por estado" onChange={(e) => onEstado(e.target.value)} className="field">
        <option value="">Todos los estados</option>
        {estados.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
