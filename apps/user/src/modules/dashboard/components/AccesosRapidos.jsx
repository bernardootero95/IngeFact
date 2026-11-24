import { Link } from "react-router-dom";

const ACCESOS = [
  {
    titulo: "Nueva factura",
    ayuda: "Emite una factura electrónica",
    ruta: "/invoices/new",
    icono: "M9 12h6m-3-3v6m5 6H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    titulo: "Nuevo cliente",
    ayuda: "Registra a quién le facturas",
    ruta: "/customers/new",
    icono: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  },
  {
    titulo: "Nota crédito",
    ayuda: "Corrige o anula una factura",
    ruta: "/credit-notes",
    icono: "M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z",
  },
  {
    titulo: "Documento soporte",
    ayuda: "Compras a no obligados a facturar",
    ruta: "/support-documents/new",
    icono: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

/** Atajos a las acciones más usadas. La nota crédito parte de una factura, por eso va al listado. */
export default function AccesosRapidos() {
  return (
    <section
      aria-labelledby="accesos-titulo"
      className="rounded-brand-lg border border-neutralCustom-100 bg-white p-6 shadow-sm"
    >
      <h3 id="accesos-titulo" className="text-sm font-medium text-neutralCustom-500">
        Accesos rápidos
      </h3>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ACCESOS.map((acceso) => (
          <li key={acceso.ruta}>
            <Link
              to={acceso.ruta}
              className="flex min-h-[44px] items-center gap-3 rounded-brand-md border border-neutralCustom-100 p-3 transition-colors hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-brand-md bg-brand-50 text-brand-600">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={acceso.icono} />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-neutralCustom-800">{acceso.titulo}</span>
                <span className="block text-sm text-neutralCustom-500">{acceso.ayuda}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
