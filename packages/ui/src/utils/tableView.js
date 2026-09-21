const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

const isEmpty = (v) => v === null || v === undefined || v === "";

/** Compara dos valores de celda: vacios al final, numeros por valor, texto sin acentos/mayusculas. */
export function compareValues(a, b) {
  if (isEmpty(a) || isEmpty(b)) return isEmpty(a) === isEmpty(b) ? 0 : isEmpty(a) ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/** Devuelve una copia ordenada por `sort` ({ key, dir }); sin `sort` devuelve la lista tal cual. */
export function sortItems(items, sort) {
  if (!sort) return items;
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...items].sort((x, y) => {
    const a = x[sort.key];
    const b = y[sort.key];
    // Los vacios van siempre al final, sin importar la direccion.
    if (isEmpty(a) || isEmpty(b)) return compareValues(a, b);
    return factor * compareValues(a, b);
  });
}

/** Calcula la ventana de una pagina (1-indexada), acotando la pagina pedida al rango valido. */
export function getPageWindow(total, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  return {
    page,
    totalPages,
    start: (page - 1) * pageSize,
    end: page * pageSize,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
  };
}
