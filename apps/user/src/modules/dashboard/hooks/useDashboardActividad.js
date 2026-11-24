import { useCallback, useEffect, useState } from "react";
import { getTenantDashboardActividad } from "@ingefact/core-api";

/**
 * Carga GET /tenant/dashboard/actividad aparte de los KPIs, para que el panel
 * no espere estas consultas. Un fallo aquí no tumba el resto del dashboard.
 */
export function useDashboardActividad() {
  const [actividad, setActividad] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    return getTenantDashboardActividad()
      .then(setActividad)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let vigente = true;
    getTenantDashboardActividad()
      .then((data) => vigente && setActividad(data))
      .catch((err) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, []);

  return { actividad, error, reintentar: cargar };
}
