import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import { listEmpleados, getEmpleado, createEmpleado, updateEmpleado, deleteEmpleado } from "./empleados.js";

describe("empleados", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listEmpleados sin busqueda no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listEmpleados();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/empleados");
  });

  it("listEmpleados con busqueda la codifica en la URL", async () => {
    apiRequest.mockResolvedValue([]);
    await listEmpleados("Juan Perez");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/empleados?search=Juan%20Perez");
  });

  it("getEmpleado hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getEmpleado("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/empleados/1");
  });

  it("createEmpleado hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await createEmpleado({ primer_nombre: "Juan" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/empleados", {
      method: "POST",
      body: { primer_nombre: "Juan" },
    });
  });

  it("updateEmpleado hace PATCH al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await updateEmpleado("1", { primer_nombre: "Juan Carlos" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/empleados/1", {
      method: "PATCH",
      body: { primer_nombre: "Juan Carlos" },
    });
  });

  it("deleteEmpleado hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await deleteEmpleado("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/empleados/1", { method: "DELETE" });
  });
});
