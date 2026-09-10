import { describe, expect, it } from "vitest";
import { calculateNitDV } from "./dian.js";

describe("calculateNitDV", () => {
  it("calcula el DV para NITs reales conocidos", () => {
    expect(calculateNitDV("900123456")).toBe("8");
    expect(calculateNitDV("800197268")).toBe("4");
  });

  it("ignora caracteres no numericos", () => {
    expect(calculateNitDV("900.123.456")).toBe(calculateNitDV("900123456"));
  });

  it("retorna vacio para entrada vacia", () => {
    expect(calculateNitDV("")).toBe("");
    expect(calculateNitDV(null)).toBe("");
  });
});
