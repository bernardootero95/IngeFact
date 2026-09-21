import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listReferenceTable, sincronizarReferenceTable } from "@ingefact/core-api";
import { ToastAlert, Button, RefreshIcon, ArrowLeftIcon } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import { tableTitles } from "../tableTitles";

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

  const [toast, setToast] = useState({ message: null, type: "success" });

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
      setToast({ message: `Error al cargar registros: ${err.message}`, type: "error" });
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
      setToast({
        message: `¡Sincronización exitosa! Se procesaron ${data.processed} registros para ${title}.`,
        type: "success",
      });
      fetchRecords();
    } catch (err) {
      setToast({ message: `Error en la sincronización: ${err.message}`, type: "error" });
    } finally {
      setSyncLoading(false);
    }
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
            <Button
              onClick={() => navigate("/admin/references")}
              variant="ghost"
              icon={ArrowLeftIcon}
              title="Volver al hub de referencias"
            >
              Volver
            </Button>
            <h2 className="text-lg font-bold text-neutralCustom-800">
              {title}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={handleSync}
              variant="outline"
              icon={RefreshIcon}
              loading={syncLoading}
              disabled={loading}
              title="Sincronizar con Alegra"
            >
              Sincronizar
            </Button>

            <Button
              onClick={() => navigate(`/admin/references/${tableName}/new`)}
              variant="primary"
            >
              Nuevo registro
            </Button>
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col space-y-4 overflow-hidden">
          <div className="max-w-md shrink-0">
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field w-full shadow-sm"
            />
          </div>

          {loading ? (
            <p className="text-sm text-neutralCustom-500 font-medium animate-pulse">
              Cargando datos de la DIAN...
            </p>
          ) : (
            <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col flex-1 overflow-x-auto">
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
                            <Button
                              onClick={() =>
                                navigate(`/admin/references/${tableName}/${rec.id}/edit`, { state: { record: rec } })
                              }
                              variant="link"
                            >
                              Editar
                            </Button>
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
                    <Button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      size="sm"
                    >
                      Anterior
                    </Button>
                    <span className="px-4 py-1.5 text-sm font-medium text-neutralCustom-800">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      size="sm"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
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
