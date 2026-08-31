import { create } from "zustand";
import { configureApiClient } from "./apiClient.js";
import { refreshSession, logoutSession, getMe } from "./services/auth.js";

/**
 * Fabrica un store de sesion (Zustand) parametrizado por la funcion de login
 * (admin vs tenant) y la clave de localStorage del refresh token -- evita
 * duplicar entre apps/admin y apps/user la logica de restore/refresh/logout,
 * identica salvo esos dos parametros (incluyendo el manejo de refresh token
 * de un solo uso bajo React StrictMode, ver restoreSession).
 */
export function createAuthStore({ apiUrl, login: loginFn, refreshTokenKey }) {
  let accessToken = null;
  let restoreSessionPromise = null;

  const useAuthStore = create((set, get) => ({
    user: null,
    profile: null,
    loading: true,

    login: async (email, password) => {
      const tokens = await loginFn(email, password);
      accessToken = tokens.access_token;
      localStorage.setItem(refreshTokenKey, tokens.refresh_token);

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
        const refreshToken = localStorage.getItem(refreshTokenKey);
        if (!refreshToken) {
          set({ user: null, profile: null, loading: false });
          return;
        }

        try {
          const tokens = await refreshSession(refreshToken);
          accessToken = tokens.access_token;
          localStorage.setItem(refreshTokenKey, tokens.refresh_token);

          const profile = await getMe();
          set({ user: { id: profile.id, email: profile.email }, profile, loading: false });
        } catch {
          accessToken = null;
          localStorage.removeItem(refreshTokenKey);
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
      localStorage.removeItem(refreshTokenKey);
      set({ user: null, profile: null, loading: false });
    },

    logout: async () => {
      const refreshToken = localStorage.getItem(refreshTokenKey);
      if (refreshToken) {
        await logoutSession(refreshToken).catch(() => {});
      }
      get().clearSession();
    },
  }));

  configureApiClient({
    apiUrl,
    getAccessToken: () => accessToken,
    getRefreshToken: () => localStorage.getItem(refreshTokenKey),
    onTokensRefreshed: (tokens) => {
      accessToken = tokens.access_token;
      localStorage.setItem(refreshTokenKey, tokens.refresh_token);
    },
    onSessionExpired: () => useAuthStore.getState().clearSession(),
  });

  return useAuthStore;
}
