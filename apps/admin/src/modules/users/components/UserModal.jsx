import { useState, useEffect } from "react";
import { crearUsuarioAdmin, actualizarUsuarioAdmin } from "@ingefact/core-api";

export default function UserModal({
  isOpen,
  onClose,
  isEditing,
  currentUser,
  onSaveSuccess,
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("activo");
  const [modalError, setModalError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ nombre: "", email: "" });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (isEditing && currentUser) {
      setNombre(currentUser.nombre);
      setEmail(currentUser.email);
      setEstado(currentUser.estado);
    } else {
      setNombre("");
      setEmail("");
      setEstado("activo");
    }
    setModalError(null);
    setFieldErrors({ nombre: "", email: "" });
  }, [isEditing, currentUser, isOpen]);

  if (!isOpen) return null;

  const validateName = (value) => {
    if (!value.trim()) return "El nombre es obligatorio.";
    if (value.trim().length < 3)
      return "El nombre debe tener al menos 3 caracteres.";
    return "";
  };

  const validateEmail = (value) => {
    if (!value.trim()) return "El correo es obligatorio.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "El correo no tiene un formato válido.";
    return "";
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNombre(val);
    setFieldErrors((prev) => ({ ...prev, nombre: validateName(val) }));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setFieldErrors((prev) => ({ ...prev, email: validateEmail(val) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación de seguridad final antes de enviar
    const nameError = validateName(nombre);
    const emailError = validateEmail(email);

    if (nameError || emailError) {
      setFieldErrors({ nombre: nameError, email: emailError });
      return;
    }

    setSubmitLoading(true);
    setModalError(null);

    try {
      if (isEditing) {
        await actualizarUsuarioAdmin(currentUser.id, { nombre: nombre.trim(), estado });
      } else {
        await crearUsuarioAdmin({ nombre: nombre.trim(), email: email.trim(), estado });
      }
      setSubmitLoading(false);
      onSaveSuccess();
      onClose();
    } catch (err) {
      setModalError(err.message);
      setSubmitLoading(false);
    }
  };

  const hasErrors = fieldErrors.nombre || fieldErrors.email;

  return (
    <div className="fixed inset-0 bg-neutralCustom-800/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-neutralCustom-100 rounded-brand-lg w-full max-w-md p-6 shadow-lg">
        <h3 className="text-lg font-medium text-neutralCustom-800 mb-4">
          {isEditing ? "Actualizar Usuario" : "Crear Nuevo Usuario"}
        </h3>

        {modalError && (
          <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
              Nombre
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={handleNameChange}
              className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none ${
                fieldErrors.nombre
                  ? "border-fiscal-danger focus:border-fiscal-danger"
                  : "border-neutralCustom-100 focus:border-brand-400"
              }`}
              placeholder="Nombre completo"
            />
            {fieldErrors.nombre && (
              <p className="mt-1 text-xs text-fiscal-danger">
                {fieldErrors.nombre}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
              Correo electrónico{" "}
              {isEditing && (
                <span className="text-xs text-neutralCustom-400">
                  (No modificable)
                </span>
              )}
            </label>
            <input
              type="email"
              required
              value={email}
              disabled={isEditing}
              onChange={handleEmailChange}
              className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none disabled:opacity-60 disabled:bg-neutralCustom-100 disabled:cursor-not-allowed ${
                fieldErrors.email && !isEditing
                  ? "border-fiscal-danger focus:border-fiscal-danger"
                  : "border-neutralCustom-100 focus:border-brand-400"
              }`}
              placeholder="correo@ingefact.com"
            />
            {fieldErrors.email && !isEditing && (
              <p className="mt-1 text-xs text-fiscal-danger">
                {fieldErrors.email}
              </p>
            )}
          </div>

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
