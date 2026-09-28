import { describe, it, expect } from "vitest";
import { validateTestSetId } from "./HabilitacionCard.validation";

describe("validateTestSetId", () => {
  it("exige el campo", () => {
    expect(validateTestSetId("   ")).toMatch(/obligatorio/i);
  });

  it("rechaza un formato distinto a 8-4-4-4-12", () => {
    expect(validateTestSetId("abc-123")).toMatch(/formato/i);
  });

  it("acepta un TestSetId valido, incluso con letras no hexadecimales y espacios alrededor", () => {
    expect(validateTestSetId(" a70562e0-631e-4ceb-aa65-36887b57dc17 ")).toBe("");
    expect(validateTestSetId("r70562e0-631e-4ceb-aa65-36887b57dc17")).toBe("");
  });
});
