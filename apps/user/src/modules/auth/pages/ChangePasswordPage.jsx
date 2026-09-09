import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { changePassword } from "@ingefact/core-api";
import { isStrongPassword } from "@ingefact/utils";
import { useAuthStore } from "../store/authStore";
import logo from "../../../assets/logo.png";

function validateNewPassword(value) {
  if (!value) return "La contraseña es obligatoria.";
  if (!isStrongPassword(value)) return "Debe tener al menos 8 caracteres, con letras y números.";
  return "";
}

function validateConfirm(value, newPassword) {
  if (!value) return "Confirma la nueva contraseña.";
  if (value !== newPassword) return "Las contraseñas no coinciden.";
  return "";
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const debeCambiarPassword = useAuthStore((state) => state.debeCambiarPassword);
  const markPasswordChanged = useAuthStore((state) => state.markPasswordChanged);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Si ya cambio la clave (o entro aqui manualmente sin necesitarlo), no hay
  // nada que forzar -- lo mandamos al dashboard.
  if (!debeCambiarPassword) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCurrentChange = (e) => {
    const val = e.target.value;
    setCurrentPassword(val);
    setFieldErrors((prev) => ({ ...prev, currentPassword: val ? "" : "La contraseña temporal es obligatoria." }));
  };

  const handleNewChange = (e) => {
    const val = e.target.value;
    setNewPassword(val);
    setFieldErrors((prev) => ({
      ...prev,
      newPassword: validateNewPassword(val),
      confirmPassword: confirmPassword ? validateConfirm(confirmPassword, val) : prev.confirmPassword,
    }));
  };

  const handleConfirmChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    setFieldErrors((prev) => ({ ...prev, confirmPassword: validateConfirm(val, newPassword) }));
  };

  const hasErrors = Boolean(fieldErrors.currentPassword || fieldErrors.newPassword || fieldErrors.confirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentErr = currentPassword ? "" : "La contraseña temporal es obligatoria.";
    const newErr = validateNewPassword(newPassword);
    const confirmErr = validateConfirm(confirmPassword, newPassword);
    if (currentErr || newErr || confirmErr) {
      setFieldErrors({ currentPassword: currentErr, newPassword: newErr, confirmPassword: confirmErr });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      markPasswordChanged();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutralCustom-50 font-sans p-4">
      <div className="w-full max-w-md bg-white border border-neutralCustom-100 rounded-brand-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Logo IngeFact" className="h-24 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-brand-600 tracking-tight">IngeFact</h1>
          <p className="text-sm text-neutralCustom-500 mt-2 font-normal">
            Por seguridad, cambia tu contraseña temporal antes de continuar.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md font-normal">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="change-current-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
              Contraseña temporal
            </label>
            <input
              type="password"
              id="change-current-password"
              required
              value={currentPassword}
              onChange={handleCurrentChange}
              className={`w-full px-4 py-2.5 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 focus:outline-none transition-colors font-normal text-sm ${
                fieldErrors.currentPassword
                  ? "border-fiscal-danger focus:border-fiscal-danger"
                  : "border-neutralCustom-100 focus:border-brand-400"
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.currentPassword && (
              <p className="mt-1 text-xs text-fiscal-danger">{fieldErrors.currentPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="change-new-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
              Nueva contraseña
            </label>
            <input
              type="password"
              id="change-new-password"
              required
              value={newPassword}
              onChange={handleNewChange}
              className={`w-full px-4 py-2.5 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 focus:outline-none transition-colors font-normal text-sm ${
                fieldErrors.newPassword
                  ? "border-fiscal-danger focus:border-fiscal-danger"
                  : "border-neutralCustom-100 focus:border-brand-400"
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.newPassword && <p className="mt-1 text-xs text-fiscal-danger">{fieldErrors.newPassword}</p>}
          </div>

          <div>
            <label htmlFor="change-confirm-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              id="change-confirm-password"
              required
              value={confirmPassword}
              onChange={handleConfirmChange}
              className={`w-full px-4 py-2.5 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 focus:outline-none transition-colors font-normal text-sm ${
                fieldErrors.confirmPassword
                  ? "border-fiscal-danger focus:border-fiscal-danger"
                  : "border-neutralCustom-100 focus:border-brand-400"
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-fiscal-danger">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || hasErrors}
            className="w-full py-3 bg-brand-600 hover:bg-brand-400 text-white font-medium rounded-brand-md transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {loading ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
