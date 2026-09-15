import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCompra, anularCompra, deleteCompra } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_BADGE = {
  registrada: "bg-brand-50 text-brand-600",
  anulada: "bg-fiscal-danger/10 text-fiscal-danger",
};

const ESTADO_LABEL = { registrada: "Registrada", anulada: "Anulada" };

export default function PurchaseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [compra, setCompra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const cargarCompra = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setCompra(await getCompra(id));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarCompra();
  }, [cargarCompra]);

  const handleAnular = async () => {
    if (!window.confirm("¿Anular esta compra?")) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const actualizada = await anularCompra(id);
      setCompra(actualizada);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm("¿Eliminar esta compra? Esta acción no se puede deshacer.")) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await deleteCompra(id);
      navigate("/purchases");
    } catch (error) {
      setActionError(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <button onClick={() => navigate("/purchases")} className="text-brand-600 hover:underline font-medium">
                Compras
              </button>
              <span>/</span>
              <span>Detalle</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Detalle de Compra</h2>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</div>
            ) : loadError ? (
              <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {loadError}
              </div>
            ) : (
              <>
                {actionError && (
                  <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    {actionError}
                  </div>
                )}

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-neutralCustom-800">{compra.proveedor_nombre}</h3>
                      <p className="text-xs text-neutralCustom-500 mt-1">Fecha: {compra.fecha}</p>
                      {compra.numero_documento_proveedor && (
                        <p className="text-xs text-neutralCustom-500">
                          No. Documento del proveedor: {compra.numero_documento_proveedor}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        ESTADO_BADGE[compra.estado] || ESTADO_BADGE.registrada
                      }`}
                    >
                      {ESTADO_LABEL[compra.estado] || compra.estado}
                    </span>
                  </div>
                  {compra.observaciones && (
                    <p className="text-sm text-neutralCustom-600 border-t border-neutralCustom-100 pt-3">
                      {compra.observaciones}
                    </p>
                  )}
                </div>

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Productos y Servicios</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                      <thead>
                        <tr className="text-xs text-neutralCustom-500 uppercase border-b border-neutralCustom-200">
                          <th className="pb-2 font-semibold">Cod</th>
                          <th className="pb-2 font-semibold">Descripción</th>
                          <th className="pb-2 font-semibold text-right">Cant.</th>
                          <th className="pb-2 font-semibold text-right">Precio Unit.</th>
                          <th className="pb-2 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutralCustom-100">
                        {compra.lineas.map((linea) => (
                          <tr key={linea.id}>
                            <td className="py-2 pr-2 text-xs text-neutralCustom-500">{linea.codigo || "-"}</td>
                            <td className="py-2 pr-2">{linea.descripcion}</td>
                            <td className="py-2 pr-2 text-right">{linea.cantidad}</td>
                            <td className="py-2 pr-2 text-right">{formatCOP(linea.precio_unitario)}</td>
                            <td className="py-2 pr-2 text-right font-medium">{formatCOP(linea.total_linea)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end mt-6 pt-4 border-t border-neutralCustom-100">
                    <div className="w-56 space-y-1 text-sm">
                      <div className="flex justify-between text-neutralCustom-600">
                        <span>Subtotal</span>
                        <span>{formatCOP(compra.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-neutralCustom-600">
                        <span>Total impuestos</span>
                        <span>{formatCOP(compra.total_impuestos)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-100 pt-1">
                        <span>Total</span>
                        <span>{formatCOP(compra.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {compra.estado === "registrada" && (
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleEliminar}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-white border border-fiscal-danger text-fiscal-danger hover:bg-red-50 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                    >
                      Eliminar Compra
                    </button>
                    <button
                      type="button"
                      onClick={handleAnular}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                    >
                      Anular Compra
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
