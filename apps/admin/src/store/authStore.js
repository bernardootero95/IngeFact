import { create } from "zustand";
import { supabase } from "../../../../packages/core-api/src/supabase";

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,

  setSession: async (session) => {
    if (!session) {
      set({ user: null, profile: null, loading: false });
      return;
    }

    const user = session.user;

    // Consulta a la tabla 'usuarios' configurada para los administradores
    const { data: usuarioData, error } = await supabase
      .from("usuarios")
      .select("id, nombre, email, estado")
      .eq("id", user.id)
      .eq("estado", "activo") // Garantiza que solo ingresen usuarios activos
      .is("eliminado", null) // Excluye usuarios con eliminación lógica
      .single();

    if (error) {
      console.error(
        "Error al obtener el usuario de la base de datos:",
        error.message,
      );
      set({ user, profile: null, loading: false });
    } else {
      set({ user, profile: usuarioData, loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, loading: false });
  },
}));
