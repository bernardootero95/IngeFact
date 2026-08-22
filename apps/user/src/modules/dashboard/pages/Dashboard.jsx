import { useEffect, useState } from "react";
import { supabase } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email);
    });
  }, []);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Resumen Operativo
          </h2>
          <div className="text-sm text-neutralCustom-500">{userEmail}</div>
        </header>

        <div className="p-8 space-y-8 flex-1 overflow-y-auto">
          {/* Tarjetas de Métricas (KPIs) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
              <p className="text-sm font-medium text-neutralCustom-500">
                Facturas emitidas (Mes)
              </p>
              <p className="text-3xl font-bold text-neutralCustom-800 mt-2">
                0
              </p>
            </div>

            <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
              <p className="text-sm font-medium text-neutralCustom-500">
                Clientes registrados
              </p>
              <p className="text-3xl font-bold text-neutralCustom-800 mt-2">
                0
              </p>
            </div>

            <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
              <p className="text-sm font-medium text-neutralCustom-500">
                Documentos disponibles
              </p>
              {/* Aquí luego conectaremos la cuota de la suscripción del tenant */}
              <p className="text-3xl font-bold text-brand-600 mt-2">
                Ilimitado
              </p>
            </div>
          </div>

          {/* Tarjeta de Información */}
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg p-6 shadow-sm">
            <h3 className="text-base font-medium text-neutralCustom-800 mb-2">
              ¡Bienvenido a tu entorno de facturación!
            </h3>
            <p className="text-sm text-neutralCustom-500 leading-relaxed font-normal">
              Has iniciado sesión correctamente. Desde este panel podrás
              gestionar tus catálogos, sucursales y emitir comprobantes
              electrónicos validados por la DIAN. Recuerda que para comenzar a
              facturar, primero debes registrar al menos una
              <span className="text-brand-600 font-medium"> Sucursal</span>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
