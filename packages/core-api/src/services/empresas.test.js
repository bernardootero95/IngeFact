import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();

vi.mock("../supabase.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  },
}));

import { getEmpresaByUsuarioId } from "./empresas.js";

describe("getEmpresaByUsuarioId", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it("devuelve null si el usuario no está vinculado a ninguna empresa", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await getEmpresaByUsuarioId("user-1");
    expect(result).toBeNull();
  });

  it("devuelve los datos de la empresa junto con el empresaId", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        empresa_id: "empresa-1",
        empresas: { razon_social: "Acme S.A.S.", nombre_comercial: "Acme" },
      },
      error: null,
    });
    const result = await getEmpresaByUsuarioId("user-1");
    expect(result).toEqual({
      empresaId: "empresa-1",
      razon_social: "Acme S.A.S.",
      nombre_comercial: "Acme",
    });
  });

  it("lanza el error cuando supabase devuelve un error", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(getEmpresaByUsuarioId("user-1")).rejects.toThrow("boom");
  });
});
