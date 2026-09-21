import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listFacturasRecibidas } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import { Button } from "@ingefact/ui";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_BADGE = {
  ACCEPTED: "bg-brand-50 text-brand-600",
  ACCEPTED_WITH_OBSERVATIONS: "bg-fiscal-warning/10 text-fiscal-warning",
  REJECTED: "bg-fiscal-danger/10 text-fiscal-danger",
};

function EventoBadge({ tipoLabel, legalStatus }) {
  if (!tipoLabel) {
    return <span className="text-xs text-neutralCustom-400">Sin eventos registrados</span>;
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        ESTADO_BADGE[legalStatus] || "bg-neutralCustom-100 text-neutralCustom-600"
      }`}
    >
      {tipoLabel}
    </span>
  );
}

export default function ReceivedInvoicesListPage() {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setFacturas(await listFacturasRecibidas());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Facturas Recibidas</h2>
            <p className="text-xs text-neutralCustom-500">
              Registra las facturas de tus proveedores y sus eventos ante la DIAN.
            </p>
          </div>
          <Button
            onClick={() => navigate("/received-invoices/new")}
            variant="primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar
          </Button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando facturas recibidas...
              </div>
            ) : loadError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-fiscal-danger mb-3">No se pudieron cargar: {loadError}</p>
                <Button
                  onClick={fetchFacturas}
                  variant="danger"
                >
                  Reintentar
                </Button>
              </div>
            ) : facturas.length > 0 ? (
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Proveedor</th>
                    <th className="px-6 py-3 font-semibold">CUFE</th>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold">Último evento</th>
                    <th className="px-6 py-3 text-right font-semibold">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {facturas.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => navigate(`/received-invoices/${f.id}`)}
                      className="hover:bg-neutralCustom-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">{f.proveedor_nombre}</td>
                      <td className="px-6 py-4 font-mono text-xs text-neutralCustom-500">
                        {f.cufe.slice(0, 16)}…
                      </td>
                      <td className="px-6 py-4">{f.fecha}</td>
                      <td className="px-6 py-4">
                        <EventoBadge
                          tipoLabel={f.ultimo_evento_tipo_label}
                          legalStatus={f.ultimo_evento_legal_status}
                        />
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-neutralCustom-800">
                        {f.monto_total != null ? formatCOP(f.monto_total) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-16 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-50 mb-4">
                  <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">
                  No tienes facturas recibidas registradas
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  Registra el CUFE de una factura que te haya enviado un proveedor para poder confirmar su recibo
                  ante la DIAN.
                </p>
                <Button
                  onClick={() => navigate("/received-invoices/new")}
                  variant="primary"
                >
                  Registrar
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
