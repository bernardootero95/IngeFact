import { describe, expect, it } from "vitest";
import { validateProveedor, validateCufe, validateFecha } from "./ReceivedInvoiceFormPage.validation.js";

describe("ReceivedInvoiceFormPage validaciones", () => {
  it("requiere proveedor", () => {
    expect(validateProveedor(null)).toMatch(/proveedor/i);
    expect(validateProveedor("prov-1")).toBe("");
  });

  it("requiere cufe", () => {
    expect(validateCufe("")).toMatch(/obligatorio/i);
    expect(validateCufe("   ")).toMatch(/obligatorio/i);
    expect(validateCufe("abc123")).toBe("");
  });

  it("requiere fecha", () => {
    expect(validateFecha("")).toMatch(/obligatoria/i);
    expect(validateFecha("2026-09-15")).toBe("");
  });
});
