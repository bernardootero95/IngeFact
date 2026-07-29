import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function ReferenceModal({
  isOpen,
  onClose,
  isEditing,
  currentRecord,
  tableName,
  title,
  isMunicipio,
  isNotaCredito,
  onSaveSuccess,
}) {
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [estado, setEstado] = useState("activo");
  const [deptCode, setDeptCode] = useState("");
  const [deptValue, setDeptValue] = useState("");
  const [valueNade, setValueNade] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [modalError, setModalError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (isEditing && currentRecord) {
      setCode(currentRecord.code || "");
      setValue(currentRecord.value || "");
      setEstado(currentRecord.estado || "activo");
      setDeptCode(currentRecord.department_code || "");
      setDeptValue(currentRecord.department_value || "");
      setValueNade(currentRecord.value_nade || "");
    } else {
      setCode("");
      setValue("");
      setEstado("activo");
      setDeptCode("");
      setDeptValue("");
      setValueNade("");
    }
    setFieldErrors({});
    setModalError(null);
  }, [isEditing, currentRecord, isOpen]);

  if (!isOpen) return null;

  const validateCode = (val) =>
    !val.trim() ? "El código es obligatorio." : "";
  const validateValue = (val) =>
    !val.trim() ? "La descripción es obligatoria." : "";
  const validateDeptCode = (val) =>
    isMunicipio && !val.trim() ? "El código es obligatorio." : "";
  const validateDeptValue = (val) =>
    isMunicipio && !val.trim() ? "El departamento es obligatorio." : "";
  const validateValueNade = (val) =>
    isNotaCredito && !val.trim() ? "El valor NADE es obligatorio." : "";

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

    const errors = {
      code: validateCode(code),
      value: validateValue(value),
      ...(isMunicipio && {
        deptCode: validateDeptCode(deptCode),
        deptValue: validateDeptValue(deptValue),
      }),
      ...(isNotaCredito && {
        valueNade: validateValueNade(valueNade),
      }),
    };

    if (Object.values(errors).some((err) => err !== "")) {
      setFieldErrors(errors);
      return;
    }

    setSubmitLoading(true);
    setModalError(null);

    const payload = {
      code: code.trim(),
      value: value.trim(),
      estado,
      actualizado: new Date().toISOString(),
    };

    if (isMunicipio) {
      payload.department_code = deptCode.trim();
      payload.department_value = deptValue.trim();
    }
    if (isNotaCredito) {
      payload.value_nade = valueNade.trim();
    }

    let error = null;

    if (isEditing) {
      const res = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", currentRecord.id);
      error = res.error;
    } else {
      const res = await supabase.from(tableName).insert([payload]);
      error = res.error;
    }

    if (error) {
      setModalError(error.message);
      setSubmitLoading(false);
    } else {
      setSubmitLoading(false);
      onSaveSuccess();
      onClose();
    }
  };

  const hasErrors = Object.values(fieldErrors).some((err) => err !== "");

  return (
    <div className="fixed inset-0 bg-neutralCustom-800/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-neutralCustom-100 rounded-brand-lg w-full max-w-md p-6 shadow-lg">
        <h3 className="text-lg font-bold text-neutralCustom-800 mb-4">
          {isEditing ? `Modificar en ${title}` : `Nuevo Registro en ${title}`}
        </h3>

        {modalError && (
          <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                Código
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={handleCodeChange}
                className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 text-sm font-mono focus:outline-none ${
                  fieldErrors.code
                    ? "border-fiscal-danger focus:border-fiscal-danger"
                    : "border-neutralCustom-100 focus:border-brand-400"
                }`}
                placeholder="Ej: 01"
              />
              {fieldErrors.code && (
                <p className="mt-1 text-[10px] text-fiscal-danger leading-tight">
                  {fieldErrors.code}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                Descripción / Valor
              </label>
              <input
                type="text"
                required
                value={value}
                onChange={handleValueChange}
                className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none ${
                  fieldErrors.value
                    ? "border-fiscal-danger focus:border-fiscal-danger"
                    : "border-neutralCustom-100 focus:border-brand-400"
                }`}
                placeholder="Descripción oficial"
              />
              {fieldErrors.value && (
                <p className="mt-1 text-[10px] text-fiscal-danger leading-tight">
                  {fieldErrors.value}
                </p>
              )}
            </div>
          </div>

          {isMunicipio && (
            <div className="grid grid-cols-3 gap-4 border-t border-neutralCustom-100 pt-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                  Cód. Depto
                </label>
                <input
                  type="text"
                  required
                  value={deptCode}
                  onChange={handleDeptCodeChange}
                  className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 text-sm font-mono focus:outline-none ${
                    fieldErrors.deptCode
                      ? "border-fiscal-danger focus:border-fiscal-danger"
                      : "border-neutralCustom-100 focus:border-brand-400"
                  }`}
                  placeholder="Ej: 08"
                />
                {fieldErrors.deptCode && (
                  <p className="mt-1 text-[10px] text-fiscal-danger leading-tight">
                    {fieldErrors.deptCode}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                  Nombre Departamento
                </label>
                <input
                  type="text"
                  required
                  value={deptValue}
                  onChange={handleDeptValueChange}
                  className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none ${
                    fieldErrors.deptValue
                      ? "border-fiscal-danger focus:border-fiscal-danger"
                      : "border-neutralCustom-100 focus:border-brand-400"
                  }`}
                  placeholder="Atlántico"
                />
                {fieldErrors.deptValue && (
                  <p className="mt-1 text-[10px] text-fiscal-danger leading-tight">
                    {fieldErrors.deptValue}
                  </p>
                )}
              </div>
            </div>
          )}

          {isNotaCredito && (
            <div className="border-t border-neutralCustom-100 pt-3">
              <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
                Valor NADE
              </label>
              <input
                type="text"
                required
                value={valueNade}
                onChange={handleValueNadeChange}
                className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none ${
                  fieldErrors.valueNade
                    ? "border-fiscal-danger focus:border-fiscal-danger"
                    : "border-neutralCustom-100 focus:border-brand-400"
                }`}
                placeholder="Valor estandarizado NADE"
              />
              {fieldErrors.valueNade && (
                <p className="mt-1 text-[10px] text-fiscal-danger leading-tight">
                  {fieldErrors.valueNade}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutralCustom-100 text-neutralCustom-500 text-sm font-medium rounded-brand-md hover:bg-neutralCustom-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitLoading || hasErrors}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-400 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
