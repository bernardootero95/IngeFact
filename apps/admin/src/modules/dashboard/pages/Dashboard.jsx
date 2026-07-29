import React from "react";
import { useAuthStore } from "../../auth/store/authStore";
import Sidebar from "../../../components/Sidebar";

export default function Dashboard() {
  const { usuario } = useAuthStore();

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Resumen del Sistema
          </h2>
          <div className="text-sm text-neutralCustom-500">{usuario?.email}</div>
        </header>

        <div className="p-8 space-y-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
              <p className="text-sm font-medium text-neutralCustom-500">
                Empresas activas
              </p>
              <p className="text-3xl font-bold text-neutralCustom-800 mt-2">
                0
              </p>
            </div>

            <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
              <p className="text-sm font-medium text-neutralCustom-500">
                Documentos emitidos (Mes)
              </p>
              <p className="text-3xl font-bold text-neutralCustom-800 mt-2">
                0
              </p>
            </div>

            <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
              <p className="text-sm font-medium text-neutralCustom-500">
                Alertas críticas
              </p>
              <p className="text-3xl font-bold text-fiscal-danger mt-2">0</p>
            </div>
          </div>

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
