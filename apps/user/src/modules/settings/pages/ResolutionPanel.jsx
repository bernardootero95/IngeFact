import { useState, useEffect, useCallback } from "react";
import {
  getResolucionDian,
  guardarResolucionDian,
  validarResolucionDian,
  cargarResolucionDesdeAlegra,
} from "@ingefact/core-api";
import { validateField } from "./ResolutionPanel.validation";
import { Button, FormSkeleton, FieldError, fieldA11y } from "@ingefact/ui";

const emptyForm = {
  numero_resolucion: "",
  prefijo: "",
  rango_minimo: "",
  rango_maximo: "",
  fecha_inicio: "",
  fecha_fin: "",
  technical_key: "",
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
    technical_key: resolucion.technical_key,
    consecutivo_actual: String(resolucion.consecutivo_actual),
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

export default function ResolutionPanel() {
  const [resolucion, setResolucion] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingAlegra, setIsLoadingAlegra] = useState(false);
  const [opcionesAlegra, setOpcionesAlegra] = useState(null);

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

  const aplicarDatosAlegra = (datos) => {
    setFormData((prev) => ({
      ...prev,
      numero_resolucion: datos.numero_resolucion,
      prefijo: datos.prefijo,
      rango_minimo: String(datos.rango_minimo),
      rango_maximo: String(datos.rango_maximo),
      fecha_inicio: datos.fecha_inicio,
      fecha_fin: datos.fecha_fin,
      technical_key: datos.technical_key,
    }));
    setErrors({});
    setOpcionesAlegra(null);
  };

  const handleCargarAlegra = async () => {
    setIsLoadingAlegra(true);
    setSaveError(null);
    setOpcionesAlegra(null);
    try {
      const { resoluciones } = await cargarResolucionDesdeAlegra();
      if (resoluciones.length === 1) {
        aplicarDatosAlegra(resoluciones[0]);
      } else {
        // Alegra no indica cual resolucion esta vigente -- con mas de una
        // registrada (ej. la agotada y la de renovacion), el tenant elige.
        setOpcionesAlegra(resoluciones);
      }
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsLoadingAlegra(false);
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
      ? "text-amber-700"
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
    <div className="max-w-2xl space-y-6">
      {loading ? (
        <FormSkeleton label="Cargando resolución DIAN..." />
      ) : (
        <>
          {loadError && (
            <div role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
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
                  Próximo número: {resolucion.prefijo}-
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
              aparecen en tu resolución, o cárgalos automáticamente
              desde Alegra si ya están registrados ahí.
            </p>

            {saveError && (
              <div role="alert" className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {saveError}
              </div>
            )}

            {opcionesAlegra && (
              <div className="mb-4 border border-neutralCustom-200 rounded-brand-md p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-neutralCustom-800">
                    Alegra tiene {opcionesAlegra.length} resoluciones
                    registradas para tu NIT. Elige cuál importar:
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpcionesAlegra(null)}
                    className="text-xs text-neutralCustom-500 hover:text-neutralCustom-700 shrink-0 ml-3"
                  >
                    Cancelar
                  </button>
                </div>
                {opcionesAlegra.map((opcion) => (
                  <div
                    key={`${opcion.numero_resolucion}-${opcion.rango_minimo}`}
                    className="flex justify-between items-center gap-3 bg-neutralCustom-100/60 rounded-brand-md p-3"
                  >
                    <div className="text-sm text-neutralCustom-700">
                      <p className="font-semibold">
                        {opcion.prefijo} · Resolución {opcion.numero_resolucion}
                      </p>
                      <p className="text-xs text-neutralCustom-500">
                        Rango {opcion.rango_minimo}–{opcion.rango_maximo} ·
                        Vigencia {opcion.fecha_inicio} a {opcion.fecha_fin}
                      </p>
                    </div>
                    <Button type="button" onClick={() => aplicarDatosAlegra(opcion)}>
                      Usar esta
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {resolucion?.estado_validacion === "error" && resolucion.mensaje_validacion && (
              <div role="alert" className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {resolucion.mensaje_validacion}
              </div>
            )}
            {resolucion?.estado_validacion === "validada" && (
              <div className="mb-4 p-3 bg-brand-50 border border-brand-400 text-brand-700 text-sm rounded-brand-md">
                Resolución validada correctamente ante Alegra.
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className={`field w-full ${
                      errors.numero_resolucion
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : "focus:ring-2 focus:ring-brand-50"
                    }`}
                    {...fieldA11y("numero_resolucion", errors.numero_resolucion)}
                  />
                  {errors.numero_resolucion && (
                    <FieldError fieldId={"numero_resolucion"}>{errors.numero_resolucion}</FieldError>
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
                    className={`field w-full ${
                      errors.prefijo
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : "focus:ring-2 focus:ring-brand-50"
                    }`}
                    {...fieldA11y("prefijo", errors.prefijo)}
                  />
                  {errors.prefijo && (
                    <FieldError fieldId={"prefijo"}>{errors.prefijo}</FieldError>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className={`field w-full ${
                      errors.rango_minimo
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : "focus:ring-2 focus:ring-brand-50"
                    }`}
                    {...fieldA11y("rango_minimo", errors.rango_minimo)}
                  />
                  {errors.rango_minimo && (
                    <FieldError fieldId={"rango_minimo"}>{errors.rango_minimo}</FieldError>
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
                    className={`field w-full ${
                      errors.rango_maximo
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : "focus:ring-2 focus:ring-brand-50"
                    }`}
                    {...fieldA11y("rango_maximo", errors.rango_maximo)}
                  />
                  {errors.rango_maximo && (
                    <FieldError fieldId={"rango_maximo"}>{errors.rango_maximo}</FieldError>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className={`field w-full ${
                      errors.fecha_inicio
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : "focus:ring-2 focus:ring-brand-50"
                    }`}
                    {...fieldA11y("fecha_inicio", errors.fecha_inicio)}
                  />
                  {errors.fecha_inicio && (
                    <FieldError fieldId={"fecha_inicio"}>{errors.fecha_inicio}</FieldError>
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
                    className={`field w-full ${
                      errors.fecha_fin
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : "focus:ring-2 focus:ring-brand-50"
                    }`}
                    {...fieldA11y("fecha_fin", errors.fecha_fin)}
                  />
                  {errors.fecha_fin ? (
                    <FieldError fieldId={"fecha_fin"}>{errors.fecha_fin}</FieldError>
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
                  className={`field w-full font-mono ${
                    errors.technical_key
                      ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                      : "focus:ring-2 focus:ring-brand-50"
                  }`}
                  {...fieldA11y("technical_key", errors.technical_key)}
                />
                {errors.technical_key && (
                  <FieldError fieldId={"technical_key"}>{errors.technical_key}</FieldError>
                )}
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
                  className={`field w-full ${
                    errors.consecutivo_actual
                      ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                      : "focus:ring-2 focus:ring-brand-50"
                  }`}
                  {...fieldA11y("consecutivo_actual", errors.consecutivo_actual)}
                />
                {errors.consecutivo_actual ? (
                  <FieldError fieldId={"consecutivo_actual"}>{errors.consecutivo_actual}</FieldError>
                ) : (
                  <p className="mt-1 text-sm text-neutralCustom-500">
                    Déjalo vacío para iniciar en el rango mínimo. Solo
                    cámbialo si esta numeración ya tiene documentos
                    emitidos fuera de IngeFact (por ejemplo, al
                    cargarla desde Alegra).
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutralCustom-100">
              <Button
                onClick={handleCargarAlegra}
                disabled={isLoadingAlegra || isValidating || isSaving}
                title="Cargar la resolución desde Alegra"
                loading={isLoadingAlegra}
              >
                Importar
              </Button>
              <Button
                onClick={handleValidar}
                disabled={!resolucion || isValidating || isSaving}
                title="Validar ante Alegra"
                loading={isValidating}
              >
                Validar
              </Button>
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
              El próximo número
              {resolucion ? ` (${resolucion.consecutivo_actual})` : ""}{" "}
              lo calcula y controla IngeFact automáticamente al emitir
              cada factura. Puedes ajustarlo manualmente en el campo
              "Consecutivo Actual" de arriba, pero una vez que IngeFact
              emita documentos con esta numeración no podrás
              retrocederlo, para evitar duplicar números ya usados.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
