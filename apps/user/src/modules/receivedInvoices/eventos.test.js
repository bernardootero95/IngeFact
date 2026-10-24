import { describe, expect, it } from "vitest";
import { ACCIONES_EVENTO, accionPorTipo, mensajeSincronizacion, tipoInicial } from "./eventos.js";

describe("eventos de facturas recibidas", () => {
  it("sigue el orden acuse -> recibo -> aceptar/rechazar", () => {
    expect(ACCIONES_EVENTO.map((a) => a.tipo)).toEqual(["030", "032", "033", "031"]);
  });

  it("accionPorTipo encuentra la accion o null", () => {
    expect(accionPorTipo("032").corto).toBe("Recibir mercancía");
    expect(accionPorTipo("034")).toBeNull();
  });

  it("tipoInicial respeta el tipo pedido solo si esta permitido", () => {
    expect(tipoInicial("033", ["033", "031"])).toBe("033");
    expect(tipoInicial("033", ["030"])).toBe("030");
    expect(tipoInicial("", ["033", "031"])).toBe("");
    expect(tipoInicial(null, [])).toBe("");
  });

  it("mensajeSincronizacion dice cuántos eventos se trajeron de la DIAN", () => {
    expect(mensajeSincronizacion(0)).toMatch(/al día/);
    expect(mensajeSincronizacion(1)).toMatch(/1 evento que/);
    expect(mensajeSincronizacion(3)).toMatch(/3 eventos/);
  });
});
