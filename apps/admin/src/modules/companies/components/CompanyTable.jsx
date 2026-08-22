
export default function CompanyTable({ companies, loading, onEdit }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white border border-neutralCustom-100 rounded-brand-lg">
        <p className="text-sm font-medium text-neutralCustom-500 animate-pulse">
          Cargando empresas...
        </p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white border border-neutralCustom-100 rounded-brand-lg">
        <svg
          className="w-12 h-12 text-neutralCustom-300 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0V11m0 0h4m-4 0H5m4 0h4m-4 10V4m15 10H5"
          />
        </svg>
        <p className="text-sm font-medium text-neutralCustom-500">
          No hay empresas registradas
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutralCustom-50 border-b border-neutralCustom-100">
              <th className="p-4 text-sm font-semibold text-neutralCustom-800">
                Empresa (NIT)
              </th>
              <th className="p-4 text-sm font-semibold text-neutralCustom-800">
                Suscripción
              </th>
              <th className="p-4 text-sm font-semibold text-neutralCustom-800">
                Documentos
              </th>
              <th className="p-4 text-sm font-semibold text-neutralCustom-800 w-32">
                Estado
              </th>
              <th className="p-4 text-sm font-semibold text-neutralCustom-800 w-24">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutralCustom-100">
            {companies.map((company) => {
              const sub = company.suscripciones?.[0] || null;
              const percentUsed = sub
                ? Math.round((sub.documentos_usados / sub.max_documentos) * 100)
                : 0;
              const isWarning = percentUsed > 85;

              return (
                <tr
                  key={company.id}
                  className="hover:bg-neutralCustom-50/50 transition-colors"
                >
                  <td className="p-4">
                    <p className="text-sm font-bold text-neutralCustom-800">
                      {company.razon_social}
                    </p>
                    <p className="text-xs text-neutralCustom-500 font-mono mt-0.5">
                      NIT: {company.numero_identificacion}-
                      {company.digito_verificacion}
                    </p>
                  </td>

                  <td className="p-4">
                    {sub ? (
                      <>
                        <p className="text-sm text-neutralCustom-700">
                          Vence:{" "}
                          <span className="font-medium">{sub.fecha_fin}</span>
                        </p>
                        <p className="text-xs text-neutralCustom-500 mt-0.5">
                          Inicio: {sub.fecha_inicio}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-fiscal-danger bg-red-50 px-2 py-1 rounded-brand-md">
                        Sin plan activo
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    {sub && (
                      <div className="w-full max-w-[150px]">
                        <div className="flex justify-between text-xs mb-1">
                          <span
                            className={`${isWarning ? "text-fiscal-danger font-bold" : "text-neutralCustom-700"}`}
                          >
                            {sub.documentos_usados} / {sub.max_documentos}
                          </span>
                          <span className="text-neutralCustom-500">
                            {percentUsed}%
                          </span>
                        </div>
                        <div className="w-full bg-neutralCustom-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${isWarning ? "bg-fiscal-danger" : "bg-brand-500"}`}
                            style={{ width: `${Math.min(percentUsed, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="p-4 text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-bold rounded-brand-md uppercase ${
                        company.estado === "activo"
                          ? "bg-brand-50 text-brand-600"
                          : "bg-red-50 text-fiscal-danger"
                      }`}
                    >
                      {company.estado}
                    </span>
                  </td>

                  <td className="p-4 text-sm">
                    <button
                      onClick={() => onEdit(company)}
                      className="text-brand-600 hover:text-brand-400 font-medium transition-colors"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
