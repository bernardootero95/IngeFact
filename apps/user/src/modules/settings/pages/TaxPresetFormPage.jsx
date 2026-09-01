import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getImpuestoEmpresa,
  createImpuestoEmpresa,
  updateImpuestoEmpresa,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";

function validateField(name, value) {
  if (name === "tributo" && !value) return "El tributo es obligatorio.";
  if (name === "tarifa") {
    if (value === "" || value === null) return "La tarifa es obligatoria.";
    if (isNaN(value) || Number(value) < 0 || Number(value) > 100) return "La tarifa debe estar entre 0 y 100.";
  }
  return "";
}

const REQUIRED_FIELDS = ["tributo", "tarifa"];

export default function TaxPresetFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({ tributo: "", tarifa: "" });
  const [tributos, setTributos] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [tributosCatalog, impuesto] = await Promise.all([
        listPublicReferenceTable("tributos"),
        isEditing ? getImpuestoEmpresa(id) : Promise.resolve(null),
      ]);
      setTributos(tributosCatalog);

      if (impuesto) {
        setFormData({ tributo: impuesto.tributo, tarifa: String(impuesto.tarifa) });
      } else {
        setFormData({ tributo: tributosCatalog[0]?.code || "", tarifa: "" });
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

    const payload = { tributo: formData.tributo, tarifa: Number(formData.tarifa) };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await updateImpuestoEmpresa(id, payload);
      } else {
        await createImpuestoEmpresa(payload);
      }
      navigate("/settings/taxes");
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
              {isEditing ? "Editar Impuesto" : "Nuevo Impuesto"}
            </h2>
            <p className="text-xs text-neutralCustom-500">
              Combinación de tributo y tarifa que podrás elegir al crear productos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/settings/taxes")}
            className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
          >
            Cancelar
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-lg">
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
                className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-5"
              >
                {saveError && (
                  <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    {saveError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Tributo <span className="text-fiscal-danger">*</span>
                  </label>
                  <select
                    name="tributo"
                    value={formData.tributo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  >
                    {tributos.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.code} - {t.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Tarifa (%) <span className="text-fiscal-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    name="tarifa"
                    value={formData.tarifa}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.tarifa ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                    }`}
                    placeholder="Ej. 19"
                  />
                  {errors.tarifa && <p className="mt-1 text-xs text-fiscal-danger">{errors.tarifa}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <button
                    type="button"
                    onClick={() => navigate("/settings/taxes")}
                    className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || hasErrors}
                    className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Guardando..." : "Guardar Impuesto"}
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
