import { useMemo, useState } from "react";
import { getPageWindow, sortItems } from "../utils/tableView.js";

/**
 * Orden por columna + paginacion en el cliente para los listados (la API
 * devuelve la lista completa). Clic en una columna: ascendente -> descendente ->
 * orden original. Al cambiar el filtro (cambia la cantidad o el primer
 * registro) vuelve a la pagina 1.
 *
 * Devuelve `rows` (la pagina actual) y `pagination` listo para <Pagination />.
 */
export default function useTableView(items, { pageSize = 25, initialSort = null } = {}) {
  const [sort, setSort] = useState(initialSort);
  const signature = `${items.length}:${items[0]?.id ?? ""}`;
  const [pageState, setPageState] = useState({ page: 1, signature });

  const sorted = useMemo(() => sortItems(items, sort), [items, sort]);
  const requested = pageState.signature === signature ? pageState.page : 1;
  const { page, totalPages, start, end, from, to } = getPageWindow(sorted.length, requested, pageSize);
  const rows = useMemo(() => sorted.slice(start, end), [sorted, start, end]);

  const setPage = (next) => setPageState({ page: getPageWindow(sorted.length, next, pageSize).page, signature });

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      return prev.dir === "asc" ? { key, dir: "desc" } : null;
    });
    setPageState({ page: 1, signature });
  };

  return {
    rows,
    sort,
    toggleSort,
    pagination: { page, totalPages, total: sorted.length, from, to, onPage: setPage },
  };
}
