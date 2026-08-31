import { createAuthStore, loginTenant } from "@ingefact/core-api";

export const useAuthStore = createAuthStore({
  apiUrl: import.meta.env.VITE_API_URL,
  login: loginTenant,
  refreshTokenKey: "ingefact_user_refresh_token",
});
