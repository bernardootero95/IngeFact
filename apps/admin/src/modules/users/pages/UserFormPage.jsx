import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { crearUsuarioAdmin, actualizarUsuarioAdmin } from "@ingefact/core-api";
import { isValidEmail } from "@ingefact/utils";
import Sidebar from "../../../components/Sidebar";

function validateName(value) {
  if (!value.trim()) return "El nombre es obligatorio.";
  if (value.trim().length < 3) return "El nombre debe tener al menos 3 caracteres.";
  return "";
}

function validateEmail(value) {
  if (!value.trim()) return "El correo es obligatorio.";
  if (!isValidEmail(value)) return "El correo no tiene un formato válido.";
  return "";
}

export default function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const currentUser = location.state?.user || null;
  const isEditing = Boolean(id);

  const [nombre, setNombre] = useState(currentUser?.nombre || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [estado, setEstado] = useState(currentUser?.estado || "activo");
  const [fieldErrors, setFieldErrors] = useState({ nombre: "", email: "" });
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  if (isEditing && !currentUser) {
    navigate("/admin/users");
    return null;
  }

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

    const nameError = validateName(nombre);
    const emailError = validateEmail(email);
    if (nameError || emailError) {
      setFieldErrors({ nombre: nameError, email: emailError });
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await actualizarUsuarioAdmin(currentUser.id, { nombre: nombre.trim(), estado });
      } else {
        await crearUsuarioAdmin({ nombre: nombre.trim(), email: email.trim(), estado });
      }
      navigate("/admin/users");
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasErrors = Boolean(fieldErrors.nombre || fieldErrors.email);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Actualizar Usuario" : "Crear Nuevo Usuario"}
            </h2>
            <p className="text-xs text-neutralCustom-500">
              {isEditing ? "Actualiza los datos de este usuario interno." : "Agrega un nuevo miembro del staff de IngeFact."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
          >
            Cancelar
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-xl">
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-5"
            >
              {saveError && (
                <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                  {saveError}
                </div>
              )}

              <div>
                <label htmlFor="user-nombre" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                  Nombre
                </label>
                <input
                  id="user-nombre"
                  type="text"
                  value={nombre}
                  onChange={handleNameChange}
                  className={`w-full px-3 py-2 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none ${
                    fieldErrors.nombre
                      ? "border-fiscal-danger focus:border-fiscal-danger"
                      : "border-neutralCustom-100 focus:border-brand-400"
                  }`}
                  placeholder="Nombre completo"
                />
                {fieldErrors.nombre && <p className="mt-1 text-xs text-fiscal-danger">{fieldErrors.nombre}</p>}
              </div>

              <div>
                <label htmlFor="user-email" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                  Correo electrónico{" "}
                  {isEditing && <span className="text-xs text-neutralCustom-400">(No modificable)</span>}
                </label>
                <input
                  id="user-email"
                  type="email"
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
                  <p className="mt-1 text-xs text-fiscal-danger">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="user-estado" className="block text-sm font-medium text-neutralCustom-500 mb-1">
                  Estado
                </label>
                <select
                  id="user-estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                <button
                  type="button"
                  onClick={() => navigate("/admin/users")}
                  className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || hasErrors}
                  className="px-6 py-2 bg-brand-600 hover:bg-brand-400 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
