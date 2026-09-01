import { useCallback, useEffect, useState } from "react";
import { getDashboardKpis } from "@ingefact/core-api";
import { useAuthStore } from "../../auth/store/authStore";
import Sidebar from "../../../components/Sidebar";
import { SpinnerLoading } from "@ingefact/ui";

export default function Dashboard() {
  const { profile } = useAuthStore();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchKpis = useCallback(() => {
    setLoading(true);
    setError(null);
    getDashboardKpis()
      .then(setKpis)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Resumen del Sistema
          </h2>
          <div className="text-sm text-neutralCustom-500">{profile?.email}</div>
        </header>

        <div className="p-8 space-y-8 flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border border-fiscal-danger rounded-brand-lg flex items-center justify-between">
              <p className="text-sm text-fiscal-danger">No se pudieron cargar las métricas: {error}</p>
              <button
                onClick={fetchKpis}
                className="px-3 py-1.5 bg-white border border-fiscal-danger text-fiscal-danger text-xs font-medium rounded-brand-md hover:bg-red-100 transition-colors shrink-0 ml-4"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <SpinnerLoading fullScreen={false} text="Cargando métricas..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
                <p className="text-sm font-medium text-neutralCustom-500">
                  Empresas activas
                </p>
                <p className="text-3xl font-bold text-neutralCustom-800 mt-2">
                  {kpis?.empresas_activas ?? 0}
                </p>
              </div>

              <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
                <p className="text-sm font-medium text-neutralCustom-500">
                  Documentos emitidos (Mes)
                </p>
                <p className="text-3xl font-bold text-neutralCustom-800 mt-2">
                  {kpis?.documentos_emitidos_mes ?? 0}
                </p>
              </div>

              <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
                <p className="text-sm font-medium text-neutralCustom-500">
                  Alertas críticas
                </p>
                <p className="text-3xl font-bold text-fiscal-danger mt-2">
                  {kpis?.empresas_con_error_alegra ?? 0}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg p-6 shadow-sm">
            <h3 className="text-base font-medium text-neutralCustom-800 mb-2">
              ¡Bienvenido a IngeFact!
            </h3>
            <p className="text-sm text-neutralCustom-500 leading-relaxed font-normal">
              Has iniciado sesión correctamente como{" "}
              <span className="text-brand-600 font-medium">Super Admin</span>.
              Desde este panel podrás gestionar el aprovisionamiento de las
              empresas clientes, configuraciones de resoluciones DIAN y
              asignación de paquetes documentales.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
