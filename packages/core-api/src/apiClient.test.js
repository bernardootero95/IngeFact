import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureApiClient, apiRequest, publicRequest } from "./apiClient.js";

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
    json: async () => body,
  };
}

describe("apiRequest", () => {
  let fetchMock;
  let onTokensRefreshed;
  let onSessionExpired;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    onTokensRefreshed = vi.fn();
    onSessionExpired = vi.fn();
    configureApiClient({
      apiUrl: "http://api.test",
      getAccessToken: () => "access-token",
      getRefreshToken: () => "refresh-token",
      onTokensRefreshed,
      onSessionExpired,
    });
  });

  it("adjunta el Authorization header y devuelve el body parseado", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const result = await apiRequest("/api/v1/empresas");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/empresas",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
      }),
    );
  });

  it("lanza un error legible cuando la respuesta no es ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { detail: "NIT invalido" }));
    await expect(apiRequest("/api/v1/empresas")).rejects.toThrow("NIT invalido");
  });

  it("reintenta una vez tras refrescar el token si la primera respuesta es 401", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "new-token", refresh_token: "new-refresh" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiRequest("/api/v1/empresas");

    expect(result).toEqual({ ok: true });
    expect(onTokensRefreshed).toHaveBeenCalledWith({ access_token: "new-token", refresh_token: "new-refresh" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("dispara onSessionExpired si el refresh tambien falla", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401)).mockResolvedValueOnce(jsonResponse(401));

    await expect(apiRequest("/api/v1/empresas")).rejects.toThrow("Sesion expirada.");
    expect(onSessionExpired).toHaveBeenCalled();
  });
});

describe("publicRequest", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    configureApiClient({ apiUrl: "http://api.test" });
  });

  it("no adjunta Authorization ni reintenta ante un 401", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: "Token invalido" }));

    await expect(publicRequest("/api/v1/auth/refresh", { method: "POST", body: {} })).rejects.toThrow(
      "Token invalido",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
