import { useState, useEffect } from "react";
import { actualizarDatosEmpresa } from "@ingefact/core-api";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";
import Sidebar from "../../../components/Sidebar";
import { validateField } from "./CompanyDataSettingsPage.validation";

const emptyForm = { nombre_comercial: "", telefono: "", direccion: "" };

function formFromEmpresa(empresa) {
  return {
    nombre_comercial: empresa?.nombre_comercial || "",
    telefono: empresa?.telefono || "",
    direccion: empresa?.direccion || "",
  };
}

export default function CompanyDataSettingsPage() {
  const { empresa, loading: loadingEmpresa, refetch } = useCurrentEmpresa();
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (empresa) setFormData(formFromEmpresa(empresa));
  }, [empresa]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    setSaveSuccess(false);
  };

  const handleCancel = () => {
    setFormData(formFromEmpresa(empresa));
    setErrors({});
    setSaveError(null);
    setSaveSuccess(false);
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fields = ["nombre_comercial", "telefono", "direccion"];
    const newErrors = {};
    fields.forEach((f) => {
      newErrors[f] = validateField(f, formData[f]);
    });
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await actualizarDatosEmpresa({
        nombre_comercial: formData.nombre_comercial.trim() || null,
        telefono: formData.telefono.trim() || null,
        direccion: formData.direccion.trim() || null,
      });
      await refetch();
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              Datos de la Empresa
            </h2>
            <p className="text-xs text-neutralCustom-500">
              Información visible en tus facturas electrónicas.
            </p>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            {loadingEmpresa ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">
                Cargando datos de la empresa...
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleSubmit}
                  className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6"
                >
                  <h3 className="text-base font-semibold text-neutralCustom-800 mb-1">
                    Información editable
                  </h3>
                  <p className="text-xs text-neutralCustom-500 mb-6">
                    Puedes actualizar estos datos cuando quieras.
                  </p>

                  {saveError && (
                    <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                      {saveError}
                    </div>
                  )}
                  {saveSuccess && (
                    <div className="mb-4 p-3 bg-brand-50 border border-brand-400 text-brand-700 text-sm rounded-brand-md">
                      Datos actualizados correctamente.
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="nombre_comercial" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                        Nombre comercial
                      </label>
                      <input
                        type="text"
                        id="nombre_comercial"
                        name="nombre_comercial"
                        value={formData.nombre_comercial}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                          errors.nombre_comercial
                            ? "border-fiscal-danger focus:border-fiscal-danger"
                            : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                        }`}
                      />
                      <p className="text-xs text-neutralCustom-500 mt-1">
                        Nombre bajo el cual te conocen tus clientes (puede
                        diferir de la razón social).
                      </p>
                      {errors.nombre_comercial && (
                        <p className="mt-1 text-xs text-fiscal-danger">
                          {errors.nombre_comercial}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="telefono" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                        Teléfono de contacto
                      </label>
                      <input
                        type="tel"
                        id="telefono"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                          errors.telefono
                            ? "border-fiscal-danger focus:border-fiscal-danger"
                            : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                        }`}
                        placeholder="+57 1 234 5678"
                      />
                      {errors.telefono && (
                        <p className="mt-1 text-xs text-fiscal-danger">
                          {errors.telefono}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="direccion" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                        Dirección
                      </label>
                      <input
                        type="text"
                        id="direccion"
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-brand-md text-sm focus:outline-none transition-colors ${
                          errors.direccion
                            ? "border-fiscal-danger focus:border-fiscal-danger"
                            : "border-neutralCustom-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
                        }`}
                      />
                      {errors.direccion && (
                        <p className="mt-1 text-xs text-fiscal-danger">
                          {errors.direccion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-neutralCustom-100">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                    >
                      Cancelar
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

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <div className="flex items-start gap-3 mb-6">
                    <svg
                      className="w-5 h-5 text-neutralCustom-400 shrink-0 mt-0.5"
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
                    <div>
                      <h3 className="text-base font-semibold text-neutralCustom-800">
                        Datos de la licencia
                      </h3>
                      <p className="text-xs text-neutralCustom-500">
                        Estos datos afectan tu habilitación ante la DIAN.
                        Solo el equipo de soporte de IngeFact puede
                        modificarlos.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 opacity-70">
                    <div>
                      <label htmlFor="razon_social_display" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                        Razón Social
                      </label>
                      <input
                        type="text"
                        id="razon_social_display"
                        value={empresa?.razon_social || ""}
                        disabled
                        className="w-full px-4 py-2.5 border border-neutralCustom-200 rounded-brand-md text-sm bg-neutralCustom-50 text-neutralCustom-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nit_display" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                          NIT
                        </label>
                        <input
                          type="text"
                          id="nit_display"
                          value={empresa?.numero_identificacion || ""}
                          disabled
                          className="w-full px-4 py-2.5 border border-neutralCustom-200 rounded-brand-md text-sm bg-neutralCustom-50 text-neutralCustom-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label htmlFor="correo_display" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                          Correo asociado
                        </label>
                        <input
                          type="text"
                          id="correo_display"
                          value={empresa?.correo_electronico || ""}
                          disabled
                          className="w-full px-4 py-2.5 border border-neutralCustom-200 rounded-brand-md text-sm bg-neutralCustom-50 text-neutralCustom-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
