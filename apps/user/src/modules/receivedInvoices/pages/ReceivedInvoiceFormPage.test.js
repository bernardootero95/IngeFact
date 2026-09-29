import { describe, expect, it } from "vitest";
import { validateCufe } from "./ReceivedInvoiceFormPage.validation.js";

describe("ReceivedInvoiceFormPage validaciones", () => {
  it("requiere cufe", () => {
    expect(validateCufe("")).toMatch(/obligatorio/i);
    expect(validateCufe("   ")).toMatch(/obligatorio/i);
    expect(validateCufe("abc123")).toBe("");
    expect(validateCufe("  abc123  ")).toBe("");
  });

  it("rechaza espacios internos y cufes demasiado largos", () => {
    expect(validateCufe("abc 123")).toMatch(/espacios/i);
    expect(validateCufe("a".repeat(201))).toMatch(/200/);
  });
});
