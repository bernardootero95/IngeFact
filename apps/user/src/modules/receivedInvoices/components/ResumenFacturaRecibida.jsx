import { formatCOP } from "../eventos";

function Dato({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-neutralCustom-500">{label}</dt>
      <dd className="text-sm font-medium text-neutralCustom-800">{children}</dd>
    </div>
  );
}

// Resumen (no detallado) de una factura recibida: sirve tanto para la vista
// previa por CUFE como para la cabecera del detalle.
export default function ResumenFacturaRecibida({ factura }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Dato label="Número de factura">{factura.numero || "-"}</Dato>
      <Dato label="Proveedor">
        {factura.proveedor_nombre}
        {factura.proveedor_nit && (
          <span className="block text-xs font-normal text-neutralCustom-500">NIT {factura.proveedor_nit}</span>
        )}
      </Dato>
      <Dato label="Fecha">{factura.fecha}</Dato>
      <Dato label="Vencimiento">{factura.fecha_vencimiento || "-"}</Dato>
      <Dato label="Forma de pago">{factura.forma_pago_label}</Dato>
      <Dato label="Valor total">{factura.total != null ? formatCOP(factura.total) : "-"}</Dato>
    </dl>
  );
}
