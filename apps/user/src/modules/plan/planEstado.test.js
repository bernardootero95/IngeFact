import { beforeEach, describe, expect, it } from "vitest";
import {
  ESTADO_PLAN,
  avisoPendiente,
  enlaceCompraPaquete,
  estadoPlanDe,
  formatoFecha,
  marcarAvisoVisto,
  tieneArchivosDian,
} from "./planEstado";

describe("estadoPlanDe", () => {
  it("lee el estado que calcula la API", () => {
    expect(estadoPlanDe({ suscripcion: { estado_plan: "vencido" } })).toBe(ESTADO_PLAN.VENCIDO);
  });

  it("sin suscripcion es sin_plan", () => {
    expect(estadoPlanDe({ suscripcion: null })).toBe(ESTADO_PLAN.SIN_PLAN);
    expect(estadoPlanDe(null)).toBe(ESTADO_PLAN.SIN_PLAN);
  });
});

describe("enlaceCompraPaquete", () => {
  it("abre WhatsApp con la empresa en el mensaje", () => {
    const url = enlaceCompraPaquete({ razon_social: "Demo SAS", numero_identificacion: "900123456" });
    expect(url.startsWith("https://wa.me/573046402211?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Demo SAS (NIT 900123456)");
  });
});

describe("formatoFecha", () => {
  it("convierte ISO a dd/mm/aaaa sin corrimiento de zona", () => {
    expect(formatoFecha("2026-10-06")).toBe("06/10/2026");
    expect(formatoFecha(null)).toBe("");
  });
});

describe("aviso por ingreso", () => {
  let storage;
  beforeEach(() => {
    const datos = new Map();
    storage = { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) };
  });

  it("sale una vez por sesion y estado", () => {
    expect(avisoPendiente("e1", "sin_cupo", storage)).toBe(true);
    marcarAvisoVisto("e1", "sin_cupo", storage);
    expect(avisoPendiente("e1", "sin_cupo", storage)).toBe(false);
    expect(avisoPendiente("e1", "vencido", storage)).toBe(true);
  });

  it("sin storage disponible el aviso sale siempre", () => {
    expect(avisoPendiente("e1", "sin_cupo", undefined)).toBe(true);
    expect(() => marcarAvisoVisto("e1", "sin_cupo", undefined)).not.toThrow();
  });
});

describe("tieneArchivosDian", () => {
  it("solo los documentos con codigo DIAN tienen PDF y XML", () => {
    expect(tieneArchivosDian({ cufe: "abc" })).toBe(true);
    expect(tieneArchivosDian({ cune: "abc" })).toBe(true);
    expect(tieneArchivosDian({ cufe: null })).toBe(false);
  });
});
