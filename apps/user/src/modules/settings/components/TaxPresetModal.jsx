import { useState, useEffect } from "react";
import { supabase } from "@ingefact/core-api";

export default function TaxPresetModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({ tributo: "", tarifa: "" });
  const [tributos, setTributos] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchReferences = async () => {
        setLoadingCatalogs(true);
        try {
          const { data } = await supabase
            .from("tributos")
            .select("code, value")
            .order("value");
          setTributos(data || []);
          setFormData({ tributo: data?.[0]?.code || "", tarifa: "" });
        } catch (error) {
          console.error("Error cargando tributos:", error);
        } finally {
          setLoadingCatalogs(false);
        }
      };

      fetchReferences();
      setErrors({});
      setModalError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateField = (name, value) => {
    let error = "";
    if (name === "tributo" && !value) error = "El tributo es obligatorio.";
    if (name === "tarifa") {
      if (value === "" || value === null) error = "La tarifa es obligatoria.";
      else if (isNaN(value) || Number(value) < 0 || Number(value) > 100)
        error = "La tarifa debe estar entre 0 y 100.";
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {
      tributo: validateField("tributo", formData.tributo),
      tarifa: validateField("tarifa", formData.tarifa),
    };

    if (Object.values(newErrors).some((err) => err)) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setModalError(null);
    try {
      await onSave({
        tributo: formData.tributo,
        tarifa: Number(formData.tarifa),
      });
      onClose();
    } catch (error) {
      if (error.code === "23505") {
        setModalError("Ya tienes configurado ese tributo con esa tarifa.");
      } else {
        setModalError(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutralCustom-800/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-brand-lg w-full max-w-lg shadow-xl flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-neutralCustom-100 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-neutralCustom-800">
            Nuevo Impuesto
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
              <p className="text-sm font-medium">Cargando tributos DIAN...</p>
            </div>
          ) : (
            <form
              id="taxPresetForm"
              onSubmit={handleSubmit}
              className="space-y-5"
            >
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
                    errors.tarifa
                      ? "border-fiscal-danger"
                      : "border-neutralCustom-200 focus:border-brand-400"
                  }`}
                  placeholder="Ej. 19"
                />
                {errors.tarifa && (
                  <p className="mt-1 text-xs text-fiscal-danger">
                    {errors.tarifa}
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
            form="taxPresetForm"
            disabled={isSaving || loadingCatalogs}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? "Guardando..." : "Guardar Impuesto"}
          </button>
        </div>
      </div>
    </div>
  );
}
