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

import { listImpuestosEmpresa, createImpuestoEmpresa } from "./impuestosEmpresa.js";

describe("listImpuestosEmpresa", () => {
  beforeEach(() => {
    order.mockReset();
  });

  it("devuelve la lista de impuestos activos de la empresa", async () => {
    order.mockResolvedValue({
      data: [{ id: "i1", tributo: "01", tarifa: 19 }],
      error: null,
    });
    const result = await listImpuestosEmpresa("empresa-1");
    expect(result).toEqual([{ id: "i1", tributo: "01", tarifa: 19 }]);
  });

  it("devuelve un arreglo vacío si data es null", async () => {
    order.mockResolvedValue({ data: null, error: null });
    const result = await listImpuestosEmpresa("empresa-1");
    expect(result).toEqual([]);
  });

  it("lanza el error cuando supabase devuelve un error", async () => {
    order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(listImpuestosEmpresa("empresa-1")).rejects.toThrow("boom");
  });
});

describe("createImpuestoEmpresa", () => {
  beforeEach(() => {
    single.mockReset();
  });

  it("devuelve el impuesto insertado", async () => {
    single.mockResolvedValue({
      data: { id: "i1", tributo: "01", tarifa: 19 },
      error: null,
    });
    const result = await createImpuestoEmpresa({ tributo: "01", tarifa: 19 });
    expect(result).toEqual({ id: "i1", tributo: "01", tarifa: 19 });
  });

  it("lanza el error cuando supabase devuelve un error", async () => {
    single.mockResolvedValue({ data: null, error: new Error("duplicado") });
    await expect(
      createImpuestoEmpresa({ tributo: "01", tarifa: 19 }),
    ).rejects.toThrow("duplicado");
  });
});
