import React, { useState, useEffect } from "react";
import { supabase } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Aquí luego conectaremos la consulta a Supabase filtrando por empresa_id
    const fetchCustomers = async () => {
      setLoading(true);
      // Simulación temporal
      setCustomers([]);
      setLoading(false);
    };

    fetchCustomers();
  }, []);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              Directorio de Clientes
            </h2>
            <p className="text-xs text-neutralCustom-500">
              Gestiona las empresas y personas a las que vas a facturar.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors flex items-center"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuevo Cliente
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-hidden">
            {/* Barra de búsqueda / Filtros */}
            <div className="p-4 border-b border-neutralCustom-100 bg-neutralCustom-50/50 flex justify-between items-center">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Buscar por NIT o nombre..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-2.5 text-neutralCustom-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Contenido de la Tabla */}
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando clientes...
              </div>
            ) : customers.length > 0 ? (
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Identificación</th>
                    <th className="px-6 py-3 font-semibold">
                      Razón Social / Nombre
                    </th>
                    <th className="px-6 py-3 font-semibold">Correo</th>
                    <th className="px-6 py-3 font-semibold">Teléfono</th>
                    <th className="px-6 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {/* Aquí irá el map de los clientes */}
                </tbody>
              </table>
            ) : (
              <div className="p-16 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-50 mb-4">
                  <svg
                    className="w-8 h-8 text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">
                  No tienes clientes registrados
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  Agrega tu primer cliente para poder generar facturas
                  electrónicas.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
                  >
                    Agregar Cliente
                  </button>
                  <button className="px-4 py-2 border border-neutralCustom-200 text-neutralCustom-600 hover:bg-neutralCustom-50 text-sm font-medium rounded-brand-md transition-colors">
                    Importar Excel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Aquí montaremos el modal en el próximo paso */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutralCustom-800/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-brand-lg">
            <h3 className="text-lg font-bold">
              Modal de Cliente (Próximo paso)
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 px-4 py-2 bg-neutralCustom-200 rounded-brand-md"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
