import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listImpuestosEmpresa, deleteImpuestoEmpresa, listPublicReferenceTable } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";

export default function TaxesSettingsPage() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState([]);
  const [tributosCatalog, setTributosCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    try {
      const [taxesData, tributosData] = await Promise.all([
        listImpuestosEmpresa(),
        listPublicReferenceTable("tributos"),
      ]);
      setTaxes(taxesData);
      setTributosCatalog(tributosData);
    } catch (error) {
      console.error("Error al obtener impuestos de la empresa:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handleDelete = async (impuesto) => {
    if (!window.confirm(`¿Eliminar el preset "${impuesto.tributo} ${impuesto.tarifa}%"?`)) return;
    setDeletingId(impuesto.id);
    try {
      await deleteImpuestoEmpresa(impuesto.id);
      setTaxes((prev) => prev.filter((t) => t.id !== impuesto.id));
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const tributoNombre = (code) => tributosCatalog.find((t) => t.code === code)?.value || code;

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              Impuestos
            </h2>
            <p className="text-xs text-neutralCustom-500">
              Combinaciones de tributo y tarifa que podrás elegir al crear
              productos.
            </p>
          </div>
          <button
            onClick={() => navigate("/settings/taxes/new")}
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
            Nuevo Impuesto
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando impuestos...
              </div>
            ) : taxes.length > 0 ? (
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Tributo</th>
                    <th className="px-6 py-3 font-semibold">Tarifa</th>
                    <th className="px-6 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {taxes.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-neutralCustom-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">
                        {tributoNombre(t.tributo)} ({t.tributo})
                      </td>
                      <td className="px-6 py-4">{t.tarifa}%</td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button
                          onClick={() => navigate(`/settings/taxes/${t.id}/edit`)}
                          className="text-brand-600 hover:text-brand-400 text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={deletingId === t.id}
                          className="text-fiscal-danger hover:text-red-400 text-xs font-medium disabled:opacity-50"
                        >
                          {deletingId === t.id ? "Eliminando..." : "Eliminar"}
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
                  <button
                    onClick={() => navigate("/settings/taxes/new")}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
                  >
                    Agregar Impuesto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
