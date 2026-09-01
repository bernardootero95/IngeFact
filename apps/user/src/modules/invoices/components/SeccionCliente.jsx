import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { listClientes } from "@ingefact/core-api";

const nombreCatalogo = (catalogo, code) => catalogo.find((item) => item.code === code)?.value || code;

const ICONS = {
  usuario: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.142 3.358-6.5 7.5-6.5s7.5 2.358 7.5 6.5" />
    </>
  ),
  identificacion: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <line x1="7" y1="10" x2="11" y2="10" />
      <line x1="7" y1="14" x2="15" y2="14" />
    </>
  ),
  correo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  telefono: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </>
  ),
  edificio: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <line x1="8" y1="8" x2="8" y2="8.01" />
      <line x1="12" y1="8" x2="12" y2="8.01" />
      <line x1="16" y1="8" x2="16" y2="8.01" />
      <line x1="8" y1="13" x2="8" y2="13.01" />
      <line x1="12" y1="13" x2="12" y2="13.01" />
      <line x1="16" y1="13" x2="16" y2="13.01" />
    </>
  ),
  documento: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </>
  ),
};

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <svg
        className="w-4 h-4 text-brand-500 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[icon]}
      </svg>
      <span className="text-xs text-neutralCustom-700">
        <span className="font-semibold text-neutralCustom-800">{label}:</span> {value}
      </span>
    </div>
  );
}

export default function SeccionCliente({
  cliente,
  fecha,
  error,
  tiposOrganizacion,
  regimenes,
  tributos,
  onSelectCliente,
  onFechaChange,
}) {
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
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="cliente-buscar" className="block text-sm font-medium text-neutralCustom-800">
              Cliente <span className="text-fiscal-danger">*</span>
            </label>
            <Link
              to="/customers/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-brand-600 hover:text-brand-400"
            >
              + Nuevo Cliente
            </Link>
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InfoRow icon="usuario" label="Nombre" value={cliente.nombre} />
            <InfoRow icon="identificacion" label="Tipo de Identificación" value={cliente.tipo_identificacion} />
            <InfoRow icon="identificacion" label="Número de Identificación" value={cliente.numero_identificacion} />
            <InfoRow icon="correo" label="Correo" value={cliente.correo_electronico} />
            <InfoRow icon="telefono" label="Teléfono" value={cliente.telefono} />
            <InfoRow
              icon="edificio"
              label="Tipo de organización"
              value={nombreCatalogo(tiposOrganizacion, cliente.tipo_organizacion)}
            />
            <InfoRow icon="documento" label="Régimen" value={nombreCatalogo(regimenes, cliente.regimen)} />
            <InfoRow
              icon="documento"
              label="Responsabilidad tributaria"
              value={nombreCatalogo(tributos, cliente.tributo)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
