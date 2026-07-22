import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import logo from "../assets/logo 2.png";

export default function Sidebar() {
  const { profile, logout } = useAuthStore();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/admin/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-neutralCustom-800 text-white flex flex-col justify-between p-6 shrink-0">
      <div>
        <div className="mb-8 flex flex-col items-center text-center w-full">
          <img
            src={logo}
            alt="Logo IngeFact"
            className="h-14 w-auto object-contain mb-3 mx-auto"
          />
          <h1 className="text-2xl font-bold text-brand-400 tracking-tight">
            IngeFact
          </h1>
          <p className="text-sm text-white mt-1 font-medium truncate w-full">
            {profile?.nombre || "Usuario"}
          </p>
        </div>

        <nav className="space-y-2">
          <Link
            to="/admin/dashboard"
            className={`flex items-center px-4 py-2.5 rounded-brand-md text-sm font-medium transition-colors ${
              isActive("/admin/dashboard")
                ? "bg-brand-600 text-white"
                : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
            }`}
          >
            <svg
              className="w-5 h-5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
              />
            </svg>
            Inicio
          </Link>

          <Link
            to="/admin/companies"
            className={`flex items-center px-4 py-2.5 rounded-brand-md text-sm font-medium transition-colors ${
              isActive("/admin/companies")
                ? "bg-brand-600 text-white"
                : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
            }`}
          >
            <svg
              className="w-5 h-5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0V11m0 0h4m-4 0H5m4 0h4m-4 10V4m15 10H5"
              />
            </svg>
            Empresas
          </Link>

          <Link
            to="/admin/users"
            className={`flex items-center px-4 py-2.5 rounded-brand-md text-sm font-medium transition-colors ${
              isActive("/admin/users")
                ? "bg-brand-600 text-white"
                : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
            }`}
          >
            <svg
              className="w-5 h-5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Usuarios
          </Link>

          <Link
            to="/admin/references"
            className={`flex items-center px-4 py-2.5 rounded-brand-md text-sm font-medium transition-colors ${
              isActive("/admin/references")
                ? "bg-brand-600 text-white"
                : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
            }`}
          >
            <svg
              className="w-5 h-5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Tablas de Referencia
          </Link>
        </nav>
      </div>

      {/* Footer del Sidebar: Información de Cuenta y Cierre de Sesión */}
      <div className="border-t border-neutralCustom-500/20 pt-4 text-center">
        <div className="mb-4">
          <p className="text-xs text-neutralCustom-500 truncate w-full">
            {profile?.email}
          </p>
          <span className="inline-block mt-1 text-[10px] font-bold text-brand-400 bg-brand-50/10 px-2 py-0.5 rounded-brand-md uppercase">
            Administrador
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center px-4 py-2 bg-fiscal-danger/10 hover:bg-fiscal-danger text-fiscal-danger hover:text-white rounded-brand-md text-sm font-medium transition-all"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
