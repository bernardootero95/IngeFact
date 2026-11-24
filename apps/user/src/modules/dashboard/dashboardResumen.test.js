import { describe, expect, it } from "vitest";
import {
  configuracionCompleta,
  consumoPlan,
  nombreMesAnterior,
  pasosConfiguracion,
  textoDiasPlan,
  textoVariacion,
  variacion,
} from "./dashboardResumen";

const empresaCon = (suscripcion, extra = {}) => ({ id: "e1", razon_social: "Demo", suscripcion, ...extra });

const suscripcion = (over = {}) => ({
  max_documentos: 100,
  documentos_usados: 40,
  fecha_fin: "2027-06-30",
  dias_para_vencer: 200,
  estado_plan: "vigente",
  ...over,
});

describe("variacion", () => {
  it("calcula el porcentaje redondeado y la tendencia", () => {
    expect(variacion(12, 10)).toEqual({ porcentaje: 20, tendencia: "sube" });
    expect(variacion(5, 10)).toEqual({ porcentaje: -50, tendencia: "baja" });
    expect(variacion(10, 10)).toEqual({ porcentaje: 0, tendencia: "igual" });
    expect(variacion(1, 3)).toEqual({ porcentaje: -67, tendencia: "baja" });
  });

  it("es null si el mes anterior fue 0", () => {
    expect(variacion(5, 0)).toBeNull();
    expect(variacion(0, 0)).toBeNull();
  });
});

describe("textoVariacion", () => {
  it("antepone + a las subidas", () => {
    expect(textoVariacion({ porcentaje: 20 }, "octubre")).toBe("+20 % vs. octubre");
    expect(textoVariacion({ porcentaje: -5 }, "octubre")).toBe("-5 % vs. octubre");
    expect(textoVariacion(null, "octubre")).toBeNull();
  });
});

describe("nombreMesAnterior", () => {
  it("en enero devuelve diciembre", () => {
    expect(nombreMesAnterior(new Date(2026, 0, 15))).toBe("diciembre");
    expect(nombreMesAnterior(new Date(2026, 10, 23))).toBe("octubre");
  });
});

describe("consumoPlan", () => {
  it("es null sin plan", () => {
    expect(consumoPlan(empresaCon(null))).toBeNull();
  });

  it("vigente y holgado queda en tono normal", () => {
    expect(consumoPlan(empresaCon(suscripcion()))).toMatchObject({
      usados: 40,
      max: 100,
      disponibles: 60,
      porcentaje: 40,
      tono: "normal",
    });
  });

  it("con pocos documentos o pocos dias queda en aviso", () => {
    expect(consumoPlan(empresaCon(suscripcion({ documentos_usados: 95 }))).tono).toBe("aviso");
    expect(consumoPlan(empresaCon(suscripcion({ dias_para_vencer: 10 }))).tono).toBe("aviso");
  });

  it("sin cupo o vencido queda en critico y no pasa del 100 %", () => {
    const sinCupo = consumoPlan(empresaCon(suscripcion({ documentos_usados: 105, estado_plan: "sin_cupo" })));
    expect(sinCupo).toMatchObject({ tono: "critico", porcentaje: 100, disponibles: 0 });
    expect(consumoPlan(empresaCon(suscripcion({ estado_plan: "vencido" }))).tono).toBe("critico");
  });
});

describe("textoDiasPlan", () => {
  it("cubre vencido, hoy, mañana y dias", () => {
    expect(textoDiasPlan(-3)).toBe("Plan vencido");
    expect(textoDiasPlan(0)).toBe("Vence hoy");
    expect(textoDiasPlan(1)).toBe("Vence mañana");
    expect(textoDiasPlan(45)).toBe("Vence en 45 días");
    expect(textoDiasPlan(null)).toBeNull();
  });
});

describe("pasosConfiguracion", () => {
  it("marca cada paso segun la empresa y los KPIs", () => {
    const pasos = pasosConfiguracion(
      { id_alegra: "abc" },
      { resolucion_configurada: true, clientes_registrados: 2, productos_registrados: 0, tiene_facturas: false },
    );
    expect(pasos.map((p) => [p.id, p.hecho])).toEqual([
      ["alegra", true],
      ["resolucion", true],
      ["cliente", true],
      ["producto", false],
      ["factura", false],
    ]);
    expect(configuracionCompleta(pasos)).toBe(false);
  });

  it("todo hecho es configuracion completa", () => {
    const pasos = pasosConfiguracion(
      { id_alegra: "abc" },
      { resolucion_configurada: true, clientes_registrados: 1, productos_registrados: 1, tiene_facturas: true },
    );
    expect(configuracionCompleta(pasos)).toBe(true);
  });

  it("sin datos todo queda pendiente", () => {
    expect(configuracionCompleta(pasosConfiguracion(null, null))).toBe(false);
  });
});
