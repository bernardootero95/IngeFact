import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

// Mapeo para títulos limpios en la interfaz
const tableTitles = {
  paises: "Países",
  departamentos: "Departamentos",
  municipios: "Municipios",
  monedas: "Monedas",
  formas_pago: "Formas de Pago",
  metodos_pago: "Métodos de Pago",
  tipos_organizacion: "Tipos de Organización",
  responsabilidades_fiscales: "Responsabilidades Fiscales",
  tributos: "Tributos / Impuestos",
  tipos_identificacion: "Tipos de Identificación",
  tipos_unidad: "Tipos de Unidad",
  conceptos_nota_credito: "Conceptos de Nota Crédito",
  conceptos_nota_debito: "Conceptos de Nota Débito",
};

export default function ReferenceDetail() {
  const { tableName } = useParams();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para el Modal CRUD Manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [estado, setEstado] = useState("activo");

  // Campos especiales alineados con la BD e indirectamente con Allegra
  const [deptCode, setDeptCode] = useState("");
  const [deptValue, setDeptValue] = useState("");
  const [valueNade, setValueNade] = useState("");
  const [modalError, setModalError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const isMunicipio = tableName === "municipios";
  const isNotaCredito = tableName === "conceptos_nota_credito";
  const title = tableTitles[tableName] || "Tabla de Referencia";

  useEffect(() => {
    if (tableName && !tableTitles[tableName]) {
      console.warn(
        `La tabla "${tableName}" no es una tabla de referencia válida.`,
      );
      navigate("/admin/references");
      return;
    }

    if (tableName) {
      fetchRecords();
      setSearchTerm("");
    }
  }, [tableName]);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = records.filter(
      (rec) =>
        rec.code?.toLowerCase().includes(lowerSearch) ||
        rec.value?.toLowerCase().includes(lowerSearch),
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .is("eliminado", null)
      .order("code", { ascending: true });

    if (error) {
      console.error("Error cargando referencias:", error.message);
    } else {
      setRecords(data || []);
      setFilteredRecords(data || []);
    }
    setLoading(false);
  };

  // Función de Sincronización Automática con Allegra a través de la Edge Function
  const handleSync = async () => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas sincronizar la tabla de ${title} con Allegra? Esto actualizará o insertará los códigos oficiales de la DIAN.`,
      )
    ) {
      return;
    }

    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "sync-reference-table",
        {
          body: { tableName: tableName },
        },
      );

      if (error || data?.error) {
        alert(`Error en la sincronización: ${error?.message || data?.error}`);
      } else {
        alert(
          `¡Sincronización exitosa! Se procesaron ${data.processed} registros para ${title}.`,
        );
        fetchRecords(); // Recargar la tabla con los datos frescos de Allegra
      }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al conectar con el servidor de sincronización.");
    } finally {
      setSyncLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setCode("");
    setValue("");
    setEstado("activo");
    setDeptCode("");
    setDeptValue("");
    setValueNade("");
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rec) => {
    setIsEditing(true);
    setCurrentId(rec.id);
    setCode(rec.code);
    setValue(rec.value);
    setEstado(rec.estado);
    if (isMunicipio) {
      setDeptCode(rec.department_code || "");
      setDeptValue(rec.department_value || "");
    }
    if (isNotaCredito) {
      setValueNade(rec.value_nade || "");
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setModalError(null);

    const payload = {
      code,
      value,
      estado,
      actualizado: new Date().toISOString(),
    };

    if (isMunicipio) {
      payload.department_code = deptCode;
      payload.department_value = deptValue;
    }
    if (isNotaCredito) {
      payload.value_nade = valueNade;
    }

    let error = null;

    if (isEditing) {
      const res = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", currentId);
      error = res.error;
    } else {
      const res = await supabase.from(tableName).insert([payload]);
      error = res.error;
    }

    if (error) {
      setModalError(error.message);
    } else {
      setIsModalOpen(false);
      fetchRecords();
    }
    setSubmitLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        {/* Barra superior */}
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/admin/references")}
              className="text-neutralCustom-500 hover:text-brand-600 transition-colors text-sm font-medium"
            >
              ← Volver al Hub
            </button>
            <h2 className="text-lg font-bold text-neutralCustom-800">
              {title}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {/* Botón de Sincronización */}
            <button
              onClick={handleSync}
              disabled={syncLoading || loading}
              className="flex items-center px-4 py-2 border border-brand-600 text-brand-600 hover:bg-brand-50 disabled:opacity-50 text-sm font-medium rounded-brand-md transition-all"
            >
              {syncLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-brand-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sincronizando...
                </>
              ) : (
                <>
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18"
                    />
                  </svg>
                  Sincronizar Allegra
                </>
              )}
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-400 text-white text-sm font-medium rounded-brand-md transition-colors"
            >
              Agregar Registro
            </button>
          </div>
        </header>

        {/* Panel de contenido */}
        <div className="p-8 flex-1 flex flex-col space-y-4 overflow-y-auto">
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400 shadow-sm"
            />
          </div>

          {loading ? (
            <p className="text-sm text-neutralCustom-500 font-medium animate-pulse">
              Cargando datos de la DIAN...
            </p>
          ) : (
            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm overflow-hidden flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutralCustom-50 border-b border-neutralCustom-100">
                      <th className="p-4 text-sm font-semibold text-neutralCustom-800 w-32">
                        Código
                      </th>
                      <th className="p-4 text-sm font-semibold text-neutralCustom-800">
                        Descripción / Valor
                      </th>
                      {isMunicipio && (
                        <>
                          <th className="p-4 text-sm font-semibold text-neutralCustom-800">
                            Cód. Depto
                          </th>
                          <th className="p-4 text-sm font-semibold text-neutralCustom-800">
                            Departamento
                          </th>
                        </>
                      )}
                      {isNotaCredito && (
                        <th className="p-4 text-sm font-semibold text-neutralCustom-800">
                          Valor NADE
                        </th>
                      )}
                      <th className="p-4 text-sm font-semibold text-neutralCustom-800 w-32">
                        Estado
                      </th>
                      <th className="p-4 text-sm font-semibold text-neutralCustom-800 w-24">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutralCustom-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isMunicipio ? 6 : isNotaCredito ? 5 : 4}
                          className="p-8 text-sm text-neutralCustom-500 text-center"
                        >
                          No se encontraron registros. Presiona "Sincronizar
                          Allegra" para cargar los datos oficiales.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec) => (
                        <tr
                          key={rec.id}
                          className="hover:bg-neutralCustom-50/50 transition-colors"
                        >
                          <td className="p-4 text-sm font-mono text-neutralCustom-800 font-bold">
                            {rec.code}
                          </td>
                          <td className="p-4 text-sm text-neutralCustom-700">
                            {rec.value}
                          </td>
                          {isMunicipio && (
                            <>
                              <td className="p-4 text-sm font-mono text-neutralCustom-500">
                                {rec.department_code}
                              </td>
                              <td className="p-4 text-sm text-neutralCustom-500">
                                {rec.department_value}
                              </td>
                            </>
                          )}
                          {isNotaCredito && (
                            <td className="p-4 text-sm text-neutralCustom-500">
                              {rec.value_nade}
                            </td>
                          )}
                          <td className="p-4 text-sm">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-bold rounded-brand-md uppercase ${
                                rec.estado === "activo"
                                  ? "bg-brand-50 text-brand-600"
                                  : "bg-red-50 text-fiscal-danger"
                              }`}
                            >
                              {rec.estado}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            <button
                              onClick={() => openEditModal(rec)}
                              className="text-brand-600 hover:text-brand-400 font-medium transition-colors"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal CRUD Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutralCustom-800/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg w-full max-w-md p-6 shadow-lg">
            <h3 className="text-lg font-bold text-neutralCustom-800 mb-4">
              {isEditing
                ? `Modificar en ${title}`
                : `Nuevo Registro en ${title}`}
            </h3>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm font-mono focus:outline-none focus:border-brand-400"
                    placeholder="Ej: 01"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                    Descripción / Valor
                  </label>
                  <input
                    type="text"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400"
                    placeholder="Descripción oficial"
                  />
                </div>
              </div>

              {isMunicipio && (
                <div className="grid grid-cols-3 gap-4 border-t border-neutralCustom-100 pt-3">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                      Cód. Depto
                    </label>
                    <input
                      type="text"
                      required
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value)}
                      className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm font-mono focus:outline-none focus:border-brand-400"
                      placeholder="Ej: 08"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                      Nombre Departamento
                    </label>
                    <input
                      type="text"
                      required
                      value={deptValue}
                      onChange={(e) => setDeptValue(e.target.value)}
                      className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400"
                      placeholder="Atlántico"
                    />
                  </div>
                </div>
              )}

              {isNotaCredito && (
                <div className="border-t border-neutralCustom-100 pt-3">
                  <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                    Valor NADE
                  </label>
                  <input
                    type="text"
                    required
                    value={valueNade}
                    onChange={(e) => setValueNade(e.target.value)}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400"
                    placeholder="Valor estandarizado NADE"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-neutralCustom-100 text-neutralCustom-500 text-sm font-medium rounded-brand-md hover:bg-neutralCustom-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-400 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                >
                  {submitLoading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
