import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listCompras } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADOS = [
  { value: "", label: "Todos los estados" },
  { value: "registrada", label: "Registrada" },
  { value: "anulada", label: "Anulada" },
];

const ESTADO_BADGE = {
  registrada: "bg-brand-50 text-brand-600",
  anulada: "bg-fiscal-danger/10 text-fiscal-danger",
};

const ESTADO_LABEL = { registrada: "Registrada", anulada: "Anulada" };

export default function PurchasesListPage() {
  const navigate = useNavigate();
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const debounceRef = useRef(null);

  const fetchCompras = useCallback(async (estadoFiltro) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listCompras({ estado: estadoFiltro || undefined });
      setCompras(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompras(estado);
  }, [fetchCompras, estado]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCompras(estado), 300);
  };

  const comprasFiltradas = search.trim()
    ? compras.filter((c) => c.proveedor_nombre.toLowerCase().includes(search.trim().toLowerCase()))
    : compras;

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Compras</h2>
            <p className="text-xs text-neutralCustom-500">Registra y consulta tus compras a proveedores.</p>
          </div>
          <button
            onClick={() => navigate("/purchases/new")}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors flex items-center shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Compra
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutralCustom-100 bg-neutralCustom-50/50 flex justify-between items-center gap-3">
              <div className="relative w-64">
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Buscar por proveedor..."
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
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
              >
                {ESTADOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando compras...
              </div>
            ) : loadError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-fiscal-danger mb-3">No se pudieron cargar las compras: {loadError}</p>
                <button
                  onClick={() => fetchCompras(estado)}
                  className="px-4 py-2 border border-fiscal-danger text-fiscal-danger text-sm font-medium rounded-brand-md hover:bg-red-50 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : comprasFiltradas.length > 0 ? (
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Proveedor</th>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold">No. Documento</th>
                    <th className="px-6 py-3 font-semibold">Estado</th>
                    <th className="px-6 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {comprasFiltradas.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/purchases/${c.id}`)}
                      className="hover:bg-neutralCustom-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">{c.proveedor_nombre}</td>
                      <td className="px-6 py-4">{c.fecha}</td>
                      <td className="px-6 py-4">{c.numero_documento_proveedor || "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            ESTADO_BADGE[c.estado] || ESTADO_BADGE.registrada
                          }`}
                        >
                          {ESTADO_LABEL[c.estado] || c.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-neutralCustom-800">{formatCOP(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-16 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-50 mb-4">
                  <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">
                  {search || estado ? "No se encontraron compras" : "No tienes compras registradas"}
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  {search || estado ? "Prueba con otro filtro." : "Registra tu primera compra a un proveedor."}
                </p>
                {!search && !estado && (
                  <button
                    onClick={() => navigate("/purchases/new")}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
                  >
                    Nueva Compra
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
