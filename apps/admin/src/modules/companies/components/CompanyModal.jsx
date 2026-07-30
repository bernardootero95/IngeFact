import React, { useState, useEffect } from "react";
import { supabase } from "@ingefact/core-api";

export default function CompanyModal({
  isOpen,
  onClose,
  currentCompany,
  onSaveSuccess,
}) {
  const [activeTab, setActiveTab] = useState("empresa");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // ESTADOS: DATOS DE LA EMPRESA
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [digitoVerificacion, setDigitoVerificacion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [regimen, setRegimen] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correoElectronico, setCorreoElectronico] = useState("");
  const [notificacionCorreo, setNotificacionCorreo] = useState(true);
  const [tipoOrganizacion, setTipoOrganizacion] = useState("");
  const [idAlegra, setIdAlegra] = useState("");
  const [estadoEmpresa, setEstadoEmpresa] = useState("activo");

  // ESTADOS: DATOS DE SUSCRIPCIÓN
  const [maxDocumentos, setMaxDocumentos] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // ESTADOS: ERRORES
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (currentCompany) {
        setRazonSocial(currentCompany.razon_social || "");
        setNombreComercial(currentCompany.nombre_comercial || "");
        setNumeroIdentificacion(currentCompany.numero_identificacion || "");
        setDigitoVerificacion(currentCompany.digito_verificacion || "");
        setDireccion(currentCompany.direccion || "");
        setDepartamento(currentCompany.departamento || "");
        setMunicipio(currentCompany.municipio || "");
        setRegimen(currentCompany.regimen || "");
        setTelefono(currentCompany.telefono || "");
        setCorreoElectronico(currentCompany.correo_electronico || "");
        setNotificacionCorreo(currentCompany.notificacion_correo ?? true);
        setTipoOrganizacion(currentCompany.tipo_organizacion || "");
        setIdAlegra(currentCompany.id_alegra || "");
        setEstadoEmpresa(currentCompany.estado || "activo");

        const sub = currentCompany.suscripciones?.[0];
        if (sub) {
          setMaxDocumentos(sub.max_documentos || "");
          setFechaInicio(sub.fecha_inicio || "");
          setFechaFin(sub.fecha_fin || "");
        } else {
          resetSuscripcion();
        }
      } else {
        resetForm();
      }
      setActiveTab("empresa");
      setErrors({});
      setModalError(null);
    }
  }, [isOpen, currentCompany]);

  const resetSuscripcion = () => {
    setMaxDocumentos("");
    setFechaInicio("");
    setFechaFin("");
  };

  const resetForm = () => {
    setRazonSocial("");
    setNombreComercial("");
    setNumeroIdentificacion("");
    setDigitoVerificacion("");
    setDireccion("");
    setDepartamento("");
    setMunicipio("");
    setRegimen("");
    setTelefono("");
    setCorreoElectronico("");
    setNotificacionCorreo(true);
    setTipoOrganizacion("");
    setIdAlegra("");
    setEstadoEmpresa("activo");
    resetSuscripcion();
  };

  if (!isOpen) return null;

  // VALIDACIONES INMEDIATAS
  const validateField = (field, value) => {
    let errorMsg = "";
    switch (field) {
      case "razonSocial":
        if (!value.trim()) errorMsg = "La razón social es obligatoria.";
        break;
      case "numeroIdentificacion":
        if (!value.trim()) errorMsg = "El NIT es obligatorio.";
        else if (!/^\d+$/.test(value)) errorMsg = "Debe contener solo números.";
        break;
      case "digitoVerificacion":
        if (!value.trim()) errorMsg = "Requerido.";
        else if (!/^\d$/.test(value)) errorMsg = "Un solo dígito.";
        break;
      case "correoElectronico":
        if (!value.trim()) errorMsg = "El correo es obligatorio.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          errorMsg = "Correo inválido.";
        break;
      case "maxDocumentos":
        if (!value) errorMsg = "Obligatorio.";
        else if (isNaN(value) || Number(value) <= 0)
          errorMsg = "Debe ser mayor a 0.";
        break;
      case "fechaInicio":
        if (!value) errorMsg = "Obligatoria.";
        break;
      case "fechaFin":
        if (!value) errorMsg = "Obligatoria.";
        else if (fechaInicio && new Date(value) <= new Date(fechaInicio)) {
          errorMsg = "Debe ser posterior al inicio.";
        }
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (setter, field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setter(value);
    if (e.target.type !== "checkbox") validateField(field, value);
  };

  const checkAllErrors = () => {
    const rSocialErr = validateField("razonSocial", razonSocial);
    const numIdErr = validateField(
      "numeroIdentificacion",
      numeroIdentificacion,
    );
    const dvErr = validateField("digitoVerificacion", digitoVerificacion);
    const emailErr = validateField("correoElectronico", correoElectronico);
    const maxDocErr = validateField("maxDocumentos", maxDocumentos);
    const fInicioErr = validateField("fechaInicio", fechaInicio);
    const fFinErr = validateField("fechaFin", fechaFin);

    return !!(
      rSocialErr ||
      numIdErr ||
      dvErr ||
      emailErr ||
      maxDocErr ||
      fInicioErr ||
      fFinErr
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (checkAllErrors()) {
      setModalError(
        "Por favor, corrige los errores en el formulario antes de guardar.",
      );
      return;
    }

    setSubmitLoading(true);
    setModalError(null);

    try {
      const payload = {
        empresa: {
          razonSocial,
          nombreComercial,
          numeroIdentificacion,
          digitoVerificacion,
          direccion,
          departamento,
          municipio,
          regimen,
          telefono,
          notificacionCorreo,
          tipoOrganizacion,
          estadoEmpresa,
        },
        suscripcion: {
          maxDocumentos,
          fechaInicio,
          fechaFin,
        },
        usuario: {
          correoElectronico,
        },
      };

      const { data, error } = await supabase.functions.invoke("create-tenant", {
        body: payload,
      });

      if (error || data?.error) {
        throw new Error(
          error?.message ||
            data?.error ||
            "Error desconocido al registrar la empresa.",
        );
      }

      setSubmitLoading(false);
      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitLoading(false);
      setModalError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutralCustom-800/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-neutralCustom-100 rounded-brand-lg w-full max-w-3xl shadow-lg flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutralCustom-100 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-neutralCustom-800">
            {currentCompany
              ? "Gestionar Empresa"
              : "Aprovisionar Nueva Empresa"}
          </h3>
          <button
            onClick={onClose}
            className="text-neutralCustom-400 hover:text-neutralCustom-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
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

        <div className="flex border-b border-neutralCustom-100 px-6 shrink-0 bg-neutralCustom-50">
          <button
            type="button"
            onClick={() => setActiveTab("empresa")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "empresa"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-neutralCustom-500 hover:text-neutralCustom-700"
            }`}
          >
            1. Datos de la Empresa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suscripcion")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center ${
              activeTab === "suscripcion"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-neutralCustom-500 hover:text-neutralCustom-700"
            }`}
          >
            2. Suscripción y Accesos
            {(errors.maxDocumentos ||
              errors.fechaInicio ||
              errors.fechaFin ||
              errors.correoElectronico) && (
              <span className="ml-2 w-2 h-2 rounded-full bg-fiscal-danger"></span>
            )}
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {modalError && (
            <div className="mb-6 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
              {modalError}
            </div>
          )}

          <form id="company-form" onSubmit={handleSubmit} className="space-y-6">
            <div className={activeTab === "empresa" ? "block" : "hidden"}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={razonSocial}
                    onChange={handleChange(setRazonSocial, "razonSocial")}
                    className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.razonSocial ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                  />
                  {errors.razonSocial && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.razonSocial}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    value={nombreComercial}
                    onChange={handleChange(
                      setNombreComercial,
                      "nombreComercial",
                    )}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                      NIT *
                    </label>
                    <input
                      type="text"
                      value={numeroIdentificacion}
                      onChange={handleChange(
                        setNumeroIdentificacion,
                        "numeroIdentificacion",
                      )}
                      className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.numeroIdentificacion ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                    />
                    {errors.numeroIdentificacion && (
                      <p className="mt-1 text-[10px] text-fiscal-danger leading-tight">
                        {errors.numeroIdentificacion}
                      </p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                      DV *
                    </label>
                    <input
                      type="text"
                      maxLength={1}
                      value={digitoVerificacion}
                      onChange={handleChange(
                        setDigitoVerificacion,
                        "digitoVerificacion",
                      )}
                      className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm text-center focus:outline-none ${errors.digitoVerificacion ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                    />
                    {errors.digitoVerificacion && (
                      <p className="mt-1 text-[10px] text-fiscal-danger leading-tight">
                        {errors.digitoVerificacion}
                      </p>
                    )}
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 border-t border-neutralCustom-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-neutralCustom-800 mb-4">
                    Contacto y Ubicación
                  </h4>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Dirección Física
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={handleChange(setDireccion, "direccion")}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Cód. Departamento (DIAN)
                  </label>
                  <input
                    type="text"
                    value={departamento}
                    onChange={handleChange(setDepartamento, "departamento")}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Cód. Municipio (DIAN)
                  </label>
                  <input
                    type="text"
                    value={municipio}
                    onChange={handleChange(setMunicipio, "municipio")}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Teléfono / Celular
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={handleChange(setTelefono, "telefono")}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Régimen
                  </label>
                  <select
                    value={regimen}
                    onChange={handleChange(setRegimen, "regimen")}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  >
                    <option value="">Seleccione...</option>
                    <option value="48">Responsable de IVA (48)</option>
                    <option value="49">No Responsable de IVA (49)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={activeTab === "suscripcion" ? "block" : "hidden"}>
              <div className="bg-brand-50/30 border border-brand-100 rounded-brand-md p-4 mb-6">
                <h4 className="text-sm font-bold text-brand-800 mb-2">
                  Usuario Administrador del Tenant
                </h4>
                <p className="text-xs text-brand-600 mb-4">
                  El correo electrónico funcionará como usuario de acceso
                  principal para esta empresa.
                </p>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    disabled={!!currentCompany}
                    value={correoElectronico}
                    onChange={handleChange(
                      setCorreoElectronico,
                      "correoElectronico",
                    )}
                    className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none disabled:opacity-60 ${errors.correoElectronico ? "border-fiscal-danger" : "border-brand-200 focus:border-brand-400"}`}
                  />
                  {errors.correoElectronico && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.correoElectronico}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center">
                  <input
                    type="checkbox"
                    id="notificacionCorreo"
                    checked={notificacionCorreo}
                    onChange={handleChange(
                      setNotificacionCorreo,
                      "notificacionCorreo",
                    )}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="notificacionCorreo"
                    className="ml-2 block text-sm text-neutralCustom-700"
                  >
                    Enviar notificaciones del sistema a este correo
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-1 md:col-span-2 border-b border-neutralCustom-100 pb-2">
                  <h4 className="text-sm font-bold text-neutralCustom-800">
                    Plan de Facturación
                  </h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Máx. Documentos a Emitir *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxDocumentos}
                    onChange={handleChange(setMaxDocumentos, "maxDocumentos")}
                    className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.maxDocumentos ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                    placeholder="Ej: 1200"
                  />
                  {errors.maxDocumentos && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.maxDocumentos}
                    </p>
                  )}
                </div>

                <div className="hidden md:block"></div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={handleChange(setFechaInicio, "fechaInicio")}
                    className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.fechaInicio ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                  />
                  {errors.fechaInicio && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.fechaInicio}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Fecha de Finalización *
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={handleChange(setFechaFin, "fechaFin")}
                    className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.fechaFin ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                  />
                  {errors.fechaFin && (
                    <p className="mt-1 text-xs text-fiscal-danger">
                      {errors.fechaFin}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
                    Estado de la Empresa
                  </label>
                  <select
                    value={estadoEmpresa}
                    onChange={handleChange(setEstadoEmpresa, "estadoEmpresa")}
                    className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo / Suspendido</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-neutralCustom-100 flex justify-end space-x-3 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutralCustom-200 text-neutralCustom-600 text-sm font-medium rounded-brand-md hover:bg-neutralCustom-50 transition-colors"
          >
            Cancelar
          </button>

          {activeTab === "empresa" ? (
            <button
              type="button"
              onClick={() => setActiveTab("suscripcion")}
              className="px-4 py-2 bg-neutralCustom-800 hover:bg-black text-white text-sm font-medium rounded-brand-md transition-colors"
            >
              Siguiente →
            </button>
          ) : (
            <button
              form="company-form"
              type="submit"
              disabled={submitLoading}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading
                ? "Procesando..."
                : currentCompany
                  ? "Actualizar Tenant"
                  : "Crear Tenant y Accesos"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
