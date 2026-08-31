import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listReferenceTable, sincronizarReferenceTable } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import ReferenceModal from "../components/ReferenceModal";

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

  // Estados de datos
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Cantidad de registros por página

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);

  const isMunicipio = tableName === "municipios";
  const isNotaCredito = tableName === "conceptos_nota_credito";
  const title = tableTitles[tableName] || "Tabla de Referencia";

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await listReferenceTable(tableName);
      setRecords(data || []);
      setFilteredRecords(data || []);
    } catch (err) {
      console.error("Error cargando referencias:", err.message);
    }
    setLoading(false);
  };

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
      setCurrentPage(1); // Reiniciar página al cambiar de tabla
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
    setCurrentPage(1); // Si el usuario busca algo, lo devolvemos a la página 1
  }, [searchTerm, records]);

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
      const data = await sincronizarReferenceTable(tableName);
      alert(
        `¡Sincronización exitosa! Se procesaron ${data.processed} registros para ${title}.`,
      );
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert(`Error en la sincronización: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rec) => {
    setIsEditing(true);
    setCurrentRecord(rec);
    setIsModalOpen(true);
  };

  // --- LÓGICA DE PAGINACIÓN ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = filteredRecords.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
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

        <div className="p-8 flex-1 flex flex-col space-y-4 overflow-hidden">
          <div className="max-w-md shrink-0">
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
            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse relative">
                  <thead className="sticky top-0 bg-neutralCustom-50 z-10 shadow-sm border-b border-neutralCustom-100">
                    <tr>
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
                    {currentRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isMunicipio ? 6 : isNotaCredito ? 5 : 4}
                          className="p-8 text-sm text-neutralCustom-500 text-center"
                        >
                          No se encontraron registros.
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((rec) => (
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

              {/* Controles de Paginación UI */}
              {filteredRecords.length > 0 && (
                <div className="bg-neutralCustom-50 border-t border-neutralCustom-100 p-4 flex items-center justify-between shrink-0">
                  <span className="text-sm text-neutralCustom-500">
                    Mostrando{" "}
                    <span className="font-medium text-neutralCustom-800">
                      {indexOfFirstItem + 1}
                    </span>{" "}
                    a{" "}
                    <span className="font-medium text-neutralCustom-800">
                      {Math.min(indexOfLastItem, filteredRecords.length)}
                    </span>{" "}
                    de{" "}
                    <span className="font-medium text-neutralCustom-800">
                      {filteredRecords.length}
                    </span>{" "}
                    registros
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-neutralCustom-200 bg-white text-neutralCustom-700 rounded-brand-md text-sm font-medium hover:bg-neutralCustom-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="px-4 py-1.5 text-sm font-medium text-neutralCustom-800">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border border-neutralCustom-200 bg-white text-neutralCustom-700 rounded-brand-md text-sm font-medium hover:bg-neutralCustom-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ReferenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEditing={isEditing}
        currentRecord={currentRecord}
        tableName={tableName}
        title={title}
        isMunicipio={isMunicipio}
        isNotaCredito={isNotaCredito}
        onSaveSuccess={fetchRecords}
      />
    </div>
  );
}
