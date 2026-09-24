import { useState } from "react";
import { Link } from "react-router-dom";
import { isStrongPassword } from "@ingefact/utils";
import Button from "./Button.jsx";
import AuthLayout from "./AuthLayout.jsx";
import PasswordInput from "./PasswordInput.jsx";
import { FieldError, FormAlert, FormSuccess } from "./FormFeedback.jsx";

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
    <AuthLayout logo={logo} subtitle={subtitle}>
      {!token ? (
        <div className="space-y-5">
          <FormAlert className="p-4">Este enlace de recuperación no es válido o está incompleto.</FormAlert>
          <Link
            to={forgotPasswordPath}
            className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Solicitar un nuevo enlace
          </Link>
        </div>
      ) : success ? (
        <div className="space-y-5">
          <FormSuccess>Tu contraseña se actualizó correctamente.</FormSuccess>
          <Button as={Link} to={loginPath} variant="primary" size="lg" fullWidth>
            Iniciar sesión
          </Button>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-medium text-neutralCustom-800 mb-6 text-left">Restablecer contraseña</h2>

          <FormAlert className="mb-4">{error}</FormAlert>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
                Nueva contraseña
              </label>
              <PasswordInput
                id="reset-password"
                autoComplete="new-password"
                value={password}
                onChange={handlePasswordChange}
                error={fieldErrors.password}
              />
              <FieldError fieldId="reset-password">{fieldErrors.password}</FieldError>
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
                Confirmar contraseña
              </label>
              <PasswordInput
                id="reset-confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={handleConfirmChange}
                error={fieldErrors.confirmPassword}
              />
              <FieldError fieldId="reset-confirm-password">{fieldErrors.confirmPassword}</FieldError>
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
    </AuthLayout>
  );
}
