import { describe, expect, it } from "vitest";
import { validateField } from "./EmployeeFormPage.validation.js";

describe("EmployeeFormPage validateField", () => {
  it("requiere tipo y numero de documento", () => {
    expect(validateField("tipo_documento", "")).toMatch(/obligatorio/i);
    expect(validateField("tipo_documento", "13")).toBe("");
    expect(validateField("numero_documento", "  ")).toMatch(/obligatorio/i);
    expect(validateField("numero_documento", "1000000000")).toBe("");
  });

  it("requiere primer nombre y primer apellido", () => {
    expect(validateField("primer_nombre", "")).toMatch(/obligatorio/i);
    expect(validateField("primer_apellido", "")).toMatch(/obligatorio/i);
    expect(validateField("primer_nombre", "Juan")).toBe("");
  });

  it("requiere tipo/subtipo de trabajador y tipo de contrato", () => {
    expect(validateField("tipo_trabajador", "")).toMatch(/obligatorio/i);
    expect(validateField("subtipo_trabajador", "")).toMatch(/obligatorio/i);
    expect(validateField("tipo_contrato", "")).toMatch(/obligatorio/i);
    expect(validateField("tipo_trabajador", "01")).toBe("");
  });

  it("el sueldo debe ser un numero mayor a 0", () => {
    expect(validateField("sueldo", "")).toMatch(/mayor a 0/i);
    expect(validateField("sueldo", "0")).toMatch(/mayor a 0/i);
    expect(validateField("sueldo", "abc")).toMatch(/mayor a 0/i);
    expect(validateField("sueldo", "2000000")).toBe("");
  });

  it("requiere municipio y direccion del lugar de trabajo", () => {
    expect(validateField("lugar_trabajo_municipio", "")).toMatch(/obligatorio/i);
    expect(validateField("lugar_trabajo_direccion", "")).toMatch(/obligatoria/i);
    expect(validateField("lugar_trabajo_municipio", "11001")).toBe("");
  });

  it("requiere fecha de ingreso", () => {
    expect(validateField("fecha_ingreso", "")).toMatch(/obligatoria/i);
    expect(validateField("fecha_ingreso", "2024-01-15")).toBe("");
  });

  it("la fecha de retiro no puede ser anterior a la de ingreso", () => {
    const formData = { fecha_ingreso: "2024-01-15" };
    expect(validateField("fecha_retiro", "2023-01-01", formData)).toMatch(/no puede ser anterior/i);
    expect(validateField("fecha_retiro", "2024-06-01", formData)).toBe("");
    expect(validateField("fecha_retiro", "", formData)).toBe("");
  });

  it("no valida campos sin regla (telefono, campo desconocido)", () => {
    expect(validateField("telefono", "")).toBe("");
    expect(validateField("campo_desconocido", "cualquier valor")).toBe("");
  });
});
