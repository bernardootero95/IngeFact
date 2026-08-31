import { createAuthStore, loginAdmin } from "@ingefact/core-api";

export const useAuthStore = createAuthStore({
  apiUrl: import.meta.env.VITE_API_URL,
  login: loginAdmin,
  refreshTokenKey: "ingefact_admin_refresh_token",
});
