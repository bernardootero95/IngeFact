import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getEmpleado, createEmpleado, updateEmpleado, listPublicReferenceTable } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import { validateField } from "./EmployeeFormPage.validation";
import { Button, FormSkeleton } from "@ingefact/ui";

const emptyForm = {
  tipo_documento: "",
  numero_documento: "",
  primer_apellido: "",
  segundo_apellido: "",
  primer_nombre: "",
  otros_nombres: "",
  tipo_trabajador: "",
  subtipo_trabajador: "",
  alto_riesgo_pension: false,
  salario_integral: false,
  tipo_contrato: "",
  sueldo: "",
  codigo_trabajador: "",
  lugar_trabajo_municipio: "",
  lugar_trabajo_direccion: "",
  banco: "",
  tipo_cuenta: "",
  numero_cuenta: "",
  correo_electronico: "",
  telefono: "",
  fecha_ingreso: "",
  fecha_retiro: "",
};

const REQUIRED_FIELDS = [
  "tipo_documento",
  "numero_documento",
  "primer_apellido",
  "primer_nombre",
  "tipo_trabajador",
  "subtipo_trabajador",
  "tipo_contrato",
  "sueldo",
  "lugar_trabajo_municipio",
  "lugar_trabajo_direccion",
  "fecha_ingreso",
];

export default function EmployeeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(emptyForm);
  // Filtro de departamento solo para acotar el combo de municipios -- Empleado
  // no persiste el departamento del lugar de trabajo (la DIAN solo exige el
  // municipio, ver docs/alegra-investigacion.md), asi que este valor nunca
  // se manda al backend.
  const [departamentoFiltro, setDepartamentoFiltro] = useState("");
  const [catalogs, setCatalogs] = useState({
    documentTypes: [],
    workerTypes: [],
    workerSubtypes: [],
    contractTypes: [],
    departments: [],
    municipalities: [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [documentTypes, workerTypes, workerSubtypes, contractTypes, departments, municipalities, empleado] =
        await Promise.all([
          listPublicReferenceTable("tipos_identificacion"),
          listPublicReferenceTable("tipos_trabajador"),
          listPublicReferenceTable("subtipos_trabajador"),
          listPublicReferenceTable("tipos_contrato_nomina"),
          listPublicReferenceTable("departamentos"),
          listPublicReferenceTable("municipios"),
          isEditing ? getEmpleado(id) : Promise.resolve(null),
        ]);

      setCatalogs({ documentTypes, workerTypes, workerSubtypes, contractTypes, departments, municipalities });

      if (empleado) {
        setFormData({
          tipo_documento: empleado.tipo_documento,
          numero_documento: empleado.numero_documento,
          primer_apellido: empleado.primer_apellido,
          segundo_apellido: empleado.segundo_apellido || "",
          primer_nombre: empleado.primer_nombre,
          otros_nombres: empleado.otros_nombres || "",
          tipo_trabajador: empleado.tipo_trabajador,
          subtipo_trabajador: empleado.subtipo_trabajador,
          alto_riesgo_pension: empleado.alto_riesgo_pension,
          salario_integral: empleado.salario_integral,
          tipo_contrato: empleado.tipo_contrato,
          sueldo: String(empleado.sueldo),
          codigo_trabajador: empleado.codigo_trabajador || "",
          lugar_trabajo_municipio: empleado.lugar_trabajo_municipio,
          lugar_trabajo_direccion: empleado.lugar_trabajo_direccion,
          banco: empleado.banco || "",
          tipo_cuenta: empleado.tipo_cuenta || "",
          numero_cuenta: empleado.numero_cuenta || "",
          correo_electronico: empleado.correo_electronico || "",
          telefono: empleado.telefono || "",
          fecha_ingreso: empleado.fecha_ingreso,
          fecha_retiro: empleado.fecha_retiro || "",
        });
        const muni = municipalities.find((m) => m.code === empleado.lugar_trabajo_municipio);
        if (muni) setDepartamentoFiltro(muni.department_code || "");
      } else {
        setFormData({ ...emptyForm, tipo_documento: documentTypes[0]?.code || "" });
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
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const next = { ...prev, [name]: nextValue };
      setErrors((prevErrors) => ({ ...prevErrors, [name]: validateField(name, nextValue, next) }));
      return next;
    });
  };

  const handleDepartamentoFiltroChange = (e) => {
    setDepartamentoFiltro(e.target.value);
    setFormData((prev) => ({ ...prev, lugar_trabajo_municipio: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      newErrors[field] = validateField(field, formData[field], formData);
    });
    newErrors.fecha_retiro = validateField("fecha_retiro", formData.fecha_retiro, formData);
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      tipo_documento: formData.tipo_documento,
      numero_documento: formData.numero_documento.trim(),
      primer_apellido: formData.primer_apellido.trim(),
      segundo_apellido: formData.segundo_apellido.trim() || null,
      primer_nombre: formData.primer_nombre.trim(),
      otros_nombres: formData.otros_nombres.trim() || null,
      tipo_trabajador: formData.tipo_trabajador,
      subtipo_trabajador: formData.subtipo_trabajador,
      alto_riesgo_pension: formData.alto_riesgo_pension,
      salario_integral: formData.salario_integral,
      tipo_contrato: formData.tipo_contrato,
      sueldo: Number(formData.sueldo),
      codigo_trabajador: formData.codigo_trabajador.trim() || null,
      lugar_trabajo_pais: "CO",
      lugar_trabajo_municipio: formData.lugar_trabajo_municipio,
      lugar_trabajo_direccion: formData.lugar_trabajo_direccion.trim(),
      banco: formData.banco.trim() || null,
      tipo_cuenta: formData.tipo_cuenta.trim() || null,
      numero_cuenta: formData.numero_cuenta.trim() || null,
      correo_electronico: formData.correo_electronico.trim() || null,
      telefono: formData.telefono.trim() || null,
      fecha_ingreso: formData.fecha_ingreso,
      fecha_retiro: formData.fecha_retiro || null,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await updateEmpleado(id, payload);
      } else {
        await createEmpleado(payload);
      }
      navigate(returnTo || "/employees");
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const municipiosFiltrados = departamentoFiltro
    ? catalogs.municipalities.filter((m) => m.department_code === departamentoFiltro)
    : catalogs.municipalities;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Editar Empleado" : "Registrar Empleado"}
            </h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              {isEditing ? "Actualiza los datos de este empleado." : "Agrega un nuevo empleado a tu nómina."}
            </p>
          </div>
          <Button onClick={() => navigate(returnTo || "/employees")} variant="ghost">
            Cancelar
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl">
            {loading ? (
              <FormSkeleton label="Cargando..." />
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
                  <h4 className="text-sm font-semibold text-neutralCustom-800">Identificación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tipo_documento" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Tipo de Documento <span className="text-fiscal-danger">*</span>
                      </label>
                      <select
                        id="tipo_documento"
                        name="tipo_documento"
                        value={formData.tipo_documento}
                        onChange={handleChange}
                        className="field w-full"
                      >
                        {catalogs.documentTypes.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.code} - {t.value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="numero_documento" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Número de Documento <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="numero_documento"
                        name="numero_documento"
                        value={formData.numero_documento}
                        onChange={handleChange}
                        className={`field w-full ${errors.numero_documento ? "border-fiscal-danger field-invalid" : ""}`}
                        placeholder="Ej. 1000000000"
                      />
                      {errors.numero_documento && <p className="mt-1 text-sm text-fiscal-danger">{errors.numero_documento}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="primer_nombre" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Primer Nombre <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="primer_nombre"
                        name="primer_nombre"
                        value={formData.primer_nombre}
                        onChange={handleChange}
                        className={`field w-full ${errors.primer_nombre ? "border-fiscal-danger field-invalid" : ""}`}
                      />
                      {errors.primer_nombre && <p className="mt-1 text-sm text-fiscal-danger">{errors.primer_nombre}</p>}
                    </div>
                    <div>
                      <label htmlFor="otros_nombres" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Otros Nombres
                      </label>
                      <input
                        type="text"
                        id="otros_nombres"
                        name="otros_nombres"
                        value={formData.otros_nombres}
                        onChange={handleChange}
                        className="field w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="primer_apellido" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Primer Apellido <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="primer_apellido"
                        name="primer_apellido"
                        value={formData.primer_apellido}
                        onChange={handleChange}
                        className={`field w-full ${errors.primer_apellido ? "border-fiscal-danger field-invalid" : ""}`}
                      />
                      {errors.primer_apellido && <p className="mt-1 text-sm text-fiscal-danger">{errors.primer_apellido}</p>}
                    </div>
                    <div>
                      <label htmlFor="segundo_apellido" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Segundo Apellido
                      </label>
                      <input
                        type="text"
                        id="segundo_apellido"
                        name="segundo_apellido"
                        value={formData.segundo_apellido}
                        onChange={handleChange}
                        className="field w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="correo_electronico" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        id="correo_electronico"
                        name="correo_electronico"
                        value={formData.correo_electronico}
                        onChange={handleChange}
                        className="field w-full"
                        placeholder="empleado@correo.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="telefono" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="text"
                        id="telefono"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        className="field w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-neutralCustom-50 p-4 rounded-brand-md border border-neutralCustom-100 space-y-4">
                  <h4 className="text-sm font-semibold text-neutralCustom-800">Datos Laborales (DIAN)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tipo_trabajador" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Tipo de Trabajador <span className="text-fiscal-danger">*</span>
                      </label>
                      <select
                        id="tipo_trabajador"
                        name="tipo_trabajador"
                        value={formData.tipo_trabajador}
                        onChange={handleChange}
                        className={`field w-full ${errors.tipo_trabajador ? "border-fiscal-danger field-invalid" : ""}`}
                      >
                        <option value="">Seleccione...</option>
                        {catalogs.workerTypes.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.value}
                          </option>
                        ))}
                      </select>
                      {errors.tipo_trabajador && <p className="mt-1 text-sm text-fiscal-danger">{errors.tipo_trabajador}</p>}
                    </div>
                    <div>
                      <label htmlFor="subtipo_trabajador" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Subtipo de Trabajador <span className="text-fiscal-danger">*</span>
                      </label>
                      <select
                        id="subtipo_trabajador"
                        name="subtipo_trabajador"
                        value={formData.subtipo_trabajador}
                        onChange={handleChange}
                        className={`field w-full ${errors.subtipo_trabajador ? "border-fiscal-danger field-invalid" : ""}`}
                      >
                        <option value="">Seleccione...</option>
                        {catalogs.workerSubtypes.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.value}
                          </option>
                        ))}
                      </select>
                      {errors.subtipo_trabajador && (
                        <p className="mt-1 text-sm text-fiscal-danger">{errors.subtipo_trabajador}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="tipo_contrato" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Tipo de Contrato <span className="text-fiscal-danger">*</span>
                      </label>
                      <select
                        id="tipo_contrato"
                        name="tipo_contrato"
                        value={formData.tipo_contrato}
                        onChange={handleChange}
                        className={`field w-full ${errors.tipo_contrato ? "border-fiscal-danger field-invalid" : ""}`}
                      >
                        <option value="">Seleccione...</option>
                        {catalogs.contractTypes.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.value}
                          </option>
                        ))}
                      </select>
                      {errors.tipo_contrato && <p className="mt-1 text-sm text-fiscal-danger">{errors.tipo_contrato}</p>}
                    </div>
                    <div>
                      <label htmlFor="sueldo" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Sueldo <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        id="sueldo"
                        name="sueldo"
                        value={formData.sueldo}
                        onChange={handleChange}
                        className={`field w-full ${errors.sueldo ? "border-fiscal-danger field-invalid" : ""}`}
                        placeholder="Ej. 2000000"
                      />
                      {errors.sueldo && <p className="mt-1 text-sm text-fiscal-danger">{errors.sueldo}</p>}
                    </div>
                    <div>
                      <label htmlFor="codigo_trabajador" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Código del Trabajador
                      </label>
                      <input
                        type="text"
                        id="codigo_trabajador"
                        name="codigo_trabajador"
                        value={formData.codigo_trabajador}
                        onChange={handleChange}
                        className="field w-full"
                        placeholder="Opcional, uso interno"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 text-sm text-neutralCustom-700">
                      <input
                        type="checkbox"
                        name="alto_riesgo_pension"
                        checked={formData.alto_riesgo_pension}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-neutralCustom-300"
                      />
                      Alto riesgo pensional (Decreto 2090 de 2003)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutralCustom-700">
                      <input
                        type="checkbox"
                        name="salario_integral"
                        checked={formData.salario_integral}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-neutralCustom-300"
                      />
                      Salario integral
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fecha_ingreso" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Fecha de Ingreso <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="fecha_ingreso"
                        name="fecha_ingreso"
                        value={formData.fecha_ingreso}
                        onChange={handleChange}
                        className={`field w-full ${errors.fecha_ingreso ? "border-fiscal-danger field-invalid" : ""}`}
                      />
                      {errors.fecha_ingreso && <p className="mt-1 text-sm text-fiscal-danger">{errors.fecha_ingreso}</p>}
                    </div>
                    <div>
                      <label htmlFor="fecha_retiro" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Fecha de Retiro
                      </label>
                      <input
                        type="date"
                        id="fecha_retiro"
                        name="fecha_retiro"
                        value={formData.fecha_retiro}
                        onChange={handleChange}
                        className={`field w-full ${errors.fecha_retiro ? "border-fiscal-danger field-invalid" : ""}`}
                        placeholder="Solo si ya no trabaja contigo"
                      />
                      {errors.fecha_retiro && <p className="mt-1 text-sm text-fiscal-danger">{errors.fecha_retiro}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-neutralCustom-50 p-4 rounded-brand-md border border-neutralCustom-100 space-y-4">
                  <h4 className="text-sm font-semibold text-neutralCustom-800">Lugar de Trabajo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="departamento_filtro" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Departamento
                      </label>
                      <select
                        id="departamento_filtro"
                        value={departamentoFiltro}
                        onChange={handleDepartamentoFiltroChange}
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
                      <label htmlFor="lugar_trabajo_municipio" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Municipio <span className="text-fiscal-danger">*</span>
                      </label>
                      <select
                        id="lugar_trabajo_municipio"
                        name="lugar_trabajo_municipio"
                        value={formData.lugar_trabajo_municipio}
                        onChange={handleChange}
                        disabled={!departamentoFiltro}
                        className={`field w-full disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.lugar_trabajo_municipio ? "border-fiscal-danger field-invalid" : ""
                        }`}
                      >
                        <option value="">Seleccione un municipio...</option>
                        {municipiosFiltrados.map((m) => (
                          <option key={m.code} value={m.code}>
                            {m.value}
                          </option>
                        ))}
                      </select>
                      {errors.lugar_trabajo_municipio && (
                        <p className="mt-1 text-sm text-fiscal-danger">{errors.lugar_trabajo_municipio}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="lugar_trabajo_direccion" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Dirección <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="lugar_trabajo_direccion"
                        name="lugar_trabajo_direccion"
                        value={formData.lugar_trabajo_direccion}
                        onChange={handleChange}
                        className={`field w-full ${errors.lugar_trabajo_direccion ? "border-fiscal-danger field-invalid" : ""}`}
                        placeholder="Ej. Calle 15 # 2-23"
                      />
                      {errors.lugar_trabajo_direccion && (
                        <p className="mt-1 text-sm text-fiscal-danger">{errors.lugar_trabajo_direccion}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-neutralCustom-50 p-4 rounded-brand-md border border-neutralCustom-100 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-neutralCustom-800">Datos de Pago (opcional)</h4>
                    <p className="text-xs text-neutralCustom-500 mt-0.5">
                      Valor por defecto para el pago de nómina de este empleado.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="banco" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Banco
                      </label>
                      <input
                        type="text"
                        id="banco"
                        name="banco"
                        value={formData.banco}
                        onChange={handleChange}
                        className="field w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="tipo_cuenta" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Tipo de Cuenta
                      </label>
                      <input
                        type="text"
                        id="tipo_cuenta"
                        name="tipo_cuenta"
                        value={formData.tipo_cuenta}
                        onChange={handleChange}
                        className="field w-full"
                        placeholder="Ahorros / Corriente"
                      />
                    </div>
                    <div>
                      <label htmlFor="numero_cuenta" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Número de Cuenta
                      </label>
                      <input
                        type="text"
                        id="numero_cuenta"
                        name="numero_cuenta"
                        value={formData.numero_cuenta}
                        onChange={handleChange}
                        className="field w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button onClick={() => navigate(returnTo || "/employees")} variant="ghost">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving || hasErrors} variant="primary" loading={isSaving}>
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
