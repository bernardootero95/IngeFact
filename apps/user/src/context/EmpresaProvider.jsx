import { useEffect, useState } from "react";
import { supabase, getEmpresaByUsuarioId } from "@ingefact/core-api";
import { EmpresaContext } from "./EmpresaContext.js";

/**
 * Resuelve UNA vez por sesión de rutas protegidas la empresa (tenant) del
 * usuario autenticado, y la comparte vía contexto. Evita que el Sidebar y
 * cada página (Clientes, Facturas, Sucursales...) hagan su propia consulta
 * duplicada a usuarios_empresas.
 */
export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEmpresa = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const data = await getEmpresaByUsuarioId(user.id);
        if (!cancelled) setEmpresa(data);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEmpresa();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    empresa,
    empresaId: empresa?.empresaId ?? null,
    loading,
    error,
  };

  return (
    <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>
  );
}
