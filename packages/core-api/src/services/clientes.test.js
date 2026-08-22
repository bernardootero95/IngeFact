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

import { listClientes, createCliente } from "./clientes.js";

describe("listClientes", () => {
  beforeEach(() => {
    order.mockReset();
  });

  it("devuelve la lista de clientes activos de la empresa", async () => {
    order.mockResolvedValue({
      data: [{ id: "c1", nombre: "Cliente Uno" }],
      error: null,
    });
    const result = await listClientes("empresa-1");
    expect(result).toEqual([{ id: "c1", nombre: "Cliente Uno" }]);
  });

  it("devuelve un arreglo vacío si data es null", async () => {
    order.mockResolvedValue({ data: null, error: null });
    const result = await listClientes("empresa-1");
    expect(result).toEqual([]);
  });

  it("lanza el error cuando supabase devuelve un error", async () => {
    order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(listClientes("empresa-1")).rejects.toThrow("boom");
  });
});

describe("createCliente", () => {
  beforeEach(() => {
    single.mockReset();
  });

  it("devuelve el cliente insertado", async () => {
    single.mockResolvedValue({
      data: { id: "c1", nombre: "Cliente Uno" },
      error: null,
    });
    const result = await createCliente({ nombre: "Cliente Uno" });
    expect(result).toEqual({ id: "c1", nombre: "Cliente Uno" });
  });

  it("lanza el error cuando supabase devuelve un error", async () => {
    single.mockResolvedValue({ data: null, error: new Error("duplicado") });
    await expect(createCliente({ nombre: "x" })).rejects.toThrow("duplicado");
  });
});
