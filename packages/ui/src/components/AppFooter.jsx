/**
 * Pie de la app (derechos, version y enlace a soporte). Va como ultimo hijo
 * del <main> de cada pagina, fuera del contenedor con scroll, para que quede
 * siempre visible abajo sin agregar un scroll extra a la pantalla.
 */
export default function AppFooter({ ownerName, version, supportHref }) {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-neutralCustom-100 bg-white px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-neutralCustom-500">
      <p>
        © {year} Desarrollado por <span className="font-semibold text-neutralCustom-800">{ownerName}</span>. Todos los
        derechos reservados.
      </p>
      <div className="flex items-center gap-3">
        {version && <span>Versión {version}</span>}
        {version && supportHref && <span aria-hidden="true">•</span>}
        {supportHref && (
          <a
            href={supportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-brand-md"
          >
            Soporte Técnico
          </a>
        )}
      </div>
    </footer>
  );
}
