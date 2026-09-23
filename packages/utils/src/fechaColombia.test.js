import { describe, expect, it } from "vitest";
import { fechaHoyColombia } from "./fechaColombia.js";

describe("fechaHoyColombia", () => {
  it("no se adelanta un dia por la conversion a UTC como toISOString()", () => {
    // 23:30 UTC-5 (Colombia) del 23 de septiembre == 04:30 UTC del 24 --
    // toISOString().slice(0,10) daria "2026-09-24" (el bug real).
    const tardeEnColombia = new Date("2026-09-24T04:30:00.000Z");
    expect(fechaHoyColombia(tardeEnColombia)).toBe("2026-09-23");
  });

  it("no se atrasa un dia en la madrugada", () => {
    // 00:30 UTC-5 (Colombia) del 23 de septiembre == 05:30 UTC del mismo dia.
    const madrugadaEnColombia = new Date("2026-09-23T05:30:00.000Z");
    expect(fechaHoyColombia(madrugadaEnColombia)).toBe("2026-09-23");
  });

  it("devuelve el formato YYYY-MM-DD", () => {
    expect(fechaHoyColombia(new Date("2026-01-05T15:00:00.000Z"))).toBe("2026-01-05");
  });
});
