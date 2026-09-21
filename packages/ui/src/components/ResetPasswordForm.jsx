import { useState } from "react";
import { Link } from "react-router-dom";
import { isStrongPassword } from "@ingefact/utils";
import Button from "./Button.jsx";

function validatePassword(value) {
  if (!value) return "La contraseña es obligatoria.";
  if (!isStrongPassword(value)) return "Debe tener al menos 8 caracteres, con letras y números.";
  return "";
}

function validateConfirm(value, password) {
  if (!value) return "Confirma la nueva contraseña.";
  if (value !== password) return "Las contraseñas no coinciden.";
  return "";
}

export default function ResetPasswordForm({ logo, subtitle, token, onSubmit, loginPath = "/login", forgotPasswordPath = "/forgot-password" }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setFieldErrors((prev) => ({
      ...prev,
      password: validatePassword(val),
      confirmPassword: confirmPassword ? validateConfirm(confirmPassword, val) : prev.confirmPassword,
    }));
  };

  const handleConfirmChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    setFieldErrors((prev) => ({ ...prev, confirmPassword: validateConfirm(val, password) }));
  };

  const hasErrors = Boolean(fieldErrors.password || fieldErrors.confirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirm(confirmPassword, password);
    if (passwordErr || confirmErr) {
      setFieldErrors({ password: passwordErr, confirmPassword: confirmErr });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(token, password);
      setSuccess(true);
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
          <p className="text-sm text-neutralCustom-500 mt-2 font-normal">{subtitle}</p>
        </div>

        {!token ? (
          <div className="space-y-5">
            <div className="p-4 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
              Este enlace de recuperación no es válido o está incompleto.
            </div>
            <Link
              to={forgotPasswordPath}
              className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Solicitar un nuevo enlace
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-5">
            <div className="p-4 bg-brand-50 border border-brand-400 text-brand-700 text-sm rounded-brand-md">
              Tu contraseña se actualizó correctamente.
            </div>
            <Button as={Link} to={loginPath} variant="primary" size="lg" fullWidth>
              Iniciar sesión
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-medium text-neutralCustom-800 mb-6 text-left">
              Restablecer contraseña
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md font-normal">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  id="reset-password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  className={`field field-lg w-full ${
                    fieldErrors.password
                      ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                      : ""
                  }`}
                  placeholder="••••••••"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-fiscal-danger">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  id="reset-confirm-password"
                  required
                  value={confirmPassword}
                  onChange={handleConfirmChange}
                  className={`field field-lg w-full ${
                    fieldErrors.confirmPassword
                      ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                      : ""
                  }`}
                  placeholder="••••••••"
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-fiscal-danger">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || hasErrors}
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-2"
              >
                Restablecer contraseña
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
