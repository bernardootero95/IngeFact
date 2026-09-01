import { describe, expect, it } from "vitest";
import { isValidEmail } from "./validators.js";

describe("isValidEmail", () => {
  it("acepta correos con formato valido", () => {
    expect(isValidEmail("facturacion@cliente.com")).toBe(true);
    expect(isValidEmail("nombre.apellido@empresa.co")).toBe(true);
  });

  it("rechaza correos con formato invalido", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("no-es-un-correo")).toBe(false);
    expect(isValidEmail("falta-dominio@")).toBe(false);
    expect(isValidEmail("@sin-usuario.com")).toBe(false);
    expect(isValidEmail("con espacio@dominio.com")).toBe(false);
  });
});
