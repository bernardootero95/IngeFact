import { useState } from "react";
import { Link } from "react-router-dom";
import { isValidEmail } from "@ingefact/utils";
import Button from "./Button.jsx";
import AuthLayout from "./AuthLayout.jsx";
import PasswordInput from "./PasswordInput.jsx";
import { FieldError, FormAlert, fieldA11y } from "./FormFeedback.jsx";

const validateEmail = (value) => {
  if (!value.trim()) return "El correo es obligatorio.";
  if (!isValidEmail(value)) return "Ingresa un correo electrónico válido.";
  return "";
};

const validatePassword = (value) => {
  if (!value) return "La contraseña es obligatoria.";
  if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  return "";
};

export default function LoginForm({
  logo,
  subtitle,
  heading = "Ingresar al sistema",
  emailPlaceholder = "ejemplo@ingefact.com",
  onSubmit,
  onSuccess,
  mapError = (err) => err.message,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setFieldErrors((prev) => ({ ...prev, email: validateEmail(val) }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setFieldErrors((prev) => ({ ...prev, password: validatePassword(val) }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (emailErr || passErr) {
      setFieldErrors({ email: emailErr, password: passErr });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(email.trim(), password);
      setLoading(false);
      onSuccess?.();
    } catch (err) {
      setError(mapError(err));
      setLoading(false);
    }
  };

  const hasErrors = fieldErrors.email || fieldErrors.password;

  return (
    <AuthLayout logo={logo} subtitle={subtitle}>
      <h2 className="text-xl font-medium text-neutralCustom-800 mb-6 text-left">{heading}</h2>

      <FormAlert className="mb-4">{error}</FormAlert>

      <form onSubmit={handleLogin} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-neutralCustom-500 mb-2">
            Correo electrónico
          </label>
          <input
            type="email"
            id="login-email"
            required
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            className={`field field-lg w-full ${
              fieldErrors.email ? "border-fiscal-danger field-invalid focus:border-fiscal-danger" : ""
            }`}
            placeholder={emailPlaceholder}
            {...fieldA11y("login-email", fieldErrors.email)}
          />
          <FieldError fieldId="login-email">{fieldErrors.email}</FieldError>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="login-password" className="block text-sm font-medium text-neutralCustom-500">
              Contraseña
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            error={fieldErrors.password}
          />
          <FieldError fieldId="login-password">{fieldErrors.password}</FieldError>
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
          Iniciar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}
