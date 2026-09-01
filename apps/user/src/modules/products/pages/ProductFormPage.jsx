import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getProducto,
  createProducto,
  updateProducto,
  listImpuestosEmpresa,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import { SearchableSelect } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import { validateField } from "./ProductFormPage.validation";

const TIPOS_PRODUCTO = [
  { value: "bien", label: "Producto" },
  { value: "servicio", label: "Servicio" },
];

const UNIDAD_MEDIDA_DEFAULT = "94";

const emptyForm = {
  tipo: "bien",
  codigo: "",
  nombre: "",
  descripcion: "",
  precio: "",
  unidad_medida: "",
  impuestoKey: "",
};

const REQUIRED_FIELDS = ["codigo", "nombre", "precio", "unidad_medida"];

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(emptyForm);
  const [catalogs, setCatalogs] = useState({ unidadesMedida: [], tributos: [], impuestosEmpresa: [] });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const tributoNombre = (code) => catalogs.tributos.find((t) => t.code === code)?.value || code;

  const impuestoOptions = catalogs.impuestosEmpresa.map((i) => ({
    key: `${i.tributo}-${i.tarifa}`,
    tributo: i.tributo,
    tarifa: i.tarifa,
    label: `${tributoNombre(i.tributo)} ${i.tarifa}%`,
  }));

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [unidadesMedida, tributos, impuestosEmpresa, producto] = await Promise.all([
        listPublicReferenceTable("tipos_unidad"),
        listPublicReferenceTable("tributos"),
        listImpuestosEmpresa(),
        isEditing ? getProducto(id) : Promise.resolve(null),
      ]);

      setCatalogs({ unidadesMedida, tributos, impuestosEmpresa });

      if (producto) {
        const preset = impuestosEmpresa.find(
          (i) => i.tributo === producto.tributo && Number(i.tarifa) === Number(producto.tarifa_impuesto),
        );
        setFormData({
          tipo: producto.tipo,
          codigo: producto.codigo,
          nombre: producto.nombre,
          descripcion: producto.descripcion || "",
          precio: String(producto.precio),
          unidad_medida: producto.unidad_medida,
          impuestoKey: preset ? `${preset.tributo}-${preset.tarifa}` : "",
        });
      } else {
        const defaultUnidad =
          unidadesMedida.find((u) => u.code === UNIDAD_MEDIDA_DEFAULT) || unidadesMedida[0];
        setFormData({ ...emptyForm, unidad_medida: defaultUnidad?.code || "" });
      }
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleUnidadMedidaChange = (code) => {
    handleChange({ target: { name: "unidad_medida", value: code } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      newErrors[field] = validateField(field, formData[field]);
    });
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    const preset = impuestoOptions.find((o) => o.key === formData.impuestoKey);
    const payload = {
      tipo: formData.tipo,
      codigo: formData.codigo.trim(),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || null,
      precio: Number(formData.precio),
      unidad_medida: formData.unidad_medida,
      tributo: preset?.tributo || null,
      tarifa_impuesto: preset?.tarifa || 0,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await updateProducto(id, payload);
      } else {
        await createProducto(payload);
      }
      navigate("/products");
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Editar Producto" : "Registrar Producto o Servicio"}
            </h2>
            <p className="text-xs text-neutralCustom-500">
              {isEditing ? "Actualiza los datos de este ítem." : "Agrega un nuevo ítem a tu catálogo."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
          >
            Cancelar
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando...
              </div>
            ) : loadError ? (
              <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {loadError}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-6"
              >
                {saveError && (
                  <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    {saveError}
                  </div>
                )}

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
                      Código Interno (SKU) <span className="text-fiscal-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                        errors.codigo ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                      }`}
                      placeholder="Ej. PROD-001"
                    />
                    {errors.codigo && <p className="mt-1 text-xs text-fiscal-danger">{errors.codigo}</p>}
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
                      errors.nombre ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                    }`}
                    placeholder="Ej. Asesoría contable mensual"
                  />
                  {errors.nombre && <p className="mt-1 text-xs text-fiscal-danger">{errors.nombre}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">Descripción</label>
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
                        errors.precio ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                      }`}
                      placeholder="0.00"
                    />
                    {errors.precio && <p className="mt-1 text-xs text-fiscal-danger">{errors.precio}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Unidad de Medida <span className="text-fiscal-danger">*</span>
                    </label>
                    <SearchableSelect
                      options={catalogs.unidadesMedida}
                      value={formData.unidad_medida}
                      onChange={handleUnidadMedidaChange}
                      placeholder="Buscar unidad de medida..."
                      error={!!errors.unidad_medida}
                    />
                    {errors.unidad_medida && (
                      <p className="mt-1 text-xs text-fiscal-danger">{errors.unidad_medida}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-neutralCustom-100 pt-5">
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">Impuesto</label>
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
                      Aún no tienes impuestos configurados. Ve a Configuración → Impuestos para crearlos.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <button
                    type="button"
                    onClick={() => navigate("/products")}
                    className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || hasErrors}
                    className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Guardando..." : "Guardar Producto"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
