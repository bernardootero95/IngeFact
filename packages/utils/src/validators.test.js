import { describe, expect, it } from "vitest";
import { isValidEmail, isStrongPassword } from "./validators.js";

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

describe("isStrongPassword", () => {
  it("acepta contrasenas con al menos 8 caracteres, letras y numeros", () => {
    expect(isStrongPassword("ClaveNueva123")).toBe(true);
    expect(isStrongPassword("abcdefg1")).toBe(true);
  });

  it("rechaza contrasenas cortas, sin letras o sin numeros", () => {
    expect(isStrongPassword("")).toBe(false);
    expect(isStrongPassword("short1")).toBe(false);
    expect(isStrongPassword("soloLetras")).toBe(false);
    expect(isStrongPassword("12345678")).toBe(false);
  });
});
