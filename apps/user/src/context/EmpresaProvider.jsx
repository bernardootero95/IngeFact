import { useEffect, useState } from "react";
import { getMiEmpresa } from "@ingefact/core-api";
import { EmpresaContext } from "./EmpresaContext.js";

/**
 * Resuelve UNA vez por sesión de rutas protegidas la empresa (tenant) del
 * usuario autenticado, y la comparte vía contexto. Evita que el Sidebar y
 * cada página (Clientes, Facturas, Productos...) hagan su propia consulta
 * duplicada.
 */
export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

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
  };

  return (
    <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>
  );
}
