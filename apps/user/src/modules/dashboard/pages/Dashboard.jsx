import { useCallback, useEffect, useState } from "react";
import { getTenantDashboardKpis } from "@ingefact/core-api";
import { SpinnerLoading } from "@ingefact/ui";
import { useAuthStore } from "../../auth/store/authStore";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";
import Sidebar from "../../../components/Sidebar";

export default function Dashboard() {
  const { profile } = useAuthStore();
  const { empresa, loading: loadingEmpresa } = useCurrentEmpresa();
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

  const loading = loadingEmpresa || loadingKpis;
  const suscripcion = empresa?.suscripcion ?? null;
  const conectadoAlegra = Boolean(empresa?.id_alegra);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Resumen Operativo
          </h2>
          <div className="text-sm text-neutralCustom-500">{profile?.email}</div>
        </header>

        <div className="p-8 space-y-8 flex-1 overflow-y-auto">
          {loading ? (
            <SpinnerLoading fullScreen={false} text="Cargando métricas..." />
          ) : (
            <>
              {kpisError && (
                <div className="p-4 bg-red-50 border border-fiscal-danger rounded-brand-lg flex items-center justify-between">
                  <p className="text-sm text-fiscal-danger">
                    No se pudieron cargar las métricas: {kpisError}
                  </p>
                  <button
                    onClick={fetchKpis}
                    className="px-3 py-1.5 bg-white border border-fiscal-danger text-fiscal-danger text-xs font-medium rounded-brand-md hover:bg-red-100 transition-colors shrink-0 ml-4"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
                  <p className="text-sm font-medium text-neutralCustom-500">
                    Facturas emitidas (Mes)
                  </p>
                  <p className="text-3xl font-bold text-neutralCustom-800 mt-2">
                    {kpis?.facturas_emitidas_mes ?? 0}
                  </p>
                </div>

                <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
                  <p className="text-sm font-medium text-neutralCustom-500">
                    Clientes registrados
                  </p>
                  <p className="text-3xl font-bold text-neutralCustom-800 mt-2">
                    {kpis?.clientes_registrados ?? 0}
                  </p>
                </div>

                <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
                  <p className="text-sm font-medium text-neutralCustom-500">
                    Documentos disponibles
                  </p>
                  <p className="text-3xl font-bold text-brand-600 mt-2">
                    {suscripcion
                      ? `${suscripcion.max_documentos - suscripcion.documentos_usados}`
                      : "Sin plan"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutralCustom-500">
                      Conexión con Alegra
                    </p>
                    <p className="text-base font-medium text-neutralCustom-800 mt-1">
                      {conectadoAlegra ? "Conectada" : "Sin conectar"}
                    </p>
                  </div>
                  <span
                    className={`h-3 w-3 rounded-full ${conectadoAlegra ? "bg-brand-600" : "bg-fiscal-danger"}`}
                  />
                </div>

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutralCustom-500">
                      Resolución DIAN
                    </p>
                    <p className="text-base font-medium text-neutralCustom-800 mt-1">
                      {kpis?.resolucion_configurada ? "Configurada" : "No configurada"}
                    </p>
                  </div>
                  <span
                    className={`h-3 w-3 rounded-full ${kpis?.resolucion_configurada ? "bg-brand-600" : "bg-fiscal-danger"}`}
                  />
                </div>
              </div>

              <div className="bg-white border border-neutralCustom-100 rounded-brand-lg p-6 shadow-sm">
                <h3 className="text-base font-medium text-neutralCustom-800 mb-2">
                  ¡Bienvenido a tu entorno de facturación!
                </h3>
                <p className="text-sm text-neutralCustom-500 leading-relaxed font-normal">
                  Has iniciado sesión correctamente. Desde este panel podrás
                  gestionar tus clientes, tu catálogo de productos y emitir
                  comprobantes electrónicos validados por la DIAN.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
