import React, { useEffect, useState } from "react";
import { supabase } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import CompanyTable from "../components/CompanyTable";
import CompanyModal from "../components/CompanyModal";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    // Join para traer la empresa y su suscripción activa
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

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
          <h2 className="text-lg font-bold text-neutralCustom-800">
            Empresas y Suscripciones (Tenants)
          </h2>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-400 text-white text-sm font-medium rounded-brand-md transition-colors"
          >
            Aprovisionar Empresa
          </button>
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
