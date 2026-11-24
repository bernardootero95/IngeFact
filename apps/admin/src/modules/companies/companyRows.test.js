import { describe, expect, it } from "vitest";
import { aFilaEmpresa, contarPorPlan, estadoPlan, filtrarEmpresas, formatoFecha, hoyIso } from "./companyRows";

const HOY = "2026-11-22";
const sub = (overrides = {}) => ({
  max_documentos: 100,
  documentos_usados: 10,
  fecha_inicio: "2026-01-01",
  fecha_fin: "2027-06-30",
  ...overrides,
});

describe("estadoPlan", () => {
  it("sin suscripcion es sin_plan", () => {
    expect(estadoPlan(null, HOY).estado).toBe("sin_plan");
  });

  it("vencido gana sobre agotado", () => {
    expect(estadoPlan(sub({ fecha_fin: "2026-10-06", documentos_usados: 200 }), HOY)).toEqual({
      estado: "vencido",
      dias: -47,
    });
  });

  it("cupo agotado aunque este vigente", () => {
    expect(estadoPlan(sub({ documentos_usados: 100 }), HOY).estado).toBe("agotado");
  });

  it("por vencer a 30 dias o menos, el mismo dia aun no esta vencido", () => {
    expect(estadoPlan(sub({ fecha_fin: "2026-12-22" }), HOY).estado).toBe("por_vencer");
    expect(estadoPlan(sub({ fecha_fin: HOY }), HOY)).toEqual({ estado: "por_vencer", dias: 0 });
    expect(estadoPlan(sub({ fecha_fin: "2026-12-23" }), HOY).estado).toBe("vigente");
  });
});

describe("aFilaEmpresa y filtrarEmpresas", () => {
  const filas = [
    { id: "1", razon_social: "Peña Ltda", numero_identificacion: "900618467", digito_verificacion: "4", estado: "activo", suscripcion: sub() },
    { id: "2", razon_social: "Otra SAS", numero_identificacion: "80853152", digito_verificacion: "2", estado: "inactivo", suscripcion: null },
    { id: "3", razon_social: "Vieja SAS", numero_identificacion: "900559088", digito_verificacion: "2", estado: "activo", suscripcion: sub({ fecha_fin: "2026-01-01" }) },
  ].map((c) => aFilaEmpresa(c, HOY));

  it("aplana suscripcion y porcentaje", () => {
    expect(filas[0]).toMatchObject({ nit: "900618467-4", porcentaje: 10, fecha_fin: "2027-06-30", estado_plan: "vigente" });
    expect(filas[1]).toMatchObject({ porcentaje: null, fecha_fin: null, estado_plan: "sin_plan" });
  });

  it("busca sin tildes por nombre o NIT", () => {
    expect(filtrarEmpresas(filas, { search: "pena" }).map((f) => f.id)).toEqual(["1"]);
    expect(filtrarEmpresas(filas, { search: "80853" }).map((f) => f.id)).toEqual(["2"]);
  });

  it("combina filtro de plan y de estado", () => {
    expect(filtrarEmpresas(filas, { plan: "vencido" }).map((f) => f.id)).toEqual(["3"]);
    expect(filtrarEmpresas(filas, { estado: "activo", plan: "sin_plan" })).toEqual([]);
  });

  it("cuenta por estado de plan", () => {
    expect(contarPorPlan(filas)).toEqual({ vigente: 1, sin_plan: 1, vencido: 1 });
  });
});

describe("fechas", () => {
  it("formatea y obtiene hoy", () => {
    expect(formatoFecha("2026-10-06")).toBe("06/10/2026");
    expect(formatoFecha(null)).toBe("");
    expect(hoyIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
