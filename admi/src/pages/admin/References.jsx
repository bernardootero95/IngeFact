import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

export default function References() {
  const navigate = useNavigate();

  // Configuración de las 13 tablas organizadas por categorías de negocio
  const categories = [
    {
      title: "Ubicación Geográfica",
      description: "Códigos de estandarización de localización",
      items: [
        { name: "Países", slug: "paises", icon: "🌐" },
        { name: "Departamentos", slug: "departamentos", icon: "🗺️" },
        { name: "Municipios", slug: "municipios", icon: "📍" },
      ],
    },
    {
      title: "Finanzas y Moneda",
      description: "Configuraciones transaccionales y divisas",
      items: [
        { name: "Monedas", slug: "monedas", icon: "💵" },
        { name: "Formas de Pago", slug: "formas_pago", icon: "💳" },
        { name: "Métodos de Pago", slug: "metodos_pago", icon: "🏦" },
      ],
    },
    {
      title: "Regulación e Impuestos",
      description: "Atributos legales exigidos por la DIAN",
      items: [
        {
          name: "Tipos de Organización",
          slug: "tipos_organizacion",
          icon: "🏢",
        },
        {
          name: "Responsabilidad Fiscal",
          slug: "responsabilidades_fiscales",
          icon: "⚖️",
        },
        { name: "Tributos / Impuestos", slug: "tributos", icon: "📊" },
        {
          name: "Tipos de Identificación",
          slug: "tipos_identificacion",
          icon: "🪪",
        },
      ],
    },
    {
      title: "Operación y Documentos",
      description: "Unidades de medida y conceptos de ajuste",
      items: [
        { name: "Tipos de Unidad", slug: "tipos_unidad", icon: "📦" },
        {
          name: "Conceptos Nota Crédito",
          slug: "conceptos_nota_credito",
          icon: "📉",
        },
        {
          name: "Conceptos Nota Débito",
          slug: "conceptos_nota_debito",
          icon: "📈",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        {/* Barra Superior */}
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center px-8">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Tablas de Referencia (Anexos DIAN)
          </h2>
        </header>

        {/* Contenedor del Hub */}
        <div className="p-8 flex-1 overflow-y-auto space-y-8">
          {categories.map((category, index) => (
            <div key={index} className="space-y-4">
              {/* Título de Categoría */}
              <div>
                <h3 className="text-base font-bold text-neutralCustom-800">
                  {category.title}
                </h3>
                <p className="text-xs text-neutralCustom-500">
                  {category.description}
                </p>
              </div>

              {/* Rejilla de Tarjetas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.items.map((table) => (
                  <button
                    key={table.slug}
                    onClick={() => navigate(`/admin/references/${table.slug}`)}
                    className="flex items-center p-4 bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm hover:border-brand-400 hover:shadow-md text-left transition-all group"
                  >
                    <span className="text-2xl mr-4 bg-neutralCustom-50 p-2 rounded-brand-md group-hover:bg-brand-50 transition-colors">
                      {table.icon}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-neutralCustom-800 group-hover:text-brand-600 transition-colors">
                        {table.name}
                      </h4>
                      <span className="text-[10px] text-neutralCustom-500 font-mono uppercase tracking-wider">
                        Ver registros
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
