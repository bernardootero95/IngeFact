import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listEmpresas, sincronizarEmpresasAlegra } from "@ingefact/core-api";
import { Button, ConfirmPopover, PlusIcon, RefreshIcon, TableSkeleton, ToastAlert } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";
import CompanyFilters from "../components/CompanyFilters";
import CompanyTable from "../components/CompanyTable";
import { aFilaEmpresa, contarPorPlan, filtrarEmpresas, hoyIso } from "../companyRows";

const FILTROS_VACIOS = { search: "", plan: "", estado: "" };

export default function Companies() {
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const showToast = (message, type = "success") => setToast({ message, type });

  useEffect(() => {
    if (location.state?.successMessage) {
      setToast({ message: location.state.successMessage, type: location.state.toastType || "success" });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setCompanies((await listEmpresas()) || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filas = useMemo(() => {
    const hoy = hoyIso();
    return companies.map((c) => aFilaEmpresa(c, hoy));
  }, [companies]);
  const conteo = useMemo(() => contarPorPlan(filas), [filas]);
  const filtradas = useMemo(() => filtrarEmpresas(filas, filtros), [filas, filtros]);
  const hayFiltros = Boolean(filtros.search.trim() || filtros.plan || filtros.estado);

  const handleSyncAlegra = async () => {
    setSyncLoading(true);
    try {
      const data = await sincronizarEmpresasAlegra();
      showToast(`Sincronización exitosa: se procesaron ${data.processed} empresas.`);
      fetchCompanies();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="relative flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 shrink-0 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8">
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-neutralCustom-800">Empresas</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              Cuentas, planes de documentos y vigencias de tus clientes.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ConfirmPopover
              message="¿Sincronizar las empresas desde Alegra? Se actualizan los datos de las que ya existen."
              confirmLabel="Sincronizar"
              onConfirm={handleSyncAlegra}
            >
              {({ ask }) => (
                <Button onClick={ask} variant="outline" icon={RefreshIcon} loading={syncLoading} disabled={loading}>
                  <span className="hidden sm:inline">Sincronizar</span>
                  <span className="sr-only sm:hidden">Sincronizar con Alegra</span>
                </Button>
              )}
            </ConfirmPopover>
            <Button onClick={() => navigate("/admin/companies/new")} variant="primary" icon={PlusIcon}>
              Nueva empresa
            </Button>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col">
            <CompanyFilters
              filtros={filtros}
              onChange={setFiltros}
              conteo={conteo}
              total={filas.length}
              hayFiltros={hayFiltros}
              onLimpiar={() => setFiltros(FILTROS_VACIOS)}
            />

            {loading ? (
              <TableSkeleton columns={5} label="Cargando empresas..." />
            ) : loadError ? (
              <div className="p-12 text-center">
                <p role="alert" className="text-sm text-fiscal-danger mb-3">
                  No se pudieron cargar las empresas: {loadError}
                </p>
                <Button onClick={fetchCompanies} variant="danger">
                  Reintentar
                </Button>
              </div>
            ) : (
              <CompanyTable filas={filtradas} hayFiltros={hayFiltros} />
            )}
          </div>
        </div>

        <Footer />
      </main>

      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
