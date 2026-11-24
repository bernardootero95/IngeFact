import { beforeEach, describe, expect, it } from "vitest";
import {
  ESTADO_PLAN,
  alertasPorVencer,
  textoDocumentos,
  textoVencimiento,
  tituloPorVencer,
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

describe("alertasPorVencer", () => {
  const empresa = (s) => ({ suscripcion: { estado_plan: "vigente", max_documentos: 100, documentos_usados: 10, dias_para_vencer: 90, fecha_fin: "2027-01-31", ...s } });

  it("nada que avisar con plan holgado", () => {
    expect(alertasPorVencer(empresa())).toBeNull();
  });

  it("avisa la fecha a 30 dias o menos", () => {
    expect(alertasPorVencer(empresa({ dias_para_vencer: 31 }))).toBeNull();
    expect(alertasPorVencer(empresa({ dias_para_vencer: 30 })).fecha).toEqual({ dias: 30, fechaFin: "2027-01-31" });
  });

  it("avisa los documentos con el 10 % o menos", () => {
    expect(alertasPorVencer(empresa({ documentos_usados: 89 }))).toBeNull();
    expect(alertasPorVencer(empresa({ documentos_usados: 90 })).documentos).toEqual({ restantes: 10, max: 100 });
  });

  it("en paquetes chicos avisa con el ultimo documento", () => {
    expect(alertasPorVencer(empresa({ max_documentos: 5, documentos_usados: 4 })).documentos.restantes).toBe(1);
  });

  it("no aplica sin cupo ni vencido", () => {
    expect(alertasPorVencer(empresa({ estado_plan: "sin_cupo", documentos_usados: 100 }))).toBeNull();
    expect(alertasPorVencer(empresa({ estado_plan: "vencido", dias_para_vencer: -3 }))).toBeNull();
  });

  it("textos", () => {
    expect(textoVencimiento({ dias: 0, fechaFin: "2026-11-23" })).toBe("Tu plan vence hoy (23/11/2026).");
    expect(textoVencimiento({ dias: 12, fechaFin: "2026-12-05" })).toBe("Tu plan vence en 12 días, el 05/12/2026.");
    expect(textoDocumentos({ restantes: 1, max: 10 })).toBe("Te queda 1 documento de 10 en tu paquete.");
    expect(tituloPorVencer({ fecha: {}, documentos: {} })).toBe("Tu plan está por terminar");
  });
});

describe("tieneArchivosDian", () => {
  it("solo los documentos con codigo DIAN tienen PDF y XML", () => {
    expect(tieneArchivosDian({ cufe: "abc" })).toBe(true);
    expect(tieneArchivosDian({ cune: "abc" })).toBe(true);
    expect(tieneArchivosDian({ cufe: null })).toBe(false);
  });
});
