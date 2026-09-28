import { useCallback, useEffect, useState } from "react";
import { getHabilitacionesDian } from "@ingefact/core-api";
import { FormSkeleton } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import HabilitacionCard from "./HabilitacionCard";
import { TIPOS_HABILITACION } from "./habilitacionTipos";

export default function HabilitacionDianSettingsPage() {
  const [habilitaciones, setHabilitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setHabilitaciones(await getHabilitacionesDian());
      setLoadError(null);
    } catch (error) {
      setLoadError(error.message);
    }
  }, []);

  useEffect(() => {
    cargar().finally(() => setLoading(false));
  }, [cargar]);

  const consultar = async () => {
    setConsultando(true);
    await cargar();
    setConsultando(false);
  };

  const reemplazar = (actualizada) => {
    setHabilitaciones((prev) => prev.map((h) => (h.tipo === actualizada.tipo ? actualizada : h)));
  };

  const ordenadas = Object.keys(TIPOS_HABILITACION)
    .map((tipo) => habilitaciones.find((h) => h.tipo === tipo))
    .filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Habilitación DIAN</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              Habilita tu empresa ante la DIAN para cada tipo de documento electrónico.
            </p>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            {loading ? (
              <FormSkeleton label="Cargando habilitación..." />
            ) : (
              <>
                {loadError && (
                  <div role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    {loadError}
                  </div>
                )}
                {ordenadas.map((habilitacion) => (
                  <HabilitacionCard
                    key={habilitacion.tipo}
                    habilitacion={habilitacion}
                    onActualizada={reemplazar}
                    onConsultar={consultar}
                    consultando={consultando}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
