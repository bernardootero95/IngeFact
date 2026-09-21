import { useState, useEffect, useCallback } from "react";
import { getResolucionDocumentoSoporte, guardarResolucionDocumentoSoporte } from "@ingefact/core-api";
import { validateField } from "./SupportDocumentResolutionPanel.validation";
import { Button } from "@ingefact/ui";

const emptyForm = {
  numero_resolucion: "",
  prefijo: "",
  rango_minimo: "",
  rango_maximo: "",
  fecha_inicio: "",
  fecha_fin: "",
  consecutivo_actual: "",
};

function formFromResolucion(resolucion) {
  if (!resolucion) return emptyForm;
  return {
    numero_resolucion: resolucion.numero_resolucion,
    prefijo: resolucion.prefijo,
    rango_minimo: String(resolucion.rango_minimo),
    rango_maximo: String(resolucion.rango_maximo),
    fecha_inicio: resolucion.fecha_inicio,
    fecha_fin: resolucion.fecha_fin,
    consecutivo_actual: String(resolucion.consecutivo_actual),
  };
}

const ALL_FIELDS = Object.keys(emptyForm);

export default function SupportDocumentResolutionPanel() {
  const [resolucion, setResolucion] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const fetchResolucion = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getResolucionDocumentoSoporte();
      setResolucion(data);
      setFormData(formFromResolucion(data));
    } catch (error) {
      if (error.status === 404) {
        setResolucion(null);
        setFormData(emptyForm);
      } else {
        setLoadError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResolucion();
  }, [fetchResolucion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value, nextFormData) }));
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    ALL_FIELDS.forEach((f) => {
      newErrors[f] = validateField(f, formData[f], formData);
    });
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const guardada = await guardarResolucionDocumentoSoporte({
        numero_resolucion: formData.numero_resolucion.trim(),
        prefijo: formData.prefijo.trim(),
        rango_minimo: Number(formData.rango_minimo),
        rango_maximo: Number(formData.rango_maximo),
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        consecutivo_actual: formData.consecutivo_actual === "" ? null : Number(formData.consecutivo_actual),
      });
      setResolucion(guardada);
      setFormData(formFromResolucion(guardada));
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalRango = resolucion ? resolucion.rango_maximo - resolucion.rango_minimo + 1 : 0;
  const usados = resolucion ? resolucion.consecutivo_actual - resolucion.rango_minimo : 0;
  const porcentajeUsado = totalRango > 0 ? Math.min(100, Math.round((usados / totalRango) * 100)) : 0;

  return (
    <div className="max-w-2xl space-y-6">
      {loading ? (
        <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
          Cargando resolución...
        </div>
      ) : (
        <>
          {loadError && (
            <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
              {loadError}
            </div>
          )}

          {!resolucion && !loadError && (
            <div className="bg-neutralCustom-100/60 border border-neutralCustom-200 rounded-brand-lg p-4">
              <p className="text-sm text-neutralCustom-600">
                Aún no has configurado tu Resolución de Documento Soporte. Complétala con los datos que te
                entregó la DIAN para poder emitir Documentos Soporte.
              </p>
            </div>
          )}

          {resolucion && (
            <div className="bg-gradient-to-br from-brand-600 to-brand-400 text-white rounded-brand-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-90 font-medium">Resolución Activa</p>
                  <p className="text-xl font-bold mt-1">{resolucion.numero_resolucion}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="opacity-90">
                  Consecutivo actual: {resolucion.prefijo}-{resolucion.consecutivo_actual}
                </span>
                <span className="opacity-90">Vence: {resolucion.fecha_fin}</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${porcentajeUsado}%` }} />
              </div>
              <p className="text-xs opacity-80 mt-1.5">
                {usados.toLocaleString("es-CO")} de {totalRango.toLocaleString("es-CO")} documentos emitidos
                con esta resolución
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6"
          >
            <h3 className="text-base font-semibold text-neutralCustom-800 mb-1">Datos de la resolución</h3>
            <p className="text-xs text-neutralCustom-500 mb-6">
              Estos valores los emite la DIAN — es una autorización de numeración separada de tu Resolución
              DIAN de facturación.
            </p>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {saveError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="numero_resolucion" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                    Número de Resolución
                  </label>
                  <input
                    type="text"
                    id="numero_resolucion"
                    name="numero_resolucion"
                    value={formData.numero_resolucion}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.numero_resolucion
                        ? "border-fiscal-danger focus:border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                    }`}
                  />
                  {errors.numero_resolucion && (
                    <p className="mt-1 text-xs text-fiscal-danger">{errors.numero_resolucion}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="prefijo" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                    Prefijo
                  </label>
                  <input
                    type="text"
                    id="prefijo"
                    name="prefijo"
                    value={formData.prefijo}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.prefijo
                        ? "border-fiscal-danger focus:border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                    }`}
                  />
                  {errors.prefijo && <p className="mt-1 text-xs text-fiscal-danger">{errors.prefijo}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rango_minimo" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                    Rango Mínimo
                  </label>
                  <input
                    type="number"
                    min="1"
                    id="rango_minimo"
                    name="rango_minimo"
                    value={formData.rango_minimo}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.rango_minimo
                        ? "border-fiscal-danger focus:border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                    }`}
                  />
                  {errors.rango_minimo && (
                    <p className="mt-1 text-xs text-fiscal-danger">{errors.rango_minimo}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="rango_maximo" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                    Rango Máximo
                  </label>
                  <input
                    type="number"
                    min="1"
                    id="rango_maximo"
                    name="rango_maximo"
                    value={formData.rango_maximo}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.rango_maximo
                        ? "border-fiscal-danger focus:border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                    }`}
                  />
                  {errors.rango_maximo && (
                    <p className="mt-1 text-xs text-fiscal-danger">{errors.rango_maximo}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fecha_inicio" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    id="fecha_inicio"
                    name="fecha_inicio"
                    value={formData.fecha_inicio}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.fecha_inicio
                        ? "border-fiscal-danger focus:border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                    }`}
                  />
                  {errors.fecha_inicio && (
                    <p className="mt-1 text-xs text-fiscal-danger">{errors.fecha_inicio}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="fecha_fin" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    id="fecha_fin"
                    name="fecha_fin"
                    value={formData.fecha_fin}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.fecha_fin
                        ? "border-fiscal-danger focus:border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                    }`}
                  />
                  {errors.fecha_fin && <p className="mt-1 text-xs text-fiscal-danger">{errors.fecha_fin}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="consecutivo_actual" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                  Consecutivo Actual
                </label>
                <input
                  type="number"
                  min="1"
                  id="consecutivo_actual"
                  name="consecutivo_actual"
                  value={formData.consecutivo_actual}
                  onChange={handleChange}
                  placeholder={formData.rango_minimo || "Rango mínimo"}
                  className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                    errors.consecutivo_actual
                      ? "border-fiscal-danger focus:border-fiscal-danger"
                      : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                  }`}
                />
                {errors.consecutivo_actual ? (
                  <p className="mt-1 text-xs text-fiscal-danger">{errors.consecutivo_actual}</p>
                ) : (
                  <p className="mt-1 text-xs text-neutralCustom-500">
                    Déjalo vacío para iniciar en el rango mínimo.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutralCustom-100">
              <Button
                type="submit"
                disabled={isSaving || hasErrors}
                variant="primary"
                loading={isSaving}
              >
                Guardar
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
