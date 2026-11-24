import { useCallback, useEffect, useState } from "react";
import { getTenantDashboardKpis } from "@ingefact/core-api";
import { SpinnerLoading, Button } from "@ingefact/ui";
import { useAuthStore } from "../../auth/store/authStore";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";
import SinCupoBanner from "../../plan/components/SinCupoBanner";
import PorVencerBanner from "../../plan/components/PorVencerBanner";
import { ESTADO_PLAN, alertasPorVencer, estadoPlanDe } from "../../plan/planEstado";
import KpiCard from "../components/KpiCard";
import ConsumoPlanCard from "../components/ConsumoPlanCard";
import AccesosRapidos from "../components/AccesosRapidos";
import ChecklistConfiguracion from "../components/ChecklistConfiguracion";
import {
  configuracionCompleta,
  formatoCOP,
  nombreMesAnterior,
  pasosConfiguracion,
  textoVariacion,
  variacion,
} from "../dashboardResumen";

export default function Dashboard() {
  const { profile } = useAuthStore();
  const { empresa, loading: loadingEmpresa, refetch: refetchEmpresa } = useCurrentEmpresa();
  const [kpis, setKpis] = useState(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [kpisError, setKpisError] = useState(null);

  const fetchKpis = useCallback(() => {
    setLoadingKpis(true);
    setKpisError(null);
    getTenantDashboardKpis()
      .then(setKpis)
      .catch((err) => setKpisError(err.message))
      .finally(() => setLoadingKpis(false));
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // La empresa del contexto se carga una sola vez por sesión; sin esto
  // "Documentos disponibles" no reflejaba lo emitido después (facturas,
  // notas, eventos...) hasta recargar la página.
  useEffect(() => {
    refetchEmpresa().catch(() => {});
  }, [refetchEmpresa]);

  const loading = loadingEmpresa || loadingKpis;
  const alertasPlan = alertasPorVencer(empresa);
  const pasos = pasosConfiguracion(empresa, kpis);
  const mes = kpis?.facturacion_mes;
  const anterior = kpis?.facturacion_mes_anterior;
  const variacionTotal = variacion(mes?.total ?? 0, anterior?.total ?? 0);
  const variacionCantidad = variacion(mes?.cantidad ?? 0, anterior?.cantidad ?? 0);
  const mesAnterior = nombreMesAnterior();
  const detalleVariacion = (v) =>
    v
      ? { detalle: textoVariacion(v, mesAnterior), tendencia: v.tendencia }
      : { detalle: anterior ? `Sin facturas en ${mesAnterior}` : null };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="relative flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Resumen Operativo
          </h2>
          <div className="text-sm text-neutralCustom-500">{profile?.email}</div>
        </header>

        <div className="p-4 md:p-8 space-y-8 flex-1 overflow-y-auto">
          {loading ? (
            <SpinnerLoading fullScreen={false} text="Cargando métricas..." />
          ) : (
            <>
              {estadoPlanDe(empresa) === ESTADO_PLAN.SIN_CUPO && <SinCupoBanner empresa={empresa} />}
              {alertasPlan && <PorVencerBanner empresa={empresa} alertas={alertasPlan} />}

              {kpisError && (
                <div className="p-4 bg-red-50 border border-fiscal-danger rounded-brand-lg flex items-center justify-between">
                  <p className="text-sm text-fiscal-danger">
                    No se pudieron cargar las métricas: {kpisError}
                  </p>
                  <Button
                    onClick={fetchKpis}
                    variant="danger"
                    size="sm"
                    className="shrink-0 ml-4"
                  >
                    Reintentar
                  </Button>
                </div>
              )}

              {kpis && !configuracionCompleta(pasos) && <ChecklistConfiguracion pasos={pasos} />}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <KpiCard
                  titulo="Facturado este mes"
                  valor={formatoCOP(mes?.total)}
                  destacado
                  {...detalleVariacion(variacionTotal)}
                />
                <KpiCard
                  titulo="Facturas aceptadas este mes"
                  valor={(mes?.cantidad ?? 0).toLocaleString("es-CO")}
                  {...detalleVariacion(variacionCantidad)}
                />
                <KpiCard
                  titulo="Clientes registrados"
                  valor={(kpis?.clientes_registrados ?? 0).toLocaleString("es-CO")}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <ConsumoPlanCard empresa={empresa} />
                <div className="lg:col-span-2">
                  <AccesosRapidos />
                </div>
              </div>
            </>
          )}
        </div>
        <Footer />
      </main>
    </div>
  );
}
