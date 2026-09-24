import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { changePassword } from "@ingefact/core-api";
import { isStrongPassword } from "@ingefact/utils";
import { useAuthStore } from "../store/authStore";
import logo from "../../../assets/logo.png";
import { AuthLayout, Button, FieldError, FormAlert, PasswordInput } from "@ingefact/ui";

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
    <AuthLayout logo={logo} subtitle="Por seguridad, cambia tu contraseña temporal antes de continuar.">
      <FormAlert className="mb-4">{error}</FormAlert>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="change-current-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
            Contraseña temporal
          </label>
          <PasswordInput
            id="change-current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={handleCurrentChange}
            error={fieldErrors.currentPassword}
          />
          <FieldError fieldId="change-current-password">{fieldErrors.currentPassword}</FieldError>
        </div>

        <div>
          <label htmlFor="change-new-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
            Nueva contraseña
          </label>
          <PasswordInput
            id="change-new-password"
            autoComplete="new-password"
            value={newPassword}
            onChange={handleNewChange}
            error={fieldErrors.newPassword}
          />
          <FieldError fieldId="change-new-password">{fieldErrors.newPassword}</FieldError>
        </div>

        <div>
          <label htmlFor="change-confirm-password" className="block text-sm font-medium text-neutralCustom-500 mb-2">
            Confirmar nueva contraseña
          </label>
          <PasswordInput
            id="change-confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={handleConfirmChange}
            error={fieldErrors.confirmPassword}
          />
          <FieldError fieldId="change-confirm-password">{fieldErrors.confirmPassword}</FieldError>
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
          Cambiar contraseña
        </Button>
      </form>
    </AuthLayout>
  );
}