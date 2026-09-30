import Button from "./Button.jsx";
import { getPageItems } from "../utils/tableView.js";

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Barra de paginacion de un listado: salto directo a cualquier pagina
 * (primera, ultima y las vecinas de la actual) y selector de filas por pagina.
 * No se muestra si todo cabe en la pagina mas pequena.
 */
export default function Pagination({ page, totalPages, total, from, to, pageSize, onPage, onPageSize }) {
  if (total <= PAGE_SIZES[0] || (!onPageSize && totalPages <= 1)) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutralCustom-100 px-6 py-3 text-sm text-neutralCustom-600">
      <div className="flex items-center gap-3">
        <p>
          Mostrando <span className="font-medium text-neutralCustom-800">{from}–{to}</span> de{" "}
          <span className="font-medium text-neutralCustom-800">{total}</span>
        </p>
        {onPageSize && (
          <select
            value={pageSize}
            aria-label="Filas por página"
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="field h-[30px] py-0 text-sm"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>
        )}
      </div>
      {totalPages > 1 && (
        <nav aria-label="Paginación" className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onPage(page - 1)} disabled={page === 1} title="Página anterior">
            ‹<span className="sr-only">Anterior</span>
          </Button>
          {getPageItems(page, totalPages).map((item, index) =>
            item === "…" ? (
              <span key={`salto-${index}`} className="px-1 text-neutralCustom-400" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                key={item}
                size="sm"
                variant={item === page ? "primary" : "ghost"}
                onClick={() => onPage(item)}
                aria-label={`Página ${item}`}
                aria-current={item === page ? "page" : undefined}
                className="min-w-[30px] px-2"
              >
                {item}
              </Button>
            ),
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            title="Página siguiente"
          >
            ›<span className="sr-only">Siguiente</span>
          </Button>
        </nav>
      )}
    </div>
  );
}
