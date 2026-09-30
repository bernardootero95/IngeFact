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

const normalizar = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Filtra por texto libre sobre varias columnas, sin distinguir mayusculas ni
 * acentos. Cada palabra de la busqueda debe aparecer en alguna de las columnas
 * (asi "fe 12 perez" encuentra la factura FE12 de "Pérez").
 */
export function filterItems(items, keys, query) {
  const palabras = normalizar(query).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return items;
  return items.filter((item) => {
    const texto = keys.map((key) => normalizar(item[key])).join(" ");
    return palabras.every((palabra) => texto.includes(palabra));
  });
}

/**
 * Numeros de pagina a mostrar en la barra: siempre la primera y la ultima, la
 * actual con un vecino a cada lado, y "…" donde se saltan paginas. Ej. en la 6
 * de 20: [1, "…", 5, 6, 7, "…", 20].
 */
export function getPageItems(page, totalPages) {
  const visibles = new Set([1, totalPages, page - 1, page, page + 1]);
  // Evita un "…" que esconda una sola pagina: se muestra la pagina en su lugar.
  if (page - 3 === 1) visibles.add(2);
  if (page + 3 === totalPages) visibles.add(totalPages - 1);
  const paginas = [...visibles].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return paginas.flatMap((p, i) => (i > 0 && p - paginas[i - 1] > 1 ? ["…", p] : [p]));
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
