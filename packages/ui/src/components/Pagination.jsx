import Button from "./Button.jsx";

/** Barra de paginacion de un listado. No se muestra si todo cabe en una pagina. */
export default function Pagination({ page, totalPages, total, from, to, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutralCustom-100 px-6 py-3 text-sm text-neutralCustom-600">
      <p>
        Mostrando <span className="font-medium text-neutralCustom-800">{from}–{to}</span> de{" "}
        <span className="font-medium text-neutralCustom-800">{total}</span>
      </p>
      <nav aria-label="Paginación" className="flex items-center gap-3">
        <Button size="sm" onClick={() => onPage(page - 1)} disabled={page === 1}>
          Anterior
        </Button>
        <span aria-live="polite" className="whitespace-nowrap">
          Página {page} de {totalPages}
        </span>
        <Button size="sm" onClick={() => onPage(page + 1)} disabled={page === totalPages}>
          Siguiente
        </Button>
      </nav>
    </div>
  );
}
