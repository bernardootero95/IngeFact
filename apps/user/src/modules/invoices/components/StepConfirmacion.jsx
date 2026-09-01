import { useNavigate } from "react-router-dom";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_INFO = {
  enviada: { icon: "⏳", label: "Enviada", classes: "bg-fiscal-info/10 text-fiscal-info" },
  aceptada: { icon: "✅", label: "Aceptada", classes: "bg-brand-50 text-brand-600" },
  rechazada: { icon: "❌", label: "Rechazada", classes: "bg-fiscal-danger/10 text-fiscal-danger" },
};

export default function StepConfirmacion({ factura, clienteNombre, onNuevaFactura }) {
  const navigate = useNavigate();
  const estadoInfo = ESTADO_INFO[factura.estado] || ESTADO_INFO.enviada;

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-8 max-w-xl mx-auto text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-fiscal-info/10 mb-4 text-3xl">
        {estadoInfo.icon}
      </div>
      <h3 className="text-lg font-bold text-neutralCustom-800 mb-1">
        {factura.estado === "rechazada" ? "La DIAN rechazó la factura" : "Factura enviada a la DIAN"}
      </h3>
      <p className="text-sm text-neutralCustom-500 mb-6">
        {factura.estado === "rechazada" ? factura.razon_rechazo : `Número asignado: ${factura.numero_completo}`}
      </p>

      <div className="text-left bg-neutralCustom-50 rounded-brand-md p-4 text-sm space-y-1 mb-6">
        <div className="flex justify-between">
          <span className="text-neutralCustom-500">Número</span>
          <span className="font-medium text-neutralCustom-800">{factura.numero_completo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutralCustom-500">Cliente</span>
          <span className="font-medium text-neutralCustom-800">{clienteNombre}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutralCustom-500">Total</span>
          <span className="font-medium text-neutralCustom-800">{formatCOP(factura.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutralCustom-500">Estado</span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${estadoInfo.classes}`}
          >
            {estadoInfo.icon} {estadoInfo.label}
          </span>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => navigate("/invoices")}
          className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors"
        >
          Ir a Facturas
        </button>
        <button
          type="button"
          onClick={onNuevaFactura}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors shadow-sm"
        >
          Crear Otra Factura
        </button>
      </div>
    </div>
  );
}
