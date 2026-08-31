let getAccessToken = () => null;
let getRefreshToken = () => null;
let onTokensRefreshed = () => {};
let onSessionExpired = () => {};

/**
 * Cada app (admin/user) conecta este cliente con su propio store de sesión --
 * core-api no conoce Zustand ni localStorage directamente.
 */
export function configureApiClient({
  apiUrl,
  getAccessToken: getAccess,
  getRefreshToken: getRefresh,
  onTokensRefreshed: onRefreshed,
  onSessionExpired: onExpired,
}) {
  baseUrl = apiUrl;
  getAccessToken = getAccess;
  getRefreshToken = getRefresh;
  onTokensRefreshed = onRefreshed || onTokensRefreshed;
  onSessionExpired = onExpired || onSessionExpired;
}

let baseUrl = null;

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function doFetch(path, options) {
  const accessToken = getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return false;

  const tokens = await response.json();
  onTokensRefreshed(tokens);
  return true;
}

/**
 * Llama a un endpoint publico (login, refresh, logout, forgot/reset-password):
 * no adjunta Authorization ni reintenta -- un 401 aqui significa credencial/
 * token invalido, no "access token expirado", asi que reintentar via refresh
 * seria un loop sin sentido.
 */
export async function publicRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseBody(response);
  if (!response.ok) {
    const message = (data && (data.detail || data.message)) || `Error ${response.status}`;
    const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
    error.status = response.status;
    throw error;
  }
  return data;
}

/**
 * Llama a la API FastAPI. Si el access token expiró (401), intenta refrescar
 * la sesión una vez y reintenta la request original antes de rendirse.
 */
export async function apiRequest(path, { method = "GET", body, headers } = {}) {
  let response = await doFetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (!refreshed) {
      onSessionExpired();
      throw new Error("Sesion expirada.");
    }
    response = await doFetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  const data = await parseBody(response);
  if (!response.ok) {
    const message = (data && (data.detail || data.message)) || `Error ${response.status}`;
    const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
    error.status = response.status;
    throw error;
  }
  return data;
}
