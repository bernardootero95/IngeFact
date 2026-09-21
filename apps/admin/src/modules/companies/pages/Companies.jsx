import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listEmpresas, sincronizarEmpresasAlegra } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import CompanyTable from "../components/CompanyTable";
import { SpinnerLoading, ToastAlert, Button, RefreshIcon, ConfirmPopover } from "@ingefact/ui";

export default function Companies() {
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  // Estados centralizados para notificaciones Toast
  const [toast, setToast] = useState({ message: null, type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (location.state?.successMessage) {
      showToast(location.state.successMessage, "success");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

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

  const handleSyncAlegra = async () => {
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
            <ConfirmPopover
              message="¿Estás seguro de que deseas sincronizar las empresas desde Alegra?"
              confirmLabel="Sincronizar"
              onConfirm={handleSyncAlegra}
            >
              {({ ask }) => (
                <Button
                  onClick={ask}
                  variant="outline"
                  icon={RefreshIcon}
                  loading={syncLoading}
                  disabled={loading}
                  title="Sincronizar con Alegra"
                >
                  Sincronizar
                </Button>
              )}
            </ConfirmPopover>

            <Button
              onClick={() => navigate("/admin/companies/new")}
              variant="primary"
            >
              Nueva empresa
            </Button>
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
              onEdit={(company) => navigate(`/admin/companies/${company.id}/edit`)}
            />
          )}
        </div>
      </main>

      {/* Componente Global de Alertas Toast */}
      <ToastAlert
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />
    </div>
  );
}
