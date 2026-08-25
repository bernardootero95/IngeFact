import { useState, useEffect, useCallback } from "react";
import { listProductos, createProducto } from "@ingefact/core-api";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";
import Sidebar from "../../../components/Sidebar";
import ProductModal from "../components/ProductModal";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export default function ProductsPage() {
  const { empresaId, loading: loadingEmpresa } = useCurrentEmpresa();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const data = await listProductos(empresaId);
      setProducts(data);
    } catch (error) {
      console.error("Error al obtener productos:", error.message);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaId) fetchProducts();
  }, [empresaId, fetchProducts]);

  const handleSaveProduct = async (payload) => {
    const nuevoProducto = await createProducto({
      ...payload,
      empresa_id: empresaId,
    });
    setProducts((prev) => [nuevoProducto, ...prev]);
  };

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              Catálogo de Productos y Servicios
            </h2>
            <p className="text-xs text-neutralCustom-500">
              Ítems reutilizables para agilizar la creación de facturas.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
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
            Nuevo Producto
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutralCustom-100 bg-neutralCustom-50/50 flex justify-between items-center">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
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

            {loading || loadingEmpresa ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando productos...
              </div>
            ) : products.length > 0 ? (
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Código</th>
                    <th className="px-6 py-3 font-semibold">Nombre</th>
                    <th className="px-6 py-3 font-semibold">Tipo</th>
                    <th className="px-6 py-3 text-right font-semibold">
                      Precio
                    </th>
                    <th className="px-6 py-3 font-semibold">Impuesto</th>
                    <th className="px-6 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-neutralCustom-50 transition-colors"
                    >
                      <td className="px-6 py-4">{p.codigo || "-"}</td>
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">
                        {p.nombre}
                      </td>
                      <td className="px-6 py-4 capitalize">{p.tipo}</td>
                      <td className="px-6 py-4 text-right">
                        {formatCOP(p.precio)}
                      </td>
                      <td className="px-6 py-4">
                        {p.tributo ? `${p.tributo} · ${p.tarifa_impuesto}%` : "Excluido"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-brand-600 hover:text-brand-400 text-xs font-medium">
                          Editar
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">
                  No tienes productos registrados
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  Agrega tu primer producto o servicio para poder
                  seleccionarlo al facturar.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
                  >
                    Agregar Producto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
