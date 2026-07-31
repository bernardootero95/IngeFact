import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@ingefact/core-api";
import logo from "../assets/logo.png"; // Asegúrate de que el nombre del logo coincida

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      name: "Inicio",
      path: "/dashboard",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
        />
      ),
    },
    {
      name: "Facturas",
      path: "/invoices",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      ),
    },
    {
      name: "Clientes",
      path: "/customers",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      ),
    },
    {
      name: "Catálogo",
      path: "/products",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      ),
    },
    {
      name: "Sucursales",
      path: "/branches",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      ),
    },
  ];

  return (
    <aside className="w-64 bg-neutralCustom-800 text-white flex flex-col justify-between p-6 shrink-0 h-screen overflow-y-auto">
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
            Mi Empresa
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-2.5 rounded-brand-md text-sm font-medium transition-colors ${
                isActive(item.path)
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
                {item.icon}
              </svg>
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-neutralCustom-500/20 pt-4 text-center mt-8">
        <div className="mb-4">
          <p className="text-xs text-neutralCustom-500 truncate w-full">
            {userEmail || "Cargando..."}
          </p>
          <span className="inline-block mt-1 text-[10px] font-bold text-brand-400 bg-brand-50/10 px-2 py-0.5 rounded-brand-md uppercase">
            Facturador
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 bg-fiscal-danger/10 hover:bg-fiscal-danger text-fiscal-danger hover:text-white rounded-brand-md text-sm font-medium transition-all"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
