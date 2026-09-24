import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listEmpleados, deleteEmpleado } from "@ingefact/core-api";
import {
  ToastAlert,
  Button,
  IconButton,
  PencilIcon,
  TrashIcon,
  TableSkeleton,
  ConfirmPopover,
  useTableView,
  SortableTh,
  Pagination,
} from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ message: null, type: "success" });
  const debounceRef = useRef(null);

  const fetchEmployees = useCallback(async (term) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listEmpleados(term || undefined);
      setEmployees(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees("");
  }, [fetchEmployees]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEmployees(value), 300);
  };

  const handleDelete = async (empleado) => {
    setDeletingId(empleado.id);
    try {
      await deleteEmpleado(empleado.id);
      setEmployees((prev) => prev.filter((e) => e.id !== empleado.id));
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const nombreCompleto = (e) => [e.primer_nombre, e.otros_nombres, e.primer_apellido, e.segundo_apellido].filter(Boolean).join(" ");

  const view = useTableView(employees);
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Directorio de Empleados</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">Gestiona a tus empleados para emitir Nómina Electrónica.</p>
          </div>
          <Button onClick={() => navigate("/employees/new")} variant="primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo empleado
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
                  placeholder="Buscar por documento o nombre..."
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
              <TableSkeleton columns={5} label="Cargando empleados..." />
            ) : loadError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-fiscal-danger mb-3">No se pudieron cargar los empleados: {loadError}</p>
                <Button onClick={() => fetchEmployees(search)} variant="danger">
                  Reintentar
                </Button>
              </div>
            ) : employees.length > 0 ? (
              <>
                <table className="w-full text-left text-sm text-neutralCustom-600">
                  <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                    <tr>
                      <SortableTh sortKey="numero_documento" sort={view.sort} onSort={view.toggleSort}>Documento</SortableTh>
                      <SortableTh sortKey="primer_nombre" sort={view.sort} onSort={view.toggleSort}>Nombre</SortableTh>
                      <SortableTh sortKey="sueldo" sort={view.sort} onSort={view.toggleSort}>Sueldo</SortableTh>
                      <SortableTh sortKey="estado" sort={view.sort} onSort={view.toggleSort}>Estado</SortableTh>
                      <th scope="col" className="px-6 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutralCustom-100">
                    {view.rows.map((e) => (
                      <tr key={e.id} className="hover:bg-neutralCustom-50 transition-colors">
                        <td className="px-6 py-4">{e.numero_documento}</td>
                        <td className="px-6 py-4 font-medium text-neutralCustom-800">{nombreCompleto(e)}</td>
                        <td className="px-6 py-4">
                          {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(e.sueldo)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-bold rounded-brand-md uppercase ${
                              e.estado === "activo" ? "bg-brand-50 text-brand-600" : "bg-red-50 text-fiscal-danger"
                            }`}
                          >
                            {e.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton title="Editar" onClick={() => navigate(`/employees/${e.id}/edit`)}>
                              <PencilIcon />
                            </IconButton>
                            <ConfirmPopover
                              message={`¿Eliminar a "${nombreCompleto(e)}" de tu directorio de empleados?`}
                              confirmLabel="Eliminar"
                              onConfirm={() => handleDelete(e)}
                            >
                              {({ ask }) => (
                                <IconButton title="Eliminar" variant="danger" onClick={ask} disabled={deletingId === e.id}>
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">
                  {search ? "No se encontraron empleados" : "No tienes empleados registrados"}
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  {search
                    ? "Prueba con otro nombre o número de documento."
                    : "Agrega tu primer empleado para poder emitirle Nómina Electrónica."}
                </p>
                {!search && (
                  <div className="flex justify-center space-x-3">
                    <Button onClick={() => navigate("/employees/new")} variant="primary">
                      Nuevo empleado
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
