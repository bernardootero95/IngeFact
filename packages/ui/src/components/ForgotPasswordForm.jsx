import { useState } from "react";
import { Link } from "react-router-dom";
import { isValidEmail } from "@ingefact/utils";
import Button from "./Button.jsx";
import AuthLayout from "./AuthLayout.jsx";
import { FieldError, FormAlert, FormSuccess, fieldA11y } from "./FormFeedback.jsx";

const validateEmail = (value) => {
  if (!value.trim()) return "El correo es obligatorio.";
  if (!isValidEmail(value)) return "Ingresa un correo electrónico válido.";
  return "";
};

export default function ForgotPasswordForm({
  logo,
  subtitle,
  emailPlaceholder = "ejemplo@ingefact.com",
  onSubmit,
  loginPath = "/login",
}) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setFieldError(validateEmail(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validateEmail(email);
    if (err) {
      setFieldError(err);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout logo={logo} subtitle={subtitle}>
      {submitted ? (
        <div className="space-y-5">
          <FormSuccess>
            Si el correo <strong>{email.trim()}</strong> está registrado, te enviaremos un enlace para restablecer tu
            contraseña. Revisa tu bandeja de entrada.
          </FormSuccess>
          <Link
            to={loginPath}
            className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-medium text-neutralCustom-800 mb-2 text-left">¿Olvidaste tu contraseña?</h2>
          <p className="text-sm text-neutralCustom-500 mb-6 font-normal">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>

          <FormAlert className="mb-4">{error}</FormAlert>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-neutralCustom-500 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                id="forgot-email"
                required
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                className={`field field-lg w-full ${
                  fieldError ? "border-fiscal-danger field-invalid focus:border-fiscal-danger" : ""
                }`}
                placeholder={emailPlaceholder}
                {...fieldA11y("forgot-email", fieldError)}
              />
              <FieldError fieldId="forgot-email">{fieldError}</FieldError>
            </div>

            <Button
              type="submit"
              disabled={loading || Boolean(fieldError)}
              variant="primary"
              size="lg"
              fullWidth
              title="Enviar enlace de recuperación"
              loading={loading}
              className="mt-2"
            >
              Enviar enlace
            </Button>
          </form>

          <Link
            to={loginPath}
            className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors mt-6"
          >
            Volver a iniciar sesión
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
