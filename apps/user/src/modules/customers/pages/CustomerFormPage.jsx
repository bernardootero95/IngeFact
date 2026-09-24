import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getCliente,
  createCliente,
  updateCliente,
  consultarClienteDian,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import { calculateNitDV } from "@ingefact/utils";
import Sidebar from "../../../components/Sidebar";
import { validateField, NIT_IDENTIFICATION_TYPE } from "./CustomerFormPage.validation";
import { Button, FormSkeleton, FieldError, fieldA11y } from "@ingefact/ui";

const emptyForm = {
  tipo_identificacion: "",
  numero_identificacion: "",
  digito_verificacion: "",
  nombre: "",
  correo_electronico: "",
  telefono: "",
  tipo_organizacion: "",
  regimen_fiscal: "",
  regimen: "",
  tributo: "",
};

const REQUIRED_FIELDS = [
  "tipo_identificacion",
  "numero_identificacion",
  "nombre",
  "correo_electronico",
  "regimen_fiscal",
];

export default function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(emptyForm);
  const [catalogs, setCatalogs] = useState({
    identificationTypes: [],
    organizationTypes: [],
    regimes: [],
    taxes: [],
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
      const [identificationTypes, organizationTypes, regimes, taxes, cliente] = await Promise.all([
        listPublicReferenceTable("tipos_identificacion"),
        listPublicReferenceTable("tipos_organizacion"),
        listPublicReferenceTable("responsabilidades_fiscales"),
        listPublicReferenceTable("tributos"),
        isEditing ? getCliente(id) : Promise.resolve(null),
      ]);

      setCatalogs({ identificationTypes, organizationTypes, regimes, taxes });

      if (cliente) {
        setFormData({
          tipo_identificacion: cliente.tipo_identificacion,
          numero_identificacion: cliente.numero_identificacion,
          digito_verificacion: cliente.digito_verificacion || "",
          nombre: cliente.nombre,
          correo_electronico: cliente.correo_electronico,
          telefono: cliente.telefono || "",
          tipo_organizacion: cliente.tipo_organizacion || "",
          regimen_fiscal: cliente.regimen_fiscal || "",
          regimen: cliente.regimen || "",
          tributo: cliente.tributo || "",
        });
      } else {
        setFormData({
          ...emptyForm,
          tipo_identificacion: identificationTypes[0]?.code || "",
          tipo_organizacion: organizationTypes[0]?.code || "",
          regimen: regimes[0]?.code || "",
        });
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

      // El DV es un digito de verificacion derivable matematicamente del NIT
      // (mismo algoritmo que apps/admin/CompanyFormPage) -- se recalcula solo,
      // nunca se pide al usuario. Solo aplica cuando el tipo es NIT (31).
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
      const data = await consultarClienteDian(formData.tipo_identificacion, formData.numero_identificacion);

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
      regimen_fiscal: formData.regimen_fiscal || null,
      regimen: formData.regimen || null,
      tributo: formData.tributo || null,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await updateCliente(id, payload);
        navigate(returnTo || "/customers");
      } else {
        const creado = await createCliente(payload);
        navigate(returnTo || "/customers", returnTo ? { state: { newClienteId: creado.id } } : undefined);
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
              {isEditing ? "Editar Cliente" : "Registrar Cliente"}
            </h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              {isEditing
                ? "Actualiza los datos de este cliente."
                : "Agrega una nueva empresa o persona a tu directorio."}
            </p>
          </div>
          <Button
            onClick={() => navigate(returnTo || "/customers")}
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
                      placeholder="Ej. IngeFact S.A.S."
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
                      placeholder="facturacion@cliente.com"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-neutralCustom-100 pt-5">
                  <div>
                    <label htmlFor="regimen_fiscal" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Régimen Fiscal <span className="text-fiscal-danger" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span>
                    </label>
                    <select
                      id="regimen_fiscal"
                      name="regimen_fiscal"
                      value={formData.regimen_fiscal}
                      onChange={handleChange}
                      className={`field w-full ${
                        errors.regimen_fiscal ? "border-fiscal-danger field-invalid" : ""
                      }`}
                      {...fieldA11y("regimen_fiscal", errors.regimen_fiscal)}
                    >
                      <option value="">Seleccione...</option>
                      <option value="48">48 - Responsable de IVA</option>
                      <option value="49">49 - No responsable de IVA</option>
                    </select>
                    {errors.regimen_fiscal && <FieldError fieldId={"regimen_fiscal"}>{errors.regimen_fiscal}</FieldError>}
                  </div>

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
                      {catalogs.organizationTypes.map((org) => (
                        <option key={org.code} value={org.code}>
                          {org.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="regimen" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Responsabilidad Fiscal
                    </label>
                    <select
                      id="regimen"
                      name="regimen"
                      value={formData.regimen}
                      onChange={handleChange}
                      className="field w-full"
                    >
                      {catalogs.regimes.map((reg) => (
                        <option key={reg.code} value={reg.code}>
                          {reg.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tributo" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Responsabilidad Tributaria
                    </label>
                    <select
                      id="tributo"
                      name="tributo"
                      value={formData.tributo}
                      onChange={handleChange}
                      className="field w-full"
                    >
                      <option value="">Sin responsabilidad tributaria</option>
                      {catalogs.taxes.map((tax) => (
                        <option key={tax.code} value={tax.code}>
                          {tax.code} - {tax.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button
                    onClick={() => navigate(returnTo || "/customers")}
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
