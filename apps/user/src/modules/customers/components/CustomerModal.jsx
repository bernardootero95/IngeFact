import React, { useState, useEffect } from "react";
import { supabase } from "@ingefact/core-api";

export default function CustomerModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    identificationType: "",
    identificationNumber: "",
    name: "",
    email: "",
    phone: "",
    organizationType: "",
    regime: "",
    tax: "",
  });

  // Estado para guardar los catálogos desde la BD
  const [catalogs, setCatalogs] = useState({
    identificationTypes: [],
    organizationTypes: [],
    regimes: [],
    taxes: [],
  });

  const [errors, setErrors] = useState({});
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [isConsulting, setIsConsulting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [consultMessage, setConsultMessage] = useState(null);

  // Cargar tablas de referencia al montar el componente
  useEffect(() => {
    if (isOpen) {
      const fetchReferences = async () => {
        setLoadingCatalogs(true);
        try {
          // Ajusta los nombres de las tablas si son diferentes en tu BD
          const [idRes, orgRes, regRes, taxRes] = await Promise.all([
            supabase
              .from("tipos_identificacion")
              .select("codigo, descripcion")
              .order("descripcion"),
            supabase
              .from("tipos_organizacion")
              .select("codigo, descripcion")
              .order("descripcion"),
            supabase
              .from("regimenes")
              .select("codigo, descripcion")
              .order("descripcion"),
            supabase
              .from("tributos")
              .select("codigo, descripcion")
              .order("descripcion"),
          ]);

          setCatalogs({
            identificationTypes: idRes.data || [],
            organizationTypes: orgRes.data || [],
            regimes: regRes.data || [],
            taxes: taxRes.data || [],
          });

          // Setear valores por defecto si los catálogos traen data
          setFormData((prev) => ({
            ...prev,
            identificationType: idRes.data?.[0]?.codigo || "",
            organizationType: orgRes.data?.[0]?.codigo || "",
            regime: regRes.data?.[0]?.codigo || "",
            tax: taxRes.data?.[0]?.codigo || "",
          }));
        } catch (error) {
          console.error("Error cargando tablas de referencia:", error);
        } finally {
          setLoadingCatalogs(false);
        }
      };

      fetchReferences();
      // Resetear estado al abrir
      setErrors({});
      setConsultMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateField = (name, value) => {
    let error = "";
    if (name === "identificationNumber" && !value.trim())
      error = "La identificación es obligatoria.";
    if (name === "name" && !value.trim())
      error = "La Razón Social / Nombre es obligatorio.";
    if (name === "email") {
      if (!value.trim()) error = "El correo es obligatorio.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        error = "Correo inválido.";
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    if (name === "identificationType" || name === "identificationNumber")
      setConsultMessage(null);
  };

  const handleConsultDIAN = async () => {
    const typeError = validateField(
      "identificationType",
      formData.identificationType,
    );
    const numError = validateField(
      "identificationNumber",
      formData.identificationNumber,
    );

    if (typeError || numError) {
      setErrors((prev) => ({
        ...prev,
        identificationType: typeError,
        identificationNumber: numError,
      }));
      return;
    }

    setIsConsulting(true);
    setConsultMessage(null);

    try {
      const token = import.meta.env.VITE_ALEGRA_TOKEN;
      const response = await fetch(
        `https://api.alegra.com/e-provider/col/v1/acquirer-info?identificationType=${formData.identificationType}&identificationNumber=${formData.identificationNumber}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404)
          throw new Error("Adquiriente no encontrado en la DIAN.");
        if (response.status === 400)
          throw new Error("Datos de consulta inválidos.");
        throw new Error("Error de conexión con el proveedor.");
      }

      const data = await response.json();

      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        email: data.email || prev.email,
      }));

      setErrors((prev) => ({
        ...prev,
        name: validateField("name", data.name || ""),
        email: validateField("email", data.email || ""),
      }));

      setConsultMessage({
        type: "success",
        text: "¡Datos obtenidos exitosamente de la DIAN!",
      });
    } catch (error) {
      setConsultMessage({ type: "error", text: error.message });
    } finally {
      setIsConsulting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      newErrors[key] = validateField(key, formData[key]);
    });

    if (Object.values(newErrors).some((err) => err)) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    // TODO: Enviar formData a la base de datos (tabla clientes)
    setTimeout(() => {
      setIsSaving(false);
      onSave(formData);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutralCustom-800/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-brand-lg w-full max-w-3xl shadow-xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutralCustom-100 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-neutralCustom-800">
            Registrar Cliente
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

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loadingCatalogs ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutralCustom-500">
              <span className="animate-spin text-2xl mb-2">⟳</span>
              <p className="text-sm font-medium">
                Cargando tablas de referencia de la DIAN...
              </p>
            </div>
          ) : (
            <form
              id="customerForm"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Sección de Identificación y Consulta */}
              <div className="bg-neutralCustom-50 p-4 rounded-brand-md border border-neutralCustom-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-neutralCustom-800">
                    Datos de Identificación
                  </h4>
                  <span className="text-xs text-brand-600 font-medium bg-brand-50 px-2 py-1 rounded">
                    Conexión DIAN
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Tipo de Documento{" "}
                      <span className="text-fiscal-danger">*</span>
                    </label>
                    <select
                      name="identificationType"
                      value={formData.identificationType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                    >
                      {catalogs.identificationTypes.map((type) => (
                        <option key={type.codigo} value={type.codigo}>
                          {type.codigo} - {type.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Número de Identificación{" "}
                      <span className="text-fiscal-danger">*</span>
                    </label>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          name="identificationNumber"
                          value={formData.identificationNumber}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                            errors.identificationNumber
                              ? "border-fiscal-danger"
                              : "border-neutralCustom-200 focus:border-brand-400"
                          }`}
                          placeholder="Ej. 900123456"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleConsultDIAN}
                        disabled={
                          isConsulting || !formData.identificationNumber
                        }
                        className="px-3 py-2 bg-neutralCustom-800 hover:bg-neutralCustom-600 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shrink-0"
                      >
                        {isConsulting ? (
                          <span className="animate-spin mr-2">⟳</span>
                        ) : (
                          <svg
                            className="w-4 h-4 mr-1.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        )}
                        Consultar
                      </button>
                    </div>
                    {errors.identificationNumber && (
                      <p className="mt-1 text-xs text-fiscal-danger">
                        {errors.identificationNumber}
                      </p>
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

              {/* Datos Generales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Razón Social / Nombre Completo{" "}
                    <span className="text-fiscal-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.name
                        ? "border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400"
                    }`}
                    placeholder="Ej. IngeFact S.A.S."
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Correo Electrónico{" "}
                    <span className="text-fiscal-danger">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none transition-colors ${
                      errors.email
                        ? "border-fiscal-danger"
                        : "border-neutralCustom-200 focus:border-brand-400"
                    }`}
                    placeholder="facturacion@cliente.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400 transition-colors"
                    placeholder="Ej. 3001234567"
                  />
                </div>
              </div>

              {/* Obligaciones Fiscales DIAN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-neutralCustom-100 pt-5">
                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Tipo de Organización
                  </label>
                  <select
                    name="organizationType"
                    value={formData.organizationType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  >
                    {catalogs.organizationTypes.map((org) => (
                      <option key={org.codigo} value={org.codigo}>
                        {org.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Régimen
                  </label>
                  <select
                    name="regime"
                    value={formData.regime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  >
                    {catalogs.regimes.map((reg) => (
                      <option key={reg.codigo} value={reg.codigo}>
                        {reg.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-600 mb-1">
                    Responsabilidad (Tributo)
                  </label>
                  <select
                    name="tax"
                    value={formData.tax}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  >
                    {catalogs.taxes.map((tax) => (
                      <option key={tax.codigo} value={tax.codigo}>
                        {tax.codigo} - {tax.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
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
            form="customerForm"
            disabled={isSaving || loadingCatalogs}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? "Guardando..." : "Guardar Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
