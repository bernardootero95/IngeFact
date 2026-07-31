import React from "react";
import { supabase } from "@ingefact/core-api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutralCustom-50 flex flex-col">
      <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
        <h1 className="text-lg font-bold text-brand-600">
          Mi Empresa - Panel de Control
        </h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-neutralCustom-600 hover:text-fiscal-danger transition-colors"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-brand-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-neutralCustom-800 mb-2">
            ¡Bienvenido a tu entorno de facturación!
          </h2>
          <p className="text-neutralCustom-500">
            Tu cuenta ha sido aprovisionada correctamente y el RLS te aísla de
            otros tenants.
          </p>
        </div>
      </main>
    </div>
  );
}
