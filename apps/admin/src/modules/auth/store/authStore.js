import { create } from "zustand";
import { configureApiClient, loginAdmin, refreshSession, logoutSession, getMe } from "@ingefact/core-api";

const REFRESH_TOKEN_KEY = "ingefact_admin_refresh_token";

let accessToken = null;
let restoreSessionPromise = null;

configureApiClient({
  apiUrl: import.meta.env.VITE_API_URL,
  getAccessToken: () => accessToken,
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  onTokensRefreshed: (tokens) => {
    accessToken = tokens.access_token;
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },
  onSessionExpired: () => useAuthStore.getState().clearSession(),
});

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,

  login: async (email, password) => {
    const tokens = await loginAdmin(email, password);
    accessToken = tokens.access_token;
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);

    const profile = await getMe();
    set({ user: { id: profile.id, email: profile.email }, profile, loading: false });
  },

  // El refresh token es de un solo uso (se rota en cada llamada), asi que dos
  // invocaciones concurrentes (ej. el doble efecto de React StrictMode en dev)
  // no pueden ejecutar el flujo por separado -- la segunda debe esperar a la
  // primera en vez de reintentar con un token que la primera ya invalido.
  restoreSession: async () => {
    if (restoreSessionPromise) return restoreSessionPromise;

    restoreSessionPromise = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        set({ user: null, profile: null, loading: false });
        return;
      }

      try {
        const tokens = await refreshSession(refreshToken);
        accessToken = tokens.access_token;
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);

        const profile = await getMe();
        set({ user: { id: profile.id, email: profile.email }, profile, loading: false });
      } catch {
        accessToken = null;
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        set({ user: null, profile: null, loading: false });
      }
    })();

    try {
      await restoreSessionPromise;
    } finally {
      restoreSessionPromise = null;
    }
  },

  clearSession: () => {
    accessToken = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ user: null, profile: null, loading: false });
  },

  logout: async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await logoutSession(refreshToken).catch(() => {});
    }
    useAuthStore.getState().clearSession();
  },
}));
