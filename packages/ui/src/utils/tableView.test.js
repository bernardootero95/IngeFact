import { describe, it, expect } from "vitest";
import { compareValues, sortItems, getPageWindow } from "./tableView.js";

describe("compareValues", () => {
  it("ordena numeros por valor y no como texto", () => {
    expect(compareValues(9, 10)).toBeLessThan(0);
  });

  it("ordena texto ignorando mayusculas y acentos, con numeros naturales", () => {
    expect(compareValues("Álvaro", "alvaro")).toBe(0);
    expect(compareValues("FE-9", "FE-10")).toBeLessThan(0);
  });

  it("pone los vacios al final", () => {
    expect(compareValues(null, "a")).toBeGreaterThan(0);
    expect(compareValues("a", "")).toBeLessThan(0);
    expect(compareValues(undefined, null)).toBe(0);
  });
});

describe("sortItems", () => {
  const items = [
    { id: 1, nombre: "Beta", total: 20 },
    { id: 2, nombre: null, total: 5 },
    { id: 3, nombre: "alfa", total: 100 },
  ];

  it("sin orden devuelve la misma lista", () => {
    expect(sortItems(items, null)).toBe(items);
  });

  it("ordena ascendente y descendente sin mutar el original", () => {
    expect(sortItems(items, { key: "total", dir: "asc" }).map((i) => i.id)).toEqual([2, 1, 3]);
    expect(sortItems(items, { key: "total", dir: "desc" }).map((i) => i.id)).toEqual([3, 1, 2]);
    expect(items.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("mantiene los vacios al final en ambas direcciones", () => {
    expect(sortItems(items, { key: "nombre", dir: "asc" }).map((i) => i.id)).toEqual([3, 1, 2]);
    expect(sortItems(items, { key: "nombre", dir: "desc" }).map((i) => i.id)).toEqual([1, 3, 2]);
  });
});

describe("getPageWindow", () => {
  it("calcula la primera y la ultima pagina", () => {
    expect(getPageWindow(60, 1, 25)).toMatchObject({ page: 1, totalPages: 3, from: 1, to: 25, start: 0, end: 25 });
    expect(getPageWindow(60, 3, 25)).toMatchObject({ page: 3, from: 51, to: 60 });
  });

  it("acota una pagina fuera de rango", () => {
    expect(getPageWindow(60, 99, 25).page).toBe(3);
    expect(getPageWindow(60, 0, 25).page).toBe(1);
  });

  it("lista vacia: una pagina y rango 0-0", () => {
    expect(getPageWindow(0, 1, 25)).toMatchObject({ page: 1, totalPages: 1, from: 0, to: 0 });
  });
});
