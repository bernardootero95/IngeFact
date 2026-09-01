import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getEmpresa,
  listReferenceTable,
  crearEmpresa,
  actualizarEmpresa,
  cambiarPlanEmpresa,
} from "@ingefact/core-api";
import { calculateColombianNITDV } from "../../../utils/dianHelpers";
import Sidebar from "../../../components/Sidebar";

const emptyForm = {
  razonSocial: "",
  nombreComercial: "",
  numeroIdentificacion: "",
  digitoVerificacion: "",
  direccion: "",
  departamento: "",
  municipio: "",
  regimen: "",
  telefono: "",
  correoElectronico: "",
  notificacionCorreo: true,
  tipoOrganizacion: "",
  estadoEmpresa: "activo",
  maxDocumentos: "",
  fechaInicio: "",
  fechaFin: "",
};

export default function CompanyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [activeTab, setActiveTab] = useState("empresa");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const [catalogs, setCatalogs] = useState({
    departments: [],
    municipalities: [],
    regimes: [],
    orgTypes: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const byValue = (a, b) => a.value.localeCompare(b.value);
      const [depts, muns, regs, orgs, empresa] = await Promise.all([
        listReferenceTable("departamentos"),
        listReferenceTable("municipios"),
        listReferenceTable("responsabilidades_fiscales"),
        listReferenceTable("tipos_organizacion"),
        isEditing ? getEmpresa(id) : Promise.resolve(null),
      ]);

      setCatalogs({
        departments: [...depts].sort(byValue),
        municipalities: [...muns].sort(byValue),
        regimes: [...regs].sort(byValue),
        orgTypes: [...orgs].sort(byValue),
      });

      if (empresa) {
        setForm({
          razonSocial: empresa.razon_social || "",
          nombreComercial: empresa.nombre_comercial || "",
          numeroIdentificacion: empresa.numero_identificacion || "",
          digitoVerificacion: empresa.digito_verificacion || "",
          direccion: empresa.direccion || "",
          departamento: empresa.departamento || "",
          municipio: empresa.municipio || "",
          regimen: empresa.regimen || "",
          telefono: empresa.telefono || "",
          correoElectronico: empresa.correo_electronico || "",
          notificacionCorreo: empresa.notificacion_correo ?? true,
          tipoOrganizacion: empresa.tipo_organizacion || "",
          estadoEmpresa: empresa.estado || "activo",
          maxDocumentos: empresa.suscripcion?.max_documentos || "",
          fechaInicio: empresa.suscripcion?.fecha_inicio || "",
          fechaFin: empresa.suscripcion?.fecha_fin || "",
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
        if (!String(value).trim()) errorMsg = "Requerido.";
        else if (!/^\d$/.test(value)) errorMsg = "Un solo dígito.";
        break;
      case "correoElectronico":
        if (!value.trim()) errorMsg = "El correo es obligatorio.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errorMsg = "Correo inválido.";
        break;
      case "departamento":
        if (!value) errorMsg = "Seleccione un departamento.";
        break;
      case "municipio":
        if (!value) errorMsg = "Seleccione un municipio.";
        break;
      case "regimen":
        if (!value) errorMsg = "Seleccione una responsabilidad fiscal.";
        break;
      case "tipoOrganizacion":
        if (!value) errorMsg = "Seleccione el tipo de organización.";
        break;
      case "maxDocumentos":
        if (!value) errorMsg = "Obligatorio.";
        else if (isNaN(value) || Number(value) <= 0) errorMsg = "Debe ser mayor a 0.";
        break;
      case "fechaInicio":
        if (!value) errorMsg = "Obligatoria.";
        break;
      case "fechaFin":
        if (!value) errorMsg = "Obligatoria.";
        else if (form.fechaInicio && new Date(value) <= new Date(form.fechaInicio)) {
          errorMsg = "Debe ser posterior al inicio.";
        }
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (e.target.type !== "checkbox") validateField(field, value);
  };

  const handleNitChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    const calculatedDV = val ? calculateColombianNITDV(val) : "";
    setForm((prev) => ({ ...prev, numeroIdentificacion: val, digitoVerificacion: calculatedDV }));
    validateField("numeroIdentificacion", val);
    if (val) validateField("digitoVerificacion", calculatedDV);
  };

  const handleDepartmentChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, departamento: val, municipio: "" }));
    validateField("departamento", val);
    validateField("municipio", "");
  };

  const checkAllErrors = () => {
    const fields = [
      "razonSocial",
      "numeroIdentificacion",
      "digitoVerificacion",
      "correoElectronico",
      "departamento",
      "municipio",
      "regimen",
      "tipoOrganizacion",
      "maxDocumentos",
      "fechaInicio",
      "fechaFin",
    ];
    return fields.map((field) => validateField(field, form[field])).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (checkAllErrors()) {
      setSaveError("Por favor, corrige los errores en el formulario antes de guardar.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const planPayload = {
        max_documentos: Number(form.maxDocumentos),
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
      };

      let empresaId;
      if (isEditing) {
        await actualizarEmpresa(id, {
          razon_social: form.razonSocial,
          nombre_comercial: form.nombreComercial || null,
          direccion: form.direccion || null,
          departamento: form.departamento || null,
          municipio: form.municipio || null,
          regimen: form.regimen || null,
          tipo_organizacion: form.tipoOrganizacion || null,
          telefono: form.telefono || null,
          notificacion_correo: form.notificacionCorreo,
          estado: form.estadoEmpresa,
        });
        empresaId = id;
      } else {
        const creada = await crearEmpresa({
          razon_social: form.razonSocial,
          nombre_comercial: form.nombreComercial || null,
          numero_identificacion: form.numeroIdentificacion,
          digito_verificacion: form.digitoVerificacion,
          direccion: form.direccion || null,
          departamento: form.departamento || null,
          municipio: form.municipio || null,
          regimen: form.regimen,
          tipo_organizacion: form.tipoOrganizacion || null,
          telefono: form.telefono || null,
          correo_electronico: form.correoElectronico,
          notificacion_correo: form.notificacionCorreo,
        });
        empresaId = creada.id;
      }

      await cambiarPlanEmpresa(empresaId, planPayload);
      navigate("/admin/companies");
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMunicipalities = catalogs.municipalities.filter((m) => m.department_code === form.departamento);

  const empresaTabHasErrors = Boolean(
    errors.razonSocial ||
      errors.numeroIdentificacion ||
      errors.departamento ||
      errors.municipio ||
      errors.regimen ||
      errors.tipoOrganizacion,
  );
  const suscripcionTabHasErrors = Boolean(
    errors.maxDocumentos || errors.fechaInicio || errors.fechaFin || errors.correoElectronico,
  );

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Gestionar Empresa" : "Aprovisionar Nueva Empresa"}
            </h2>
            <p className="text-xs text-neutralCustom-500">
              {isEditing ? "Actualiza los datos y el plan de este tenant." : "Crea un nuevo tenant y su plan de facturación."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/companies")}
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
              <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col">
                <div className="flex border-b border-neutralCustom-100 px-6 shrink-0 bg-neutralCustom-50 rounded-t-brand-lg">
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
                    {empresaTabHasErrors && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-fiscal-danger" />}
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
                    {suscripcionTabHasErrors && <span className="ml-2 w-2 h-2 rounded-full bg-fiscal-danger" />}
                  </button>
                </div>

                <div className="p-6">
                  {saveError && (
                    <div className="mb-6 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                      {saveError}
                    </div>
                  )}

                  <form id="company-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className={activeTab === "empresa" ? "block" : "hidden"}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-1 md:col-span-2">
                          <label htmlFor="cf-razon-social" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Razón Social *
                          </label>
                          <input
                            id="cf-razon-social"
                            type="text"
                            value={form.razonSocial}
                            onChange={handleChange("razonSocial")}
                            className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.razonSocial ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                          />
                          {errors.razonSocial && <p className="mt-1 text-xs text-fiscal-danger">{errors.razonSocial}</p>}
                        </div>

                        <div>
                          <label htmlFor="cf-nombre-comercial" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Nombre Comercial
                          </label>
                          <input
                            id="cf-nombre-comercial"
                            type="text"
                            value={form.nombreComercial}
                            onChange={handleChange("nombreComercial")}
                            className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label htmlFor="cf-nit" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                              NIT *
                            </label>
                            <input
                              id="cf-nit"
                              type="text"
                              disabled={isEditing}
                              value={form.numeroIdentificacion}
                              onChange={handleNitChange}
                              className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${errors.numeroIdentificacion ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                            />
                            {errors.numeroIdentificacion && (
                              <p className="mt-1 text-[10px] text-fiscal-danger leading-tight">{errors.numeroIdentificacion}</p>
                            )}
                          </div>
                          <div className="col-span-1">
                            <label htmlFor="cf-dv" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                              DV *
                            </label>
                            <input
                              id="cf-dv"
                              type="text"
                              readOnly
                              value={form.digitoVerificacion}
                              className={`w-full px-3 py-2 bg-neutralCustom-100 border rounded-brand-md text-sm text-center font-bold text-neutralCustom-600 focus:outline-none cursor-not-allowed ${errors.digitoVerificacion ? "border-fiscal-danger" : "border-neutralCustom-200"}`}
                            />
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 border-t border-neutralCustom-100 pt-4 mt-2">
                          <h4 className="text-sm font-bold text-neutralCustom-800 mb-4">Contacto y Ubicación</h4>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                          <label htmlFor="cf-direccion" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Dirección Física
                          </label>
                          <input
                            id="cf-direccion"
                            type="text"
                            value={form.direccion}
                            onChange={handleChange("direccion")}
                            className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                          />
                        </div>

                        <div>
                          <label htmlFor="cf-departamento" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Departamento (DIAN) *
                          </label>
                          <select
                            id="cf-departamento"
                            value={form.departamento}
                            onChange={handleDepartmentChange}
                            className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.departamento ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                          >
                            <option value="">Seleccione un departamento...</option>
                            {catalogs.departments.map((d) => (
                              <option key={d.id} value={d.code}>
                                {d.code} - {d.value}
                              </option>
                            ))}
                          </select>
                          {errors.departamento && <p className="mt-1 text-[10px] text-fiscal-danger">{errors.departamento}</p>}
                        </div>

                        <div>
                          <label htmlFor="cf-municipio" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Municipio (DIAN) *
                          </label>
                          <select
                            id="cf-municipio"
                            value={form.municipio}
                            onChange={handleChange("municipio")}
                            disabled={!form.departamento}
                            className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${errors.municipio ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                          >
                            <option value="">Seleccione un municipio...</option>
                            {filteredMunicipalities.map((m) => (
                              <option key={m.id} value={m.code}>
                                {m.code} - {m.value}
                              </option>
                            ))}
                          </select>
                          {errors.municipio && <p className="mt-1 text-[10px] text-fiscal-danger">{errors.municipio}</p>}
                        </div>

                        <div>
                          <label htmlFor="cf-regimen" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Responsabilidad Fiscal *
                          </label>
                          <select
                            id="cf-regimen"
                            value={form.regimen}
                            onChange={handleChange("regimen")}
                            className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.regimen ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                          >
                            <option value="">Seleccione...</option>
                            {catalogs.regimes.map((r) => (
                              <option key={r.id} value={r.code}>
                                {r.code} - {r.value}
                              </option>
                            ))}
                          </select>
                          {errors.regimen && <p className="mt-1 text-[10px] text-fiscal-danger">{errors.regimen}</p>}
                        </div>

                        <div>
                          <label htmlFor="cf-tipo-org" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Tipo de Organización *
                          </label>
                          <select
                            id="cf-tipo-org"
                            value={form.tipoOrganizacion}
                            onChange={handleChange("tipoOrganizacion")}
                            className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.tipoOrganizacion ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                          >
                            <option value="">Seleccione...</option>
                            {catalogs.orgTypes.map((o) => (
                              <option key={o.id} value={o.code}>
                                {o.code} - {o.value}
                              </option>
                            ))}
                          </select>
                          {errors.tipoOrganizacion && (
                            <p className="mt-1 text-[10px] text-fiscal-danger">{errors.tipoOrganizacion}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="cf-telefono" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Teléfono / Celular
                          </label>
                          <input
                            id="cf-telefono"
                            type="text"
                            value={form.telefono}
                            onChange={handleChange("telefono")}
                            className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={activeTab === "suscripcion" ? "block" : "hidden"}>
                      <div className="bg-brand-50/30 border border-brand-100 rounded-brand-md p-4 mb-6">
                        <h4 className="text-sm font-bold text-brand-800 mb-2">Usuario Administrador del Tenant</h4>
                        <p className="text-xs text-brand-600 mb-4">
                          El correo electrónico funcionará como usuario de acceso principal para esta empresa.
                        </p>

                        <div>
                          <label htmlFor="cf-correo" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Correo Electrónico *
                          </label>
                          <input
                            id="cf-correo"
                            type="email"
                            disabled={isEditing}
                            value={form.correoElectronico}
                            onChange={handleChange("correoElectronico")}
                            className={`w-full px-3 py-2 bg-white border rounded-brand-md text-sm focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${errors.correoElectronico ? "border-fiscal-danger" : "border-brand-200 focus:border-brand-400"}`}
                          />
                          {errors.correoElectronico && (
                            <p className="mt-1 text-xs text-fiscal-danger">{errors.correoElectronico}</p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center">
                          <input
                            type="checkbox"
                            id="cf-notificacion-correo"
                            checked={form.notificacionCorreo}
                            onChange={handleChange("notificacionCorreo")}
                            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                          />
                          <label htmlFor="cf-notificacion-correo" className="ml-2 block text-sm text-neutralCustom-700">
                            Enviar notificaciones del sistema a este correo
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-1 md:col-span-2 border-b border-neutralCustom-100 pb-2">
                          <h4 className="text-sm font-bold text-neutralCustom-800">Plan de Facturación</h4>
                        </div>

                        <div>
                          <label htmlFor="cf-max-docs" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Máx. Documentos a Emitir *
                          </label>
                          <input
                            id="cf-max-docs"
                            type="number"
                            min="1"
                            value={form.maxDocumentos}
                            onChange={handleChange("maxDocumentos")}
                            className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.maxDocumentos ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                            placeholder="Ej: 1200"
                          />
                          {errors.maxDocumentos && <p className="mt-1 text-xs text-fiscal-danger">{errors.maxDocumentos}</p>}
                        </div>

                        <div className="hidden md:block" />

                        <div>
                          <label htmlFor="cf-fecha-inicio" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Fecha de Inicio *
                          </label>
                          <input
                            id="cf-fecha-inicio"
                            type="date"
                            value={form.fechaInicio}
                            onChange={handleChange("fechaInicio")}
                            className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.fechaInicio ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                          />
                          {errors.fechaInicio && <p className="mt-1 text-xs text-fiscal-danger">{errors.fechaInicio}</p>}
                        </div>

                        <div>
                          <label htmlFor="cf-fecha-fin" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Fecha de Finalización *
                          </label>
                          <input
                            id="cf-fecha-fin"
                            type="date"
                            value={form.fechaFin}
                            onChange={handleChange("fechaFin")}
                            className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-sm focus:outline-none ${errors.fechaFin ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"}`}
                          />
                          {errors.fechaFin && <p className="mt-1 text-xs text-fiscal-danger">{errors.fechaFin}</p>}
                        </div>

                        <div>
                          <label htmlFor="cf-estado" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                            Estado de la Empresa
                          </label>
                          <select
                            id="cf-estado"
                            value={form.estadoEmpresa}
                            onChange={handleChange("estadoEmpresa")}
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

                <div className="p-6 border-t border-neutralCustom-100 flex justify-end space-x-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/companies")}
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
                      disabled={isSaving}
                      className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Procesando..." : isEditing ? "Actualizar Tenant" : "Crear Tenant y Accesos"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
