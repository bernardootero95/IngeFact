import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";

export default function References() {
  const navigate = useNavigate();

  const categories = [
    {
      title: "Ubicación Geográfica",
      description: "Códigos de estandarización de localización",
      items: [
        { name: "Países", slug: "paises" },
        { name: "Departamentos", slug: "departamentos" },
        { name: "Municipios", slug: "municipios" },
      ],
    },
    {
      title: "Finanzas y Moneda",
      description: "Configuraciones transaccionales y divisas",
      items: [
        { name: "Monedas", slug: "monedas" },
        { name: "Formas de Pago", slug: "formas_pago" },
        { name: "Métodos de Pago", slug: "metodos_pago" },
      ],
    },
    {
      title: "Regulación e Impuestos",
      description: "Atributos legales exigidos por la DIAN",
      items: [
        {
          name: "Tipos de Organización",
          slug: "tipos_organizacion",
        },
        {
          name: "Responsabilidad Fiscal",
          slug: "responsabilidades_fiscales",
        },
        { name: "Tributos / Impuestos", slug: "tributos" },
        {
          name: "Tipos de Identificación",
          slug: "tipos_identificacion",
        },
      ],
    },
    {
      title: "Operación y Documentos",
      description: "Unidades de medida y conceptos de ajuste",
      items: [
        { name: "Tipos de Unidad", slug: "tipos_unidad" },
        {
          name: "Conceptos Nota Crédito",
          slug: "conceptos_nota_credito",
        },
        {
          name: "Conceptos Nota Débito",
          slug: "conceptos_nota_debito",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center px-8">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Tablas de Referencia (Anexos DIAN)
          </h2>
        </header>

        <div className="p-8 flex-1 overflow-y-auto space-y-8">
          {categories.map((category, index) => (
            <div key={index} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-neutralCustom-800">
                  {category.title}
                </h3>
                <p className="text-xs text-neutralCustom-500">
                  {category.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.items.map((table) => (
                  <button
                    key={table.slug}
                    onClick={() => navigate(`/admin/references/${table.slug}`)}
                    className="flex items-center p-4 bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm hover:border-brand-400 hover:shadow-md text-left transition-all group"
                  >
                    <span className="mr-4 shrink-0 bg-neutralCustom-50 p-2.5 text-neutralCustom-500 rounded-brand-md group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M3 14h18M10 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
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
