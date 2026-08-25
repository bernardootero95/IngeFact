import { useState, useEffect } from "react";
import { supabase, listImpuestosEmpresa } from "@ingefact/core-api";
import { SearchableSelect } from "@ingefact/ui";

const TIPOS_PRODUCTO = [
  { value: "bien", label: "Producto" },
  { value: "servicio", label: "Servicio" },
];

const UNIDAD_MEDIDA_DEFAULT = "94";

export default function ProductModal({ isOpen, onClose, onSave, empresaId }) {
  const [formData, setFormData] = useState({
    tipo: "bien",
    codigo: "",
    nombre: "",
    descripcion: "",
    precio: "",
    unidad_medida: "",
    impuestoKey: "",
  });

  const [catalogs, setCatalogs] = useState({
    unidadesMedida: [],
    tributos: [],
    impuestosEmpresa: [],
  });

  const [errors, setErrors] = useState({});
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  useEffect(() => {
    if (isOpen && empresaId) {
      const fetchReferences = async () => {
        setLoadingCatalogs(true);
        try {
          const [unitRes, taxRes, impuestosEmpresa] = await Promise.all([
            supabase
              .from("tipos_unidad")
              .select("code, value")
              .order("value"),
            supabase.from("tributos").select("code, value").order("value"),
            listImpuestosEmpresa(empresaId),
          ]);

          const unidadesMedida = unitRes.data || [];
          setCatalogs({
            unidadesMedida,
            tributos: taxRes.data || [],
            impuestosEmpresa,
          });

          const defaultUnidad =
            unidadesMedida.find((u) => u.code === UNIDAD_MEDIDA_DEFAULT) ||
            unidadesMedida[0];

          setFormData((prev) => ({
            ...prev,
            unidad_medida: defaultUnidad?.code || "",
          }));
        } catch (error) {
          console.error("Error cargando tablas de referencia:", error);
        } finally {
          setLoadingCatalogs(false);
        }
      };

      fetchReferences();
      setFormData((prev) => ({
        ...prev,
        tipo: "bien",
        codigo: "",
        nombre: "",
        descripcion: "",
        precio: "",
        impuestoKey: "",
      }));
      setErrors({});
      setModalError(null);
    }
  }, [isOpen, empresaId]);

  if (!isOpen) return null;

  const tributoNombre = (code) =>
    catalogs.tributos.find((t) => t.code === code)?.value || code;

  const impuestoOptions = catalogs.impuestosEmpresa.map((i) => ({
    key: `${i.tributo}-${i.tarifa}`,
    tributo: i.tributo,
    tarifa: i.tarifa,
    label: `${tributoNombre(i.tributo)} ${i.tarifa}%`,
  }));

  const validateField = (name, value) => {
    let error = "";
    if (name === "codigo" && !value.trim())
      error = "El código interno es obligatorio.";
    if (name === "nombre" && !value.trim())
      error = "El nombre es obligatorio.";
    if (name === "precio") {
      if (value === "" || value === null) error = "El precio es obligatorio.";
      else if (isNaN(value) || Number(value) < 0)
        error = "El precio debe ser un número mayor o igual a 0.";
    }
    if (name === "unidad_medida" && !value)
      error = "La unidad de medida es obligatoria.";
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleUnidadMedidaChange = (code) => {
    handleChange({ target: { name: "unidad_medida", value: code } });
  };

  const buildProductoPayload = () => {
    const preset = impuestoOptions.find((o) => o.key === formData.impuestoKey);
    return {
      tipo: formData.tipo,
      codigo: formData.codigo.trim(),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || null,
      precio: Number(formData.precio),
      unidad_medida: formData.unidad_medida,
      tributo: preset?.tributo || null,
      tarifa_impuesto: preset?.tarifa || 0,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fieldsToValidate = ["codigo", "nombre", "precio", "unidad_medida"];
    const newErrors = {};
    fieldsToValidate.forEach((key) => {
      newErrors[key] = validateField(key, formData[key]);
    });

    if (Object.values(newErrors).some((err) => err)) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setModalError(null);
    try {
      await onSave(buildProductoPayload());
      onClose();
    } catch (error) {
      if (error.code === "23505") {
        setModalError("Ya tienes un producto con ese código interno.");
      } else {
        setModalError(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutralCustom-800/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-brand-lg w-full max-w-3xl shadow-xl flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-neutralCustom-100 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-neutralCustom-800">
            Registrar Producto o Servicio
          </h3>
          <button
            onClick={onClose}
            className="text-neutralCustom-400 hover:text-neutralCustom-600 transition-colors focus:outline-none"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {modalError && (
            <div className="mb-6 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
              {modalError}
            </div>
          )}
          {loadingCatalogs ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutralCustom-500">
              <span className="animate-spin text-2xl mb-2">⟳</span>
              <p className="text-sm font-medium">
                Cargando tablas de referencia de la DIAN...
              </p>
            </div>
          ) : (
            <form
              id="productForm"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Tipo <span className="text-fiscal-danger">*</span>
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  >
                    {TIPOS_PRODUCTO.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Código Interno (SKU){" "}
                    <span className="text-fiscal-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.codigo
                        ? "border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400"
                    }`}
                    placeholder="Ej. PROD-001"
                  />
                  {errors.codigo && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.codigo}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                  Nombre <span className="text-fiscal-danger">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                    errors.nombre
                      ? "border-fiscal-danger"
                      : "border-neutralCustom-200 focus:border-brand-400"
                  }`}
                  placeholder="Ej. Asesoría contable mensual"
                />
                {errors.nombre && (
                  <p className="mt-1 text-xs text-fiscal-danger">
                    {errors.nombre}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  placeholder="Detalle opcional del producto o servicio"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Precio <span className="text-fiscal-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="precio"
                    value={formData.precio}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.precio
                        ? "border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400"
                    }`}
                    placeholder="0.00"
                  />
                  {errors.precio && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.precio}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Unidad de Medida{" "}
                    <span className="text-fiscal-danger">*</span>
                  </label>
                  <SearchableSelect
                    options={catalogs.unidadesMedida}
                    value={formData.unidad_medida}
                    onChange={handleUnidadMedidaChange}
                    placeholder="Buscar unidad de medida..."
                    error={!!errors.unidad_medida}
                  />
                  {errors.unidad_medida && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.unidad_medida}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-neutralCustom-100 pt-5">
                <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                  Impuesto
                </label>
                <select
                  name="impuestoKey"
                  value={formData.impuestoKey}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                >
                  <option value="">Excluido de impuestos</option>
                  {impuestoOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {impuestoOptions.length === 0 && (
                  <p className="mt-1 text-xs text-neutralCustom-400">
                    Aún no tienes impuestos configurados. Ve a Configuración →
                    Impuestos para crearlos.
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutralCustom-100 bg-neutralCustom-50 flex justify-end space-x-3 shrink-0 rounded-b-brand-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="productForm"
            disabled={isSaving || loadingCatalogs}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? "Guardando..." : "Guardar Producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
