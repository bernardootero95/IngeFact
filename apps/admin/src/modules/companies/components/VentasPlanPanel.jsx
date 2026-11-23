import { useCallback, useEffect, useState } from "react";
import { facturarVentaEmpresa, listVentasEmpresa } from "@ingefact/core-api";
import { Button, RefreshIcon, Skeleton } from "@ingefact/ui";
import { ESTADO_FACTURA } from "../facturaPlan";
import { formatoFecha } from "../companyRows";

const formatCOP = (valor) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);

const SE_PUEDE_REINTENTAR = ["error", "sin_factura"];

/**
 * Historial de paquetes vendidos a la empresa con el estado de su factura
 * electronica automatica. Si una no salio, permite reintentarla (la API no
 * emite otra si ya salio).
 */
export default function VentasPlanPanel({ empresaId, onMensaje }) {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reintentando, setReintentando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVentas(await listVentasEmpresa(empresaId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reintentar = async (venta) => {
    setReintentando(venta.id);
    try {
      const actualizada = await facturarVentaEmpresa(empresaId, venta.id);
      setVentas((prev) => prev.map((v) => (v.id === actualizada.id ? actualizada : v)));
      const { estado, numero, error: motivo } = actualizada.factura;
      onMensaje?.(
        estado === "error"
          ? { message: `La factura no se emitió: ${motivo}`, type: "error" }
          : { message: numero ? `Factura ${numero} emitida.` : "Factura procesada.", type: "success" },
      );
    } catch (err) {
      onMensaje?.({ message: err.message, type: "error" });
    } finally {
      setReintentando(null);
    }
  };

  return (
    <section aria-labelledby="ventas-plan-titulo" className="mt-8">
      <div className="mb-3 border-b border-neutralCustom-100 pb-2">
        <h4 id="ventas-plan-titulo" className="text-sm font-semibold text-neutralCustom-800">
          Paquetes vendidos y facturas
        </h4>
        <p className="text-xs text-neutralCustom-500">Cada paquete nuevo se factura automáticamente de contado.</p>
      </div>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : error ? (
        <p role="alert" className="text-sm text-fiscal-danger">
          No se pudieron cargar las ventas: {error}
        </p>
      ) : ventas.length === 0 ? (
        <p className="text-sm text-neutralCustom-500">Aún no hay paquetes vendidos a esta empresa.</p>
      ) : (
        <ul className="divide-y divide-neutralCustom-100 rounded-brand-md border border-neutralCustom-100">
          {ventas.map((venta) => {
            const estado = ESTADO_FACTURA[venta.factura.estado] || ESTADO_FACTURA.sin_factura;
            return (
              <li key={venta.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutralCustom-800">
                    {venta.max_documentos.toLocaleString("es-CO")} documentos · {formatCOP(venta.precio)}
                  </p>
                  <p className="text-xs text-neutralCustom-500 tabular-nums">
                    Vigencia {formatoFecha(venta.fecha_inicio)} – {formatoFecha(venta.fecha_fin)}
                  </p>
                  {venta.factura.estado === "error" && venta.factura.error && (
                    <p className="mt-1 text-xs text-fiscal-danger">{venta.factura.error}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>
                    {venta.factura.numero ? `${estado.label} · ${venta.factura.numero}` : estado.label}
                  </span>
                  {SE_PUEDE_REINTENTAR.includes(venta.factura.estado) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={RefreshIcon}
                      loading={reintentando === venta.id}
                      disabled={reintentando !== null}
                      onClick={() => reintentar(venta)}
                    >
                      {venta.factura.estado === "error" ? "Reintentar" : "Facturar"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
