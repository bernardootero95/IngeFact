import { describe, it, expect, vi, beforeEach } from "vitest";

const order = vi.fn();
const isFn = vi.fn(() => ({ order }));
const eq = vi.fn(() => ({ is: isFn }));
const selectList = vi.fn(() => ({ eq }));

const single = vi.fn();
const selectInsert = vi.fn(() => ({ single }));
const insert = vi.fn(() => ({ select: selectInsert }));

vi.mock("../supabase.js", () => ({
  supabase: {
    from: () => ({
      select: selectList,
      insert,
    }),
  },
}));

import { listProductos, createProducto } from "./productos.js";

describe("listProductos", () => {
  beforeEach(() => {
    order.mockReset();
  });

  it("devuelve la lista de productos activos de la empresa", async () => {
    order.mockResolvedValue({
      data: [{ id: "p1", nombre: "Producto Uno" }],
      error: null,
    });
    const result = await listProductos("empresa-1");
    expect(result).toEqual([{ id: "p1", nombre: "Producto Uno" }]);
  });

  it("devuelve un arreglo vacío si data es null", async () => {
    order.mockResolvedValue({ data: null, error: null });
    const result = await listProductos("empresa-1");
    expect(result).toEqual([]);
  });

  it("lanza el error cuando supabase devuelve un error", async () => {
    order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(listProductos("empresa-1")).rejects.toThrow("boom");
  });
});

describe("createProducto", () => {
  beforeEach(() => {
    single.mockReset();
  });

  it("devuelve el producto insertado", async () => {
    single.mockResolvedValue({
      data: { id: "p1", nombre: "Producto Uno" },
      error: null,
    });
    const result = await createProducto({ nombre: "Producto Uno" });
    expect(result).toEqual({ id: "p1", nombre: "Producto Uno" });
  });

  it("lanza el error cuando supabase devuelve un error", async () => {
    single.mockResolvedValue({ data: null, error: new Error("duplicado") });
    await expect(createProducto({ nombre: "x" })).rejects.toThrow(
      "duplicado",
    );
  });
});
