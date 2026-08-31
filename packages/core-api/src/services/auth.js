import { apiRequest, publicRequest } from "../apiClient.js";

export async function loginAdmin(email, password) {
  return publicRequest("/api/v1/auth/admin/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function loginTenant(email, password) {
  return publicRequest("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function refreshSession(refreshToken) {
  return publicRequest("/api/v1/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export async function logoutSession(refreshToken) {
  return publicRequest("/api/v1/auth/logout", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export async function getMe() {
  return apiRequest("/api/v1/auth/me");
}
