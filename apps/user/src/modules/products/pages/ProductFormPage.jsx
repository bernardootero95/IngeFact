import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getProducto,
  createProducto,
  updateProducto,
  listImpuestosEmpresa,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import { SearchableSelect, Button, FormSkeleton, FieldError, fieldA11y } from "@ingefact/ui";
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
  valor_impuesto_excluido: "",
};

const REQUIRED_FIELDS = ["codigo", "nombre", "precio", "unidad_medida"];
const VALIDATED_ON_SUBMIT = [...REQUIRED_FIELDS, "valor_impuesto_excluido"];

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
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
          valor_impuesto_excluido: Number(producto.valor_impuesto_excluido) > 0 ? String(producto.valor_impuesto_excluido) : "",
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
    const next = { ...formData, [name]: value };
    setFormData(next);
    setErrors((prev) => {
      const updated = { ...prev, [name]: validateField(name, value, next) };
      if (name === "precio") {
        updated.valor_impuesto_excluido = validateField(
          "valor_impuesto_excluido",
          next.valor_impuesto_excluido,
          next,
        );
      }
      return updated;
    });
  };

  const handleUnidadMedidaChange = (code) => {
    handleChange({ target: { name: "unidad_medida", value: code } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    VALIDATED_ON_SUBMIT.forEach((field) => {
      newErrors[field] = validateField(field, formData[field], formData);
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
      valor_impuesto_excluido: formData.tipo === "bien" ? Number(formData.valor_impuesto_excluido) || 0 : 0,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await updateProducto(id, payload);
        navigate(returnTo || "/products");
      } else {
        const creado = await createProducto(payload);
        navigate(returnTo || "/products", returnTo ? { state: { newProductoId: creado.id } } : undefined);
      }
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Editar Producto" : "Registrar Producto o Servicio"}
            </h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              {isEditing ? "Actualiza los datos de este ítem." : "Agrega un nuevo ítem a tu catálogo."}
            </p>
          </div>
          <Button
            onClick={() => navigate(returnTo || "/products")}
            variant="ghost"
          >
            Cancelar
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl">
            {loading ? (
              <FormSkeleton label="Cargando..." />
            ) : loadError ? (
              <div role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {loadError}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-6"
              >
                {saveError && (
                  <div role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    {saveError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="tipo" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Tipo <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                    </label>
                    <select
                      id="tipo"
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      className="field w-full"
                    >
                      {TIPOS_PRODUCTO.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="codigo" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Código Interno (SKU) <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                    </label>
                    <input
                      type="text"
                      id="codigo"
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleChange}
                      className={`field w-full ${
                        errors.codigo ? "border-fiscal-danger field-invalid" : ""
                      }`}
                      placeholder="Ej. PROD-001"
                      {...fieldA11y("codigo", errors.codigo)}
                    />
                    {errors.codigo && <FieldError fieldId={"codigo"}>{errors.codigo}</FieldError>}
                  </div>
                </div>

                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Nombre <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className={`field w-full ${
                      errors.nombre ? "border-fiscal-danger field-invalid" : ""
                    }`}
                    placeholder="Ej. Asesoría contable mensual"
                    {...fieldA11y("nombre", errors.nombre)}
                  />
                  {errors.nombre && <FieldError fieldId={"nombre"}>{errors.nombre}</FieldError>}
                </div>

                <div>
                  <label htmlFor="descripcion" className="block text-sm font-medium text-neutralCustom-600 mb-1">Descripción</label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={2}
                    className="field w-full"
                    placeholder="Detalle opcional del producto o servicio"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="precio" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Precio <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="precio"
                      name="precio"
                      value={formData.precio}
                      onChange={handleChange}
                      className={`field w-full ${
                        errors.precio ? "border-fiscal-danger field-invalid" : ""
                      }`}
                      placeholder="0.00"
                      {...fieldA11y("precio", errors.precio)}
                    />
                    {errors.precio && <FieldError fieldId={"precio"}>{errors.precio}</FieldError>}
                  </div>

                  <div>
                    <label htmlFor="unidad_medida" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Unidad de Medida <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                    </label>
                    <SearchableSelect
                      id="unidad_medida"
                      options={catalogs.unidadesMedida}
                      value={formData.unidad_medida}
                      onChange={handleUnidadMedidaChange}
                      placeholder="Buscar unidad de medida..."
                      error={errors.unidad_medida}
                    />
                    <FieldError fieldId="unidad_medida">{errors.unidad_medida}</FieldError>
                  </div>
                </div>

                <div className="border-t border-neutralCustom-100 pt-5">
                  <label htmlFor="impuestoKey" className="block text-sm font-medium text-neutralCustom-600 mb-1">Impuesto</label>
                  <select
                    id="impuestoKey"
                    name="impuestoKey"
                    value={formData.impuestoKey}
                    onChange={handleChange}
                    className="field w-full"
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

                  {formData.tipo === "bien" && formData.impuestoKey && (
                    <div className="mt-4">
                      <label
                        htmlFor="valor_impuesto_excluido"
                        className="block text-sm font-medium text-neutralCustom-600 mb-1"
                      >
                        Impuesto ya pagado excluido de IVA (por unidad)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        id="valor_impuesto_excluido"
                        name="valor_impuesto_excluido"
                        value={formData.valor_impuesto_excluido}
                        onChange={handleChange}
                        className={`field w-full ${
                          errors.valor_impuesto_excluido
                            ? "border-fiscal-danger field-invalid"
                            : ""
                        }`}
                        placeholder="0.00"
                        {...fieldA11y("valor_impuesto_excluido", errors.valor_impuesto_excluido)}
                      />
                      {errors.valor_impuesto_excluido ? (
                        <FieldError fieldId={"valor_impuesto_excluido"}>{errors.valor_impuesto_excluido}</FieldError>
                      ) : (
                        <p className="mt-1 text-xs text-neutralCustom-400">
                          Solo si el precio ya incluye un impuesto monofásico pagado al productor (ICL, IBUA). Ese
                          valor no se factura como impuesto: se resta de la base del IVA.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button
                    onClick={() => navigate(returnTo || "/products")}
                    variant="ghost"
                  >
                    Cancelar
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
