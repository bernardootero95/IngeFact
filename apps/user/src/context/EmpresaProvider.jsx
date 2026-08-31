import { useCallback, useEffect, useState } from "react";
import { getMiEmpresa } from "@ingefact/core-api";
import { EmpresaContext } from "./EmpresaContext.js";

/**
 * Resuelve la empresa (tenant) del usuario autenticado y la comparte vía
 * contexto. Evita que el Sidebar y cada página (Clientes, Facturas,
 * Productos...) hagan su propia consulta duplicada. Expone `refetch` para
 * cuando una página (ej. Datos de la Empresa) edita la empresa y necesita
 * que el resto de la UI (ej. el nombre en el Sidebar) refleje el cambio sin
 * recargar la página completa.
 */
export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    return getMiEmpresa()
      .then((data) => {
        setEmpresa(data);
        setError(null);
        return data;
      })
      .catch((err) => {
        setError(err);
        throw err;
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getMiEmpresa()
      .then((data) => {
        if (!cancelled) setEmpresa(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    empresa,
    empresaId: empresa?.id ?? null,
    loading,
    error,
    refetch,
  };

  return (
    <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>
  );
}
