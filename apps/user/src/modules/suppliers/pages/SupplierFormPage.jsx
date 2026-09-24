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
import { Button, FormSkeleton, FieldError, fieldA11y } from "@ingefact/ui";

const emptyForm = {
  tipo_identificacion: "",
  numero_identificacion: "",
  digito_verificacion: "",
  nombre: "",
  correo_electronico: "",
  telefono: "",
  tipo_organizacion: "",
  direccion: "",
  departamento: "",
  municipio: "",
};

const REQUIRED_FIELDS = ["tipo_identificacion", "numero_identificacion", "nombre", "correo_electronico"];

export default function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(emptyForm);
  const [catalogs, setCatalogs] = useState({
    identificationTypes: [],
    orgTypes: [],
    departments: [],
    municipalities: [],
  });

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
      const [identificationTypes, orgTypes, departments, municipalities, proveedor] = await Promise.all([
        listPublicReferenceTable("tipos_identificacion"),
        listPublicReferenceTable("tipos_organizacion"),
        listPublicReferenceTable("departamentos"),
        listPublicReferenceTable("municipios"),
        isEditing ? getProveedor(id) : Promise.resolve(null),
      ]);

      setCatalogs({ identificationTypes, orgTypes, departments, municipalities });

      if (proveedor) {
        setFormData({
          tipo_identificacion: proveedor.tipo_identificacion,
          numero_identificacion: proveedor.numero_identificacion,
          digito_verificacion: proveedor.digito_verificacion || "",
          nombre: proveedor.nombre,
          correo_electronico: proveedor.correo_electronico,
          telefono: proveedor.telefono || "",
          tipo_organizacion: proveedor.tipo_organizacion || "",
          direccion: proveedor.direccion || "",
          departamento: proveedor.departamento || "",
          municipio: proveedor.municipio || "",
        });
      } else if (location.state?.prefill) {
        const prefill = location.state.prefill;
        const tipoIdentificacion = prefill.tipo_identificacion || identificationTypes[0]?.code || "";
        setFormData({
          ...emptyForm,
          tipo_identificacion: tipoIdentificacion,
          numero_identificacion: prefill.numero_identificacion || "",
          digito_verificacion:
            tipoIdentificacion === NIT_IDENTIFICATION_TYPE ? calculateNitDV(prefill.numero_identificacion || "") : "",
          nombre: prefill.nombre || "",
        });
      } else {
        setFormData({ ...emptyForm, tipo_identificacion: identificationTypes[0]?.code || "" });
      }
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, location.state]);

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
      } else if (name === "departamento") {
        next.municipio = "";
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
      tipo_organizacion: formData.tipo_organizacion || null,
      direccion: formData.direccion.trim() || null,
      departamento: formData.departamento || null,
      municipio: formData.municipio || null,
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
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Editar Proveedor" : "Registrar Proveedor"}
            </h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              {isEditing ? "Actualiza los datos de este proveedor." : "Agrega un nuevo proveedor a tu directorio."}
            </p>
          </div>
          <Button
            onClick={() => navigate(returnTo || "/suppliers")}
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
                        Tipo de Documento <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                      </label>
                      <select
                        id="tipo_identificacion"
                        name="tipo_identificacion"
                        value={formData.tipo_identificacion}
                        onChange={handleChange}
                        className="field w-full"
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
                        Número de Identificación <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                      </label>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            id="numero_identificacion"
                            name="numero_identificacion"
                            value={formData.numero_identificacion}
                            onChange={handleChange}
                            className={`field w-full ${
                              errors.numero_identificacion
                                ? "border-fiscal-danger field-invalid"
                                : ""
                            }`}
                            placeholder="Ej. 900123456"
                            {...fieldA11y("numero_identificacion", errors.numero_identificacion)}
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
                              aria-label="Dígito de verificación"
                              title="Dígito de verificación (calculado automáticamente)"
                              className={`field w-full bg-neutralCustom-100 text-center font-bold text-neutralCustom-600 cursor-not-allowed ${
                                errors.digito_verificacion ? "border-fiscal-danger field-invalid" : ""
                              }`}
                              {...fieldA11y("digito_verificacion", errors.digito_verificacion)}
                            />
                          </div>
                        )}
                        <Button
                          onClick={handleConsultDIAN}
                          disabled={isConsulting || !formData.numero_identificacion}
                          loading={isConsulting}
                          className="shrink-0"
                        >
                          Consultar
                        </Button>
                      </div>
                      {errors.numero_identificacion && (
                        <FieldError fieldId={"numero_identificacion"}>{errors.numero_identificacion}</FieldError>
                      )}
                      {errors.digito_verificacion && (
                        <FieldError fieldId={"digito_verificacion"}>{errors.digito_verificacion}</FieldError>
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
                      Razón Social / Nombre Completo <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
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
                      placeholder="Ej. Papelería Nacional S.A.S."
                      {...fieldA11y("nombre", errors.nombre)}
                    />
                    {errors.nombre && <FieldError fieldId={"nombre"}>{errors.nombre}</FieldError>}
                  </div>

                  <div>
                    <label htmlFor="correo_electronico" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Correo Electrónico <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                    </label>
                    <input
                      type="email"
                      id="correo_electronico"
                      name="correo_electronico"
                      value={formData.correo_electronico}
                      onChange={handleChange}
                      className={`field w-full ${
                        errors.correo_electronico
                          ? "border-fiscal-danger field-invalid"
                          : ""
                      }`}
                      placeholder="contacto@proveedor.com"
                      {...fieldA11y("correo_electronico", errors.correo_electronico)}
                    />
                    {errors.correo_electronico && (
                      <FieldError fieldId={"correo_electronico"}>{errors.correo_electronico}</FieldError>
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
                      className="field w-full"
                      placeholder="Ej. 3001234567"
                    />
                  </div>
                </div>

                <div className="bg-neutralCustom-50 p-4 rounded-brand-md border border-neutralCustom-100 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-neutralCustom-800">Datos para Documento Soporte</h4>
                    <p className="text-xs text-neutralCustom-500 mt-0.5">
                      Obligatorios si vas a emitirle un Documento Soporte a
                      este proveedor.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tipo_organizacion" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Tipo de Organización
                      </label>
                      <select
                        id="tipo_organizacion"
                        name="tipo_organizacion"
                        value={formData.tipo_organizacion}
                        onChange={handleChange}
                        className="field w-full"
                      >
                        <option value="">Sin especificar</option>
                        {catalogs.orgTypes.map((type) => (
                          <option key={type.code} value={type.code}>
                            {type.value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="direccion" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Dirección
                      </label>
                      <input
                        type="text"
                        id="direccion"
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleChange}
                        className="field w-full"
                        placeholder="Ej. Cra 1 # 2-3"
                      />
                    </div>

                    <div>
                      <label htmlFor="departamento" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Departamento
                      </label>
                      <select
                        id="departamento"
                        name="departamento"
                        value={formData.departamento}
                        onChange={handleChange}
                        className="field w-full"
                      >
                        <option value="">Seleccione un departamento...</option>
                        {catalogs.departments.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="municipio" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Municipio
                      </label>
                      <select
                        id="municipio"
                        name="municipio"
                        value={formData.municipio}
                        onChange={handleChange}
                        disabled={!formData.departamento}
                        className="field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Seleccione un municipio...</option>
                        {catalogs.municipalities
                          .filter((m) => m.department_code === formData.departamento)
                          .map((m) => (
                            <option key={m.code} value={m.code}>
                              {m.value}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button
                    onClick={() => navigate(returnTo || "/suppliers")}
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
