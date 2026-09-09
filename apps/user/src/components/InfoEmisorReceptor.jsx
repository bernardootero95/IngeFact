const nombreCatalogo = (catalogo, code) => catalogo.find((item) => item.code === code)?.value || code;

// Codigo DIAN de "responsabilidad de IVA" -- no viene de un catalogo
// sincronizado de Alegra, mismo mapa fijo que ya usa SeccionCliente.jsx y
// el generador de PDF del backend.
const REGIMEN_FISCAL_LABELS = { "48": "Responsable de IVA", "49": "No responsable de IVA" };
const nombreRegimenFiscal = (code) => (code ? REGIMEN_FISCAL_LABELS[code] || code : null);

// Codigo generico del catalogo responsabilidades_fiscales cuyo valor real
// es literalmente "No aplica - Otros" -- no aporta informacion, se omite en
// vez de mostrarlo (a diferencia de un codigo real como Gran contribuyente).
const CODIGO_RESPONSABILIDAD_FISCAL_NO_APLICA = "R-99-PN";
const nombreResponsabilidadFiscal = (catalogo, code) =>
  !code || code === CODIGO_RESPONSABILIDAD_FISCAL_NO_APLICA ? null : nombreCatalogo(catalogo, code);

function Fila({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutralCustom-500 shrink-0">{label}</dt>
      <dd className="font-medium text-neutralCustom-800 text-right">{value}</dd>
    </div>
  );
}

export function InfoEmisor({ empresa, tiposOrganizacion = [], responsabilidadesFiscales = [] }) {
  if (!empresa) return null;
  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <h3 className="text-sm font-semibold text-neutralCustom-800 mb-3">Emisor</h3>
      <dl className="text-sm space-y-2">
        <Fila label="Razón Social" value={empresa.razon_social} />
        <Fila label="NIT" value={`${empresa.numero_identificacion}-${empresa.digito_verificacion}`} />
        <Fila label="Dirección" value={empresa.direccion} />
        <Fila label="Teléfono" value={empresa.telefono} />
        <Fila label="Correo" value={empresa.correo_electronico} />
        <Fila label="Tipo de Organización" value={nombreCatalogo(tiposOrganizacion, empresa.tipo_organizacion)} />
        <Fila label="Régimen Fiscal" value={nombreRegimenFiscal(empresa.regimen_fiscal)} />
        <Fila
          label="Responsabilidad Fiscal"
          value={nombreResponsabilidadFiscal(responsabilidadesFiscales, empresa.regimen)}
        />
      </dl>
    </div>
  );
}

export function InfoReceptor({
  cliente,
  tiposIdentificacion = [],
  tiposOrganizacion = [],
  responsabilidadesFiscales = [],
  tributos = [],
}) {
  if (!cliente) return null;
  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <h3 className="text-sm font-semibold text-neutralCustom-800 mb-3">Cliente</h3>
      <dl className="text-sm space-y-2">
        <Fila label="Nombre" value={cliente.nombre} />
        <Fila
          label="Identificación"
          value={`${nombreCatalogo(tiposIdentificacion, cliente.tipo_identificacion)} ${cliente.numero_identificacion}`}
        />
        <Fila label="Correo" value={cliente.correo_electronico} />
        <Fila label="Teléfono" value={cliente.telefono} />
        <Fila label="Tipo de Organización" value={nombreCatalogo(tiposOrganizacion, cliente.tipo_organizacion)} />
        <Fila label="Régimen Fiscal" value={nombreRegimenFiscal(cliente.regimen_fiscal)} />
        <Fila
          label="Responsabilidad Fiscal"
          value={nombreResponsabilidadFiscal(responsabilidadesFiscales, cliente.regimen)}
        />
        <Fila
          label="Responsabilidad Tributaria"
          value={cliente.tributo ? nombreCatalogo(tributos, cliente.tributo) : null}
        />
      </dl>
    </div>
  );
}
