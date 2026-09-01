import { useState, useEffect, useCallback } from "react";
import {
  getResolucionDian,
  guardarResolucionDian,
  validarResolucionDian,
} from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import { validateField } from "./ResolutionSettingsPage.validation";

const emptyForm = {
  numero_resolucion: "",
  prefijo: "",
  rango_minimo: "",
  rango_maximo: "",
  fecha_inicio: "",
  fecha_fin: "",
  technical_key: "",
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
    technical_key: resolucion.technical_key,
  };
}

const ALL_FIELDS = Object.keys(emptyForm);

function diasParaVencer(fechaFin) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin}T00:00:00`);
  return Math.round((fin - hoy) / (1000 * 60 * 60 * 24));
}

function estadoBadge(estadoValidacion) {
  if (estadoValidacion === "validada") {
    return { label: "✓ Validada ante la DIAN", className: "bg-white/20" };
  }
  if (estadoValidacion === "error") {
    return { label: "⚠ Error de validación", className: "bg-fiscal-danger/30" };
  }
  return { label: "Pendiente de validar", className: "bg-white/20" };
}

export default function ResolutionSettingsPage() {
  const [resolucion, setResolucion] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const fetchResolucion = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getResolucionDian();
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
      const guardada = await guardarResolucionDian({
        numero_resolucion: formData.numero_resolucion.trim(),
        prefijo: formData.prefijo.trim(),
        rango_minimo: Number(formData.rango_minimo),
        rango_maximo: Number(formData.rango_maximo),
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        technical_key: formData.technical_key.trim(),
      });
      setResolucion(guardada);
      setFormData(formFromResolucion(guardada));
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidar = async () => {
    setIsValidating(true);
    setSaveError(null);
    try {
      const validada = await validarResolucionDian();
      setResolucion(validada);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const dias = resolucion ? diasParaVencer(resolucion.fecha_fin) : null;
  const vencida = dias !== null && dias < 0;
  const proximaAVencer = dias !== null && dias >= 0 && dias <= 30;
  const vigenciaClase = vencida
    ? "text-fiscal-danger"
    : proximaAVencer
      ? "text-fiscal-warning"
      : "text-fiscal-info";
  const vigenciaTexto = vencida
    ? `Venció hace ${Math.abs(dias)} días.`
    : proximaAVencer
      ? `Vence en ${dias} días — renueva pronto.`
      : `Vence en ${dias} días — sin acción requerida.`;

  const totalRango = resolucion ? resolucion.rango_maximo - resolucion.rango_minimo + 1 : 0;
  const usados = resolucion ? resolucion.consecutivo_actual - resolucion.rango_minimo : 0;
  const porcentajeUsado = totalRango > 0 ? Math.min(100, Math.round((usados / totalRango) * 100)) : 0;
  const badge = resolucion ? estadoBadge(resolucion.estado_validacion) : null;

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              Resolución DIAN
            </h2>
            <p className="text-xs text-neutralCustom-500">
              Numeración autorizada para tus facturas electrónicas.
            </p>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando resolución DIAN...
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
                      Aún no has configurado tu Resolución DIAN. Complétala
                      con los datos que te entregó la DIAN para poder emitir
                      facturas electrónicas.
                    </p>
                  </div>
                )}

                {resolucion && (
                  <div className="bg-gradient-to-br from-brand-600 to-brand-400 text-white rounded-brand-lg p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide opacity-90 font-medium">
                          Resolución Activa
                        </p>
                        <p className="text-xl font-bold mt-1">
                          {resolucion.numero_resolucion}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="opacity-90">
                        Consecutivo actual: {resolucion.prefijo}-
                        {resolucion.consecutivo_actual}
                      </span>
                      <span className="opacity-90">
                        Vence: {resolucion.fecha_fin}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full"
                        style={{ width: `${porcentajeUsado}%` }}
                      />
                    </div>
                    <p className="text-xs opacity-80 mt-1.5">
                      {usados.toLocaleString("es-CO")} de{" "}
                      {totalRango.toLocaleString("es-CO")} facturas emitidas
                      con esta resolución
                    </p>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6"
                >
                  <h3 className="text-base font-semibold text-neutralCustom-800 mb-1">
                    Datos de la resolución
                  </h3>
                  <p className="text-xs text-neutralCustom-500 mb-6">
                    Estos valores los emite la DIAN. Guárdalos tal como
                    aparecen en tu resolución.
                  </p>

                  {saveError && (
                    <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                      {saveError}
                    </div>
                  )}
                  {resolucion?.estado_validacion === "error" && resolucion.mensaje_validacion && (
                    <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                      {resolucion.mensaje_validacion}
                    </div>
                  )}
                  {resolucion?.estado_validacion === "validada" && (
                    <div className="mb-4 p-3 bg-brand-50 border border-brand-400 text-brand-700 text-sm rounded-brand-md">
                      Resolución validada correctamente ante Alegra.
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
                        {errors.prefijo && (
                          <p className="mt-1 text-xs text-fiscal-danger">{errors.prefijo}</p>
                        )}
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
                        {errors.fecha_fin ? (
                          <p className="mt-1 text-xs text-fiscal-danger">{errors.fecha_fin}</p>
                        ) : (
                          resolucion &&
                          formData.fecha_fin === resolucion.fecha_fin && (
                            <p className={`text-xs mt-1 ${vigenciaClase}`}>{vigenciaTexto}</p>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="technical_key" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                        Technical Key
                      </label>
                      <input
                        type="text"
                        id="technical_key"
                        name="technical_key"
                        value={formData.technical_key}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-brand-md text-sm font-mono focus:outline-none transition-colors ${
                          errors.technical_key
                            ? "border-fiscal-danger focus:border-fiscal-danger"
                            : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                        }`}
                      />
                      {errors.technical_key && (
                        <p className="mt-1 text-xs text-fiscal-danger">{errors.technical_key}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-neutralCustom-100">
                    <button
                      type="button"
                      onClick={handleValidar}
                      disabled={!resolucion || isValidating || isSaving}
                      className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isValidating ? "Validando..." : "Validar ante Alegra"}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || hasErrors}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </form>

                <div className="bg-neutralCustom-100/60 border border-neutralCustom-200 rounded-brand-lg p-4 flex gap-3">
                  <svg
                    className="w-5 h-5 text-neutralCustom-500 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-xs text-neutralCustom-600 leading-relaxed">
                    El consecutivo interno
                    {resolucion ? ` (${resolucion.consecutivo_actual})` : ""}{" "}
                    lo calcula y controla IngeFact automáticamente al emitir
                    cada factura. No es editable para evitar duplicar
                    números ya usados.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
