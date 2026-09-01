import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
const publicRequest = vi.fn();
vi.mock("../apiClient.js", () => ({
  apiRequest: (...args) => apiRequest(...args),
  publicRequest: (...args) => publicRequest(...args),
}));

import {
  loginAdmin,
  loginTenant,
  refreshSession,
  logoutSession,
  getMe,
  forgotPasswordAdmin,
  forgotPasswordTenant,
  resetPassword,
} from "./auth.js";

describe("auth", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    publicRequest.mockReset();
  });

  it("loginAdmin llama al endpoint de login de admin", async () => {
    publicRequest.mockResolvedValue({ access_token: "a" });
    await loginAdmin("staff@example.com", "clave123");
    expect(publicRequest).toHaveBeenCalledWith("/api/v1/auth/admin/login", {
      method: "POST",
      body: { email: "staff@example.com", password: "clave123" },
    });
  });

  it("loginTenant llama al endpoint de login de tenant", async () => {
    publicRequest.mockResolvedValue({ access_token: "a" });
    await loginTenant("tenant@example.com", "clave123");
    expect(publicRequest).toHaveBeenCalledWith("/api/v1/auth/login", {
      method: "POST",
      body: { email: "tenant@example.com", password: "clave123" },
    });
  });

  it("refreshSession envia el refresh token", async () => {
    publicRequest.mockResolvedValue({ access_token: "b" });
    await refreshSession("refresh-abc");
    expect(publicRequest).toHaveBeenCalledWith("/api/v1/auth/refresh", {
      method: "POST",
      body: { refresh_token: "refresh-abc" },
    });
  });

  it("logoutSession envia el refresh token", async () => {
    publicRequest.mockResolvedValue(null);
    await logoutSession("refresh-abc");
    expect(publicRequest).toHaveBeenCalledWith("/api/v1/auth/logout", {
      method: "POST",
      body: { refresh_token: "refresh-abc" },
    });
  });

  it("getMe usa apiRequest (requiere sesion activa)", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getMe();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/auth/me");
  });

  it("forgotPasswordAdmin llama al endpoint de forgot-password de admin", async () => {
    publicRequest.mockResolvedValue(null);
    await forgotPasswordAdmin("staff@example.com");
    expect(publicRequest).toHaveBeenCalledWith("/api/v1/auth/admin/forgot-password", {
      method: "POST",
      body: { email: "staff@example.com" },
    });
  });

  it("forgotPasswordTenant llama al endpoint de forgot-password de tenant", async () => {
    publicRequest.mockResolvedValue(null);
    await forgotPasswordTenant("tenant@example.com");
    expect(publicRequest).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
      method: "POST",
      body: { email: "tenant@example.com" },
    });
  });

  it("resetPassword envia el token y la nueva contrasena", async () => {
    publicRequest.mockResolvedValue(null);
    await resetPassword("token-123", "ClaveNueva123!");
    expect(publicRequest).toHaveBeenCalledWith("/api/v1/auth/reset-password", {
      method: "POST",
      body: { token: "token-123", new_password: "ClaveNueva123!" },
    });
  });
});
