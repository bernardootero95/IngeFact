import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getProveedor,
  createProveedor,
  updateProveedor,
  consultarProveedorDian,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import { calculateNitDV } from "@ingefact/utils";
import Sidebar from "../../../components/Sidebar";
import { validateField, NIT_IDENTIFICATION_TYPE } from "./SupplierFormPage.validation";

const emptyForm = {
  tipo_identificacion: "",
  numero_identificacion: "",
  digito_verificacion: "",
  nombre: "",
  correo_electronico: "",
  telefono: "",
};

const REQUIRED_FIELDS = ["tipo_identificacion", "numero_identificacion", "nombre", "correo_electronico"];

export default function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(emptyForm);
  const [catalogs, setCatalogs] = useState({ identificationTypes: [] });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [consultMessage, setConsultMessage] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [identificationTypes, proveedor] = await Promise.all([
        listPublicReferenceTable("tipos_identificacion"),
        isEditing ? getProveedor(id) : Promise.resolve(null),
      ]);

      setCatalogs({ identificationTypes });

      if (proveedor) {
        setFormData({
          tipo_identificacion: proveedor.tipo_identificacion,
          numero_identificacion: proveedor.numero_identificacion,
          digito_verificacion: proveedor.digito_verificacion || "",
          nombre: proveedor.nombre,
          correo_electronico: proveedor.correo_electronico,
          telefono: proveedor.telefono || "",
        });
      } else {
        setFormData({ ...emptyForm, tipo_identificacion: identificationTypes[0]?.code || "" });
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

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "tipo_identificacion") {
        next.digito_verificacion = value === NIT_IDENTIFICATION_TYPE ? calculateNitDV(prev.numero_identificacion) : "";
      } else if (name === "numero_identificacion" && prev.tipo_identificacion === NIT_IDENTIFICATION_TYPE) {
        next.digito_verificacion = calculateNitDV(value);
      }

      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: validateField(name, value, next),
        ...(next.digito_verificacion !== prev.digito_verificacion
          ? { digito_verificacion: validateField("digito_verificacion", next.digito_verificacion, next) }
          : {}),
      }));

      return next;
    });

    if (name === "tipo_identificacion" || name === "numero_identificacion") setConsultMessage(null);
  };

  const handleConsultDIAN = async () => {
    const typeError = validateField("tipo_identificacion", formData.tipo_identificacion);
    const numError = validateField("numero_identificacion", formData.numero_identificacion);

    if (typeError || numError) {
      setErrors((prev) => ({ ...prev, tipo_identificacion: typeError, numero_identificacion: numError }));
      return;
    }

    setIsConsulting(true);
    setConsultMessage(null);
    try {
      const data = await consultarProveedorDian(formData.tipo_identificacion, formData.numero_identificacion);

      setFormData((prev) => ({
        ...prev,
        nombre: data.name || prev.nombre,
        correo_electronico: data.email || prev.correo_electronico,
      }));
      setErrors((prev) => ({
        ...prev,
        nombre: validateField("nombre", data.name || ""),
        correo_electronico: validateField("correo_electronico", data.email || ""),
      }));
      setConsultMessage({ type: "success", text: "¡Datos obtenidos exitosamente de la DIAN!" });
    } catch (error) {
      setConsultMessage({ type: "error", text: error.message });
    } finally {
      setIsConsulting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      newErrors[field] = validateField(field, formData[field], formData);
    });
    newErrors.digito_verificacion = validateField("digito_verificacion", formData.digito_verificacion, formData);
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      tipo_identificacion: formData.tipo_identificacion,
      numero_identificacion: formData.numero_identificacion.trim(),
      digito_verificacion: formData.digito_verificacion || null,
      nombre: formData.nombre.trim(),
      correo_electronico: formData.correo_electronico.trim(),
      telefono: formData.telefono.trim() || null,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await updateProveedor(id, payload);
        navigate(returnTo || "/suppliers");
      } else {
        const creado = await createProveedor(payload);
        navigate(returnTo || "/suppliers", returnTo ? { state: { newProveedorId: creado.id } } : undefined);
      }
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
              {isEditing ? "Editar Proveedor" : "Registrar Proveedor"}
            </h2>
            <p className="text-xs text-neutralCustom-500">
              {isEditing ? "Actualiza los datos de este proveedor." : "Agrega un nuevo proveedor a tu directorio."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(returnTo || "/suppliers")}
            className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
          >
            Cancelar
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</div>
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

                <div className="bg-neutralCustom-50 p-4 rounded-brand-md border border-neutralCustom-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-neutralCustom-800">Datos de Identificación</h4>
                    <span className="text-xs text-brand-600 font-medium bg-brand-50 px-2 py-1 rounded">
                      Conexión DIAN
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tipo_identificacion" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Tipo de Documento <span className="text-fiscal-danger">*</span>
                      </label>
                      <select
                        id="tipo_identificacion"
                        name="tipo_identificacion"
                        value={formData.tipo_identificacion}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                      >
                        {catalogs.identificationTypes.map((type) => (
                          <option key={type.code} value={type.code}>
                            {type.code} - {type.value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="numero_identificacion" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Número de Identificación <span className="text-fiscal-danger">*</span>
                      </label>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            id="numero_identificacion"
                            name="numero_identificacion"
                            value={formData.numero_identificacion}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                              errors.numero_identificacion
                                ? "border-fiscal-danger"
                                : "border-neutralCustom-200 focus:border-brand-400"
                            }`}
                            placeholder="Ej. 900123456"
                          />
                        </div>
                        {formData.tipo_identificacion === NIT_IDENTIFICATION_TYPE && (
                          <div className="w-16 shrink-0">
                            <input
                              type="text"
                              id="digito_verificacion"
                              name="digito_verificacion"
                              readOnly
                              value={formData.digito_verificacion}
                              title="Dígito de verificación (calculado automáticamente)"
                              className={`w-full px-3 py-2 bg-neutralCustom-100 border rounded-brand-md text-sm text-center font-bold text-neutralCustom-600 focus:outline-none cursor-not-allowed ${
                                errors.digito_verificacion ? "border-fiscal-danger" : "border-neutralCustom-200"
                              }`}
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleConsultDIAN}
                          disabled={isConsulting || !formData.numero_identificacion}
                          className="px-3 py-2 bg-neutralCustom-800 hover:bg-neutralCustom-600 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {isConsulting ? "Consultando..." : "Consultar"}
                        </button>
                      </div>
                      {errors.numero_identificacion && (
                        <p className="mt-1 text-xs text-fiscal-danger">{errors.numero_identificacion}</p>
                      )}
                      {errors.digito_verificacion && (
                        <p className="mt-1 text-xs text-fiscal-danger">{errors.digito_verificacion}</p>
                      )}
                    </div>
                  </div>

                  {consultMessage && (
                    <div
                      className={`p-3 rounded-brand-md text-xs font-medium border ${
                        consultMessage.type === "success"
                          ? "bg-brand-50 border-brand-400 text-brand-600"
                          : "bg-red-50 border-fiscal-danger text-fiscal-danger"
                      }`}
                    >
                      {consultMessage.text}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label htmlFor="nombre" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Razón Social / Nombre Completo <span className="text-fiscal-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                        errors.nombre ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                      }`}
                      placeholder="Ej. Papelería Nacional S.A.S."
                    />
                    {errors.nombre && <p className="mt-1 text-xs text-fiscal-danger">{errors.nombre}</p>}
                  </div>

                  <div>
                    <label htmlFor="correo_electronico" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Correo Electrónico <span className="text-fiscal-danger">*</span>
                    </label>
                    <input
                      type="email"
                      id="correo_electronico"
                      name="correo_electronico"
                      value={formData.correo_electronico}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                        errors.correo_electronico
                          ? "border-fiscal-danger"
                          : "border-neutralCustom-200 focus:border-brand-400"
                      }`}
                      placeholder="contacto@proveedor.com"
                    />
                    {errors.correo_electronico && (
                      <p className="mt-1 text-xs text-fiscal-danger">{errors.correo_electronico}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-neutralCustom-600 mb-1">Teléfono</label>
                    <input
                      type="text"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400 transition-colors"
                      placeholder="Ej. 3001234567"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <button
                    type="button"
                    onClick={() => navigate(returnTo || "/suppliers")}
                    className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || hasErrors}
                    className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Guardando..." : "Guardar Proveedor"}
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
