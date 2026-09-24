import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listImpuestosEmpresa, deleteImpuestoEmpresa, listPublicReferenceTable } from "@ingefact/core-api";
import { ToastAlert, Button, IconButton, PencilIcon, TrashIcon, TableSkeleton, ConfirmPopover, useTableView, SortableTh, Pagination } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";

export default function TaxesSettingsPage() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState([]);
  const [tributosCatalog, setTributosCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [taxesData, tributosData] = await Promise.all([
        listImpuestosEmpresa(),
        listPublicReferenceTable("tributos"),
      ]);
      setTaxes(taxesData);
      setTributosCatalog(tributosData);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handleDelete = async (impuesto) => {
    setDeletingId(impuesto.id);
    try {
      await deleteImpuestoEmpresa(impuesto.id);
      setTaxes((prev) => prev.filter((t) => t.id !== impuesto.id));
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const tributoNombre = (code) => tributosCatalog.find((t) => t.code === code)?.value || code;


  const view = useTableView(taxes);
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              Impuestos
            </h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              Combinaciones de tributo y tarifa que podrás elegir al crear
              productos.
            </p>
          </div>
          <Button
            onClick={() => navigate("/settings/taxes/new")}
            variant="primary"
          >
            <svg
              className="w-4 h-4"
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
            Nuevo impuesto
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-x-auto">
            {loading ? (
              <TableSkeleton columns={3} label="Cargando impuestos..." />
            ) : loadError ? (
              <div className="p-12 text-center">
                <p role="alert" className="text-sm text-fiscal-danger mb-3">
                  No se pudieron cargar los impuestos: {loadError}
                </p>
                <Button
                  onClick={fetchTaxes}
                  variant="danger"
                >
                  Reintentar
                </Button>
              </div>
            ) : taxes.length > 0 ? (
              <>
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <SortableTh sortKey="tributo" sort={view.sort} onSort={view.toggleSort}>Tributo</SortableTh>
                    <SortableTh sortKey="tarifa" sort={view.sort} onSort={view.toggleSort}>Tarifa</SortableTh>
                    <th scope="col" className="px-6 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {view.rows.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-neutralCustom-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">
                        {tributoNombre(t.tributo)} ({t.tributo})
                      </td>
                      <td className="px-6 py-4">{t.tarifa}%</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton title="Editar" onClick={() => navigate(`/settings/taxes/${t.id}/edit`)}>
                            <PencilIcon />
                          </IconButton>
                          <ConfirmPopover
                            message={`¿Eliminar el preset "${t.tributo} ${t.tarifa}%"?`}
                            confirmLabel="Eliminar"
                            onConfirm={() => handleDelete(t)}
                          >
                            {({ ask }) => (
                              <IconButton
                                title="Eliminar"
                                variant="danger"
                                onClick={ask}
                                disabled={deletingId === t.id}
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
                      d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">
                  No tienes impuestos configurados
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  Crea las combinaciones de tributo y tarifa que usas (ej. IVA
                  19%) para poder asignarlas a tus productos.
                </p>
                <div className="flex justify-center space-x-3">
                  <Button
                    onClick={() => navigate("/settings/taxes/new")}
                    variant="primary"
                  >
                    Nuevo impuesto
                  </Button>
                </div>
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
