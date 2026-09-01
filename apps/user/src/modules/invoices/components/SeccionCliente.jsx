import { SearchableSelect } from "@ingefact/ui";

const nombreCatalogo = (catalogo, code) => catalogo.find((item) => item.code === code)?.value || code;

const REGIMEN_FISCAL_LABELS = { "48": "Responsable de IVA", "49": "No responsable de IVA" };
const nombreRegimenFiscal = (code) => (code ? REGIMEN_FISCAL_LABELS[code] || code : null);

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
  clientes,
  fecha,
  error,
  tiposOrganizacion,
  regimenes,
  tributos,
  tiposIdentificacion,
  onSelectCliente,
  onFechaChange,
  onCrearCliente,
}) {
  const clienteOptions = clientes.map((c) => ({ code: c.id, value: `${c.nombre} (${c.numero_identificacion})` }));

  const handleChange = (clienteId) => {
    onSelectCliente(clientes.find((c) => c.id === clienteId) || null);
  };

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Cliente</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="cliente-select" className="block text-sm font-medium text-neutralCustom-800">
              Cliente <span className="text-fiscal-danger">*</span>
            </label>
            <button
              type="button"
              onClick={onCrearCliente}
              className="text-xs font-medium text-brand-600 hover:text-brand-400"
            >
              + Nuevo Cliente
            </button>
          </div>
          <SearchableSelect
            id="cliente-select"
            options={clienteOptions}
            value={cliente?.id || ""}
            onChange={handleChange}
            placeholder="Selecciona un cliente..."
            error={!!error}
            formatOption={(opt) => opt.value}
          />
          {error && <p className="mt-1 text-xs text-fiscal-danger">{error}</p>}
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
            <InfoRow
              icon="identificacion"
              label="Tipo de Identificación"
              value={nombreCatalogo(tiposIdentificacion, cliente.tipo_identificacion)}
            />
            <InfoRow icon="identificacion" label="Número de Identificación" value={cliente.numero_identificacion} />
            <InfoRow icon="correo" label="Correo" value={cliente.correo_electronico} />
            <InfoRow icon="telefono" label="Teléfono" value={cliente.telefono} />
            <InfoRow
              icon="edificio"
              label="Tipo de organización"
              value={nombreCatalogo(tiposOrganizacion, cliente.tipo_organizacion)}
            />
            <InfoRow icon="documento" label="Régimen Fiscal" value={nombreRegimenFiscal(cliente.regimen_fiscal)} />
            <InfoRow
              icon="documento"
              label="Responsabilidad Fiscal"
              value={nombreCatalogo(regimenes, cliente.regimen)}
            />
            <InfoRow
              icon="documento"
              label="Responsabilidad Tributaria"
              value={cliente.tributo ? nombreCatalogo(tributos, cliente.tributo) : "Sin responsabilidad tributaria"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
