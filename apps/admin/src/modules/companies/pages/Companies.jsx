import React, { useEffect, useState } from "react";
import { supabase } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import CompanyTable from "../components/CompanyTable";
import CompanyModal from "../components/CompanyModal";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("empresas")
      .select(
        `
        *,
        suscripciones (
          id, max_documentos, documentos_usados, fecha_inicio, fecha_fin, estado
        )
      `,
      )
      .is("eliminado", null)
      .order("creado", { ascending: false });

    if (error) {
      console.error("Error al obtener empresas:", error.message);
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  };

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
        "¿Estás seguro de que deseas sincronizar las empresas desde Alegra? Esto actualizará los datos locales.",
      )
    )
      return;

    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-companies");
      if (error || data?.error) {
        throw new Error(
          error?.message || data?.error || "Error al sincronizar.",
        );
      }
      alert(
        `¡Sincronización exitosa! Se procesaron ${data.processed} empresas.`,
      );
      fetchCompanies(); // Recargar la tabla
    } catch (err) {
      console.error(err);
      alert(err.message);
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

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutralCustom-500">
              Gestión centralizada de cuentas de facturación, cuotas de
              documentos y vigencias.
            </h3>
          </div>

          <CompanyTable
            companies={companies}
            loading={loading}
            onEdit={handleEditClick}
          />
        </div>
      </main>

      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentCompany={currentCompany}
        onSaveSuccess={fetchCompanies}
      />
    </div>
  );
}
