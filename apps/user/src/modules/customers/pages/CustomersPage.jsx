import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listClientes, deleteCliente } from "@ingefact/core-api";
import { ToastAlert } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ message: null, type: "success" });
  const debounceRef = useRef(null);

  const fetchCustomers = useCallback(async (term) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listClientes(term || undefined);
      setCustomers(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers("");
  }, [fetchCustomers]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCustomers(value), 300);
  };

  const handleDelete = async (cliente) => {
    if (!window.confirm(`¿Eliminar a "${cliente.nombre}" de tu directorio de clientes?`)) return;
    setDeletingId(cliente.id);
    try {
      await deleteCliente(cliente.id);
      setCustomers((prev) => prev.filter((c) => c.id !== cliente.id));
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

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
            onClick={() => navigate("/customers/new")}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors flex items-center shadow-sm"
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
            <div className="p-4 border-b border-neutralCustom-100 bg-neutralCustom-50/50 flex justify-between items-center">
              <div className="relative w-64">
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
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

            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando clientes...
              </div>
            ) : loadError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-fiscal-danger mb-3">
                  No se pudieron cargar los clientes: {loadError}
                </p>
                <button
                  onClick={() => fetchCustomers(search)}
                  className="px-4 py-2 border border-fiscal-danger text-fiscal-danger text-sm font-medium rounded-brand-md hover:bg-red-50 transition-colors"
                >
                  Reintentar
                </button>
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
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-neutralCustom-50 transition-colors"
                    >
                      <td className="px-6 py-4">{c.numero_identificacion}</td>
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">
                        {c.nombre}
                      </td>
                      <td className="px-6 py-4">{c.correo_electronico}</td>
                      <td className="px-6 py-4">{c.telefono || "-"}</td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button
                          onClick={() => navigate(`/customers/${c.id}/edit`)}
                          className="text-brand-600 hover:text-brand-400 text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="text-fiscal-danger hover:text-red-400 text-xs font-medium disabled:opacity-50"
                        >
                          {deletingId === c.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  ))}
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
                  {search ? "No se encontraron clientes" : "No tienes clientes registrados"}
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  {search
                    ? "Prueba con otro nombre o número de identificación."
                    : "Agrega tu primer cliente para poder generar facturas electrónicas."}
                </p>
                {!search && (
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => navigate("/customers/new")}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
                    >
                      Agregar Cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <ToastAlert
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />
    </div>
  );
}
