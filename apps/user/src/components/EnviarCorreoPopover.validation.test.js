import { describe, expect, it } from "vitest";
import { validateCorreoDestino } from "./EnviarCorreoPopover.validation.js";

describe("validateCorreoDestino", () => {
  it("exige un correo", () => {
    expect(validateCorreoDestino("")).toMatch(/escribe/i);
    expect(validateCorreoDestino("   ")).toMatch(/escribe/i);
  });

  it("rechaza un correo con formato invalido", () => {
    expect(validateCorreoDestino("no-es-un-correo")).toMatch(/inv/i);
    expect(validateCorreoDestino("a@b")).toMatch(/inv/i);
  });

  it("acepta un correo valido, ignorando espacios alrededor", () => {
    expect(validateCorreoDestino("cliente@example.com")).toBe("");
    expect(validateCorreoDestino("  cliente@example.com  ")).toBe("");
  });
});
