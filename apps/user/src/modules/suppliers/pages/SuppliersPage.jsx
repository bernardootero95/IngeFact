import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listProveedores, deleteProveedor } from "@ingefact/core-api";
import { ToastAlert, Button, IconButton, PencilIcon, TrashIcon, TableSkeleton, ConfirmPopover, useTableView, SortableTh, Pagination } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ message: null, type: "success" });
  const debounceRef = useRef(null);

  const fetchSuppliers = useCallback(async (term) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listProveedores(term || undefined);
      setSuppliers(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers("");
  }, [fetchSuppliers]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuppliers(value), 300);
  };

  const handleDelete = async (proveedor) => {
    setDeletingId(proveedor.id);
    try {
      await deleteProveedor(proveedor.id);
      setSuppliers((prev) => prev.filter((p) => p.id !== proveedor.id));
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setDeletingId(null);
    }
  };


  const view = useTableView(suppliers);
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Directorio de Proveedores</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">Gestiona a quiénes les compras (vendedores para tus Documentos Soporte).</p>
          </div>
          <Button
            onClick={() => navigate("/suppliers/new")}
            variant="primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo proveedor
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-x-auto">
            <div className="p-4 border-b border-neutralCustom-100 bg-neutralCustom-50/50 flex justify-between items-center">
              <div className="relative w-64">
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Buscar por NIT o nombre..."
                  className="field w-full pl-9 pr-4"
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
              <TableSkeleton columns={5} label="Cargando proveedores..." />
            ) : loadError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-fiscal-danger mb-3">No se pudieron cargar los proveedores: {loadError}</p>
                <Button
                  onClick={() => fetchSuppliers(search)}
                  variant="danger"
                >
                  Reintentar
                </Button>
              </div>
            ) : suppliers.length > 0 ? (
              <>
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <SortableTh sortKey="numero_identificacion" sort={view.sort} onSort={view.toggleSort}>Identificación</SortableTh>
                    <SortableTh sortKey="nombre" sort={view.sort} onSort={view.toggleSort}>Razón Social / Nombre</SortableTh>
                    <SortableTh sortKey="correo_electronico" sort={view.sort} onSort={view.toggleSort}>Correo</SortableTh>
                    <SortableTh sortKey="telefono" sort={view.sort} onSort={view.toggleSort}>Teléfono</SortableTh>
                    <th scope="col" className="px-6 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {view.rows.map((p) => (
                    <tr key={p.id} className="hover:bg-neutralCustom-50 transition-colors">
                      <td className="px-6 py-4">{p.numero_identificacion}</td>
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">{p.nombre}</td>
                      <td className="px-6 py-4">{p.correo_electronico}</td>
                      <td className="px-6 py-4">{p.telefono || "-"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton title="Editar" onClick={() => navigate(`/suppliers/${p.id}/edit`)}>
                            <PencilIcon />
                          </IconButton>
                          <ConfirmPopover
                            message={`¿Eliminar a "${p.nombre}" de tu directorio de proveedores?`}
                            confirmLabel="Eliminar"
                            onConfirm={() => handleDelete(p)}
                          >
                            {({ ask }) => (
                              <IconButton
                                title="Eliminar"
                                variant="danger"
                                onClick={ask}
                                disabled={deletingId === p.id}
                              >
                                <TrashIcon />
                              </IconButton>
                            )}
                          </ConfirmPopover>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination {...view.pagination} />
            </>
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
                  {search ? "No se encontraron proveedores" : "No tienes proveedores registrados"}
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  {search
                    ? "Prueba con otro nombre o número de identificación."
                    : "Agrega tu primer proveedor para poder emitirle un Documento Soporte."}
                </p>
                {!search && (
                  <div className="flex justify-center space-x-3">
                    <Button
                      onClick={() => navigate("/suppliers/new")}
                      variant="primary"
                    >
                      Nuevo proveedor
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
