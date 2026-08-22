import { describe, it, expect } from "vitest";
import { calculateColombianNITDV } from "./dianHelpers";

describe("calculateColombianNITDV", () => {
  it("calcula el DV para un NIT de un solo dígito", () => {
    expect(calculateColombianNITDV("1")).toBe("8");
  });

  it("calcula el DV para un NIT de varios dígitos", () => {
    expect(calculateColombianNITDV("123456789")).toBe("6");
  });

  it("ignora puntos y guiones en el NIT", () => {
    expect(calculateColombianNITDV("900.222.222")).toBe(
      calculateColombianNITDV("900222222"),
    );
  });

  it("devuelve cadena vacía si el NIT no tiene dígitos", () => {
    expect(calculateColombianNITDV("")).toBe("");
    expect(calculateColombianNITDV("abc")).toBe("");
  });
});
