import { describe, expect, it } from "vitest";
import {
  validateTipo,
  validateGeneradorField,
  validateClaimCode,
  TIPOS_QUE_REQUIEREN_GENERADOR,
  TIPO_RECLAMO,
} from "./ReceivedInvoiceDetailPage.validation.js";

describe("ReceivedInvoiceDetailPage validaciones", () => {
  it("requiere tipo de evento", () => {
    expect(validateTipo("")).toMatch(/selecciona/i);
    expect(validateTipo("030")).toBe("");
  });

  it("requiere campos del generador cuando aplica", () => {
    expect(validateGeneradorField("nombres", "")).toMatch(/obligatorio/i);
    expect(validateGeneradorField("nombres", "Ana")).toBe("");
    expect(validateGeneradorField("cargo", "")).toBe("");
  });

  it("requiere motivo del reclamo", () => {
    expect(validateClaimCode("")).toMatch(/motivo/i);
    expect(validateClaimCode("01")).toBe("");
  });

  it("solo 030 y 032 requieren generador", () => {
    expect(TIPOS_QUE_REQUIEREN_GENERADOR).toEqual(["030", "032"]);
    expect(TIPO_RECLAMO).toBe("031");
  });
});
