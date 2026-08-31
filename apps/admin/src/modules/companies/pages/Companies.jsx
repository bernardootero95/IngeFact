import { useEffect, useState } from "react";
import { listEmpresas, sincronizarEmpresasAlegra } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import CompanyTable from "../components/CompanyTable";
import CompanyModal from "../components/CompanyModal";
import { SpinnerLoading, ToastAlert } from "@ingefact/ui";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(null);

  // Estados centralizados para notificaciones Toast
  const [toast, setToast] = useState({ message: null, type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await listEmpresas();
      setCompanies(data || []);
    } catch (err) {
      console.error("Error al obtener empresas:", err);
      showToast(`Error al cargar empresas: ${err.message}`, "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateClick = () => {
    setCurrentCompany(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (company) => {
    setCurrentCompany(company);
    setIsModalOpen(true);
  };

  const handleSyncAlegra = async () => {
    if (
      !window.confirm(
        "¿Estás seguro de que deseas sincronizar las empresas desde Alegra?",
      )
    )
      return;

    setSyncLoading(true);
    try {
      const data = await sincronizarEmpresasAlegra();
      showToast(
        `¡Sincronización exitosa! Se procesaron ${data.processed} empresas.`,
      );
      fetchCompanies();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
          <h2 className="text-lg font-bold text-neutralCustom-800">
            Empresas y Suscripciones (Tenants)
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSyncAlegra}
              disabled={syncLoading || loading}
              className="flex items-center px-4 py-2 border border-brand-600 text-brand-600 hover:bg-brand-50 disabled:opacity-50 text-sm font-medium rounded-brand-md transition-all"
            >
              {syncLoading ? (
                <SpinnerLoading text="Sincronizando..." />
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
                  Sincronizar Alegra
                </>
              )}
            </button>

            <button
              onClick={handleCreateClick}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-400 text-white text-sm font-medium rounded-brand-md transition-colors"
            >
              Aprovisionar Empresa
            </button>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto relative">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutralCustom-500">
              Gestión centralizada de cuentas de facturación, cuotas de
              documentos y vigencias.
            </h3>
          </div>

          {loading ? (
            <SpinnerLoading
              fullScreen={false}
              text="Cargando empresas del sistema..."
            />
          ) : (
            <CompanyTable
              companies={companies}
              loading={false}
              onEdit={handleEditClick}
            />
          )}
        </div>
      </main>

      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentCompany={currentCompany}
        onSaveSuccess={() => {
          fetchCompanies();
          showToast("Empresa gestionada y guardada correctamente.");
        }}
      />

      {/* Componente Global de Alertas Toast */}
      <ToastAlert
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />
    </div>
  );
}
