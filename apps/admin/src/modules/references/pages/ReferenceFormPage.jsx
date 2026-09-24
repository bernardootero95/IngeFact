import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { crearReferenceRecord, actualizarReferenceRecord } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import { tableTitles } from "../tableTitles";
import { Button, FieldError, fieldA11y } from "@ingefact/ui";

function validateCode(value) {
  return !value.trim() ? "El código es obligatorio." : "";
}

function validateValue(value) {
  return !value.trim() ? "La descripción es obligatoria." : "";
}

export default function ReferenceFormPage() {
  const navigate = useNavigate();
  const { tableName, id } = useParams();
  const location = useLocation();
  const currentRecord = location.state?.record || null;
  const isEditing = Boolean(id);

  const isMunicipio = tableName === "municipios";
  const isNotaCredito = tableName === "conceptos_nota_credito";
  const title = tableTitles[tableName] || "Tabla de Referencia";

  const [code, setCode] = useState(currentRecord?.code || "");
  const [value, setValue] = useState(currentRecord?.value || "");
  const [estado, setEstado] = useState(currentRecord?.estado || "activo");
  const [deptCode, setDeptCode] = useState(currentRecord?.department_code || "");
  const [deptValue, setDeptValue] = useState(currentRecord?.department_value || "");
  const [valueNade, setValueNade] = useState(currentRecord?.value_nade || "");

  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  if (isEditing && !currentRecord) {
    navigate(`/admin/references/${tableName}`);
    return null;
  }

  const validateDeptCode = (val) => (isMunicipio && !val.trim() ? "El código es obligatorio." : "");
  const validateDeptValue = (val) => (isMunicipio && !val.trim() ? "El departamento es obligatorio." : "");
  const validateValueNade = (val) => (isNotaCredito && !val.trim() ? "El valor NADE es obligatorio." : "");

  const handleCodeChange = (e) => {
    const val = e.target.value;
    setCode(val);
    setFieldErrors((prev) => ({ ...prev, code: validateCode(val) }));
  };

  const handleValueChange = (e) => {
    const val = e.target.value;
    setValue(val);
    setFieldErrors((prev) => ({ ...prev, value: validateValue(val) }));
  };

  const handleDeptCodeChange = (e) => {
    const val = e.target.value;
    setDeptCode(val);
    setFieldErrors((prev) => ({ ...prev, deptCode: validateDeptCode(val) }));
  };

  const handleDeptValueChange = (e) => {
    const val = e.target.value;
    setDeptValue(val);
    setFieldErrors((prev) => ({ ...prev, deptValue: validateDeptValue(val) }));
  };

  const handleValueNadeChange = (e) => {
    const val = e.target.value;
    setValueNade(val);
    setFieldErrors((prev) => ({ ...prev, valueNade: validateValueNade(val) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {
      code: validateCode(code),
      value: validateValue(value),
      ...(isMunicipio && { deptCode: validateDeptCode(deptCode), deptValue: validateDeptValue(deptValue) }),
      ...(isNotaCredito && { valueNade: validateValueNade(valueNade) }),
    };
    if (Object.values(newErrors).some(Boolean)) {
      setFieldErrors(newErrors);
      return;
    }

    const payload = { code: code.trim(), value: value.trim(), estado };
    if (isMunicipio) {
      payload.department_code = deptCode.trim();
      payload.department_value = deptValue.trim();
    }
    if (isNotaCredito) {
      payload.value_nade = valueNade.trim();
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await actualizarReferenceRecord(tableName, currentRecord.id, payload);
      } else {
        await crearReferenceRecord(tableName, payload);
      }
      navigate(`/admin/references/${tableName}`);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasErrors = Object.values(fieldErrors).some(Boolean);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? `Modificar en ${title}` : `Nuevo Registro en ${title}`}
            </h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">Catálogo de referencia DIAN.</p>
          </div>
          <Button
            onClick={() => navigate(`/admin/references/${tableName}`)}
            variant="ghost"
          >
            Cancelar
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-xl">
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-5"
            >
              {saveError && (
                <div role="alert" className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label htmlFor="ref-code" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                    Código
                  </label>
                  <input
                    id="ref-code"
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    className={`field w-full font-mono ${
                      fieldErrors.code
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : ""
                    }`}
                    placeholder="Ej: 01"
                    {...fieldA11y("ref-code", fieldErrors.code)}
                  />
                  {fieldErrors.code && (
                    <FieldError fieldId={"ref-code"}>{fieldErrors.code}</FieldError>
                  )}
                </div>
                <div className="col-span-2">
                  <label htmlFor="ref-value" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                    Descripción / Valor
                  </label>
                  <input
                    id="ref-value"
                    type="text"
                    value={value}
                    onChange={handleValueChange}
                    className={`field w-full ${
                      fieldErrors.value
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : ""
                    }`}
                    placeholder="Descripción oficial"
                    {...fieldA11y("ref-value", fieldErrors.value)}
                  />
                  {fieldErrors.value && (
                    <FieldError fieldId={"ref-value"}>{fieldErrors.value}</FieldError>
                  )}
                </div>
              </div>

              {isMunicipio && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-neutralCustom-100 pt-4">
                  <div className="col-span-1">
                    <label htmlFor="ref-deptcode" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                      Cód. Depto
                    </label>
                    <input
                      id="ref-deptcode"
                      type="text"
                      value={deptCode}
                      onChange={handleDeptCodeChange}
                      className={`field w-full font-mono ${
                        fieldErrors.deptCode
                          ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                          : ""
                      }`}
                      placeholder="Ej: 08"
                      {...fieldA11y("ref-deptcode", fieldErrors.deptCode)}
                    />
                    {fieldErrors.deptCode && (
                      <FieldError fieldId={"ref-deptcode"}>{fieldErrors.deptCode}</FieldError>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="ref-deptvalue" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                      Nombre Departamento
                    </label>
                    <input
                      id="ref-deptvalue"
                      type="text"
                      value={deptValue}
                      onChange={handleDeptValueChange}
                      className={`field w-full ${
                        fieldErrors.deptValue
                          ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                          : ""
                      }`}
                      placeholder="Atlántico"
                      {...fieldA11y("ref-deptvalue", fieldErrors.deptValue)}
                    />
                    {fieldErrors.deptValue && (
                      <FieldError fieldId={"ref-deptvalue"}>{fieldErrors.deptValue}</FieldError>
                    )}
                  </div>
                </div>
              )}

              {isNotaCredito && (
                <div className="border-t border-neutralCustom-100 pt-4">
                  <label htmlFor="ref-valuenade" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                    Valor NADE
                  </label>
                  <input
                    id="ref-valuenade"
                    type="text"
                    value={valueNade}
                    onChange={handleValueNadeChange}
                    className={`field w-full ${
                      fieldErrors.valueNade
                        ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                        : ""
                    }`}
                    placeholder="Valor estandarizado NADE"
                    {...fieldA11y("ref-valuenade", fieldErrors.valueNade)}
                  />
                  {fieldErrors.valueNade && (
                    <FieldError fieldId={"ref-valuenade"}>{fieldErrors.valueNade}</FieldError>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="ref-estado" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                  Estado
                </label>
                <select
                  id="ref-estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="field w-full"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                <Button
                  onClick={() => navigate(`/admin/references/${tableName}`)}
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
          </div>
        </div>
      </main>
    </div>
  );
}
