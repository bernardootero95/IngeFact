import { useState, useRef, useEffect } from "react";
import { listClientes } from "@ingefact/core-api";

export default function SeccionCliente({ cliente, fecha, error, onSelectCliente, onFechaChange }) {
  const [query, setQuery] = useState(cliente?.nombre || "");
  const [resultados, setResultados] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (cliente) onSelectCliente(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResultados([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const data = await listClientes(value);
        setResultados(data);
        setIsOpen(true);
      } finally {
        setBuscando(false);
      }
    }, 300);
  };

  const handleSelect = (cliente) => {
    onSelectCliente(cliente);
    setQuery(cliente.nombre);
    setIsOpen(false);
  };

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Cliente</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative" ref={containerRef}>
          <label htmlFor="cliente-buscar" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
            Cliente <span className="text-fiscal-danger">*</span>
          </label>
          <input
            type="text"
            id="cliente-buscar"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => resultados.length > 0 && setIsOpen(true)}
            placeholder="Buscar cliente por nombre o documento..."
            className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
              error ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
            }`}
          />
          {error && <p className="mt-1 text-xs text-fiscal-danger">{error}</p>}
          {isOpen && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-neutralCustom-200 rounded-brand-md shadow-lg">
              {buscando ? (
                <div className="px-3 py-2 text-sm text-neutralCustom-400">Buscando...</div>
              ) : resultados.length > 0 ? (
                resultados.map((cliente) => (
                  <button
                    type="button"
                    key={cliente.id}
                    onClick={() => handleSelect(cliente)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors"
                  >
                    {cliente.nombre} <span className="text-neutralCustom-400">· {cliente.numero_identificacion}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-neutralCustom-400">Sin resultados</div>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="fecha" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
            Fecha
          </label>
          <input
            type="date"
            id="fecha"
            value={fecha}
            onChange={(e) => onFechaChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
          />
        </div>
      </div>

      {cliente && (
        <div className="bg-brand-50 border border-brand-100 rounded-brand-md p-4 mt-4">
          <p className="text-sm font-medium text-neutralCustom-800 mb-2">Información del cliente</p>
          <div className="text-xs text-neutralCustom-600 space-y-1">
            <div>NIT: {cliente.numero_identificacion}</div>
            <div>Email: {cliente.correo_electronico}</div>
          </div>
        </div>
      )}
    </div>
  );
}
