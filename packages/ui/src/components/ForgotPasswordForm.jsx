import { useState } from "react";
import { Link } from "react-router-dom";
import { isValidEmail } from "@ingefact/utils";
import Button from "./Button.jsx";

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
    <div className="min-h-screen flex items-center justify-center bg-neutralCustom-50 font-sans p-4">
      <div className="w-full max-w-md bg-white border border-neutralCustom-100 rounded-brand-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Logo IngeFact" className="h-24 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-brand-600 tracking-tight">IngeFact</h1>
          <p className="text-sm text-neutralCustom-500 mt-2 font-normal">{subtitle}</p>
        </div>

        {submitted ? (
          <div className="space-y-5">
            <div className="p-4 bg-brand-50 border border-brand-400 text-brand-700 text-sm rounded-brand-md">
              Si el correo <strong>{email.trim()}</strong> está registrado, te enviaremos un enlace para
              restablecer tu contraseña. Revisa tu bandeja de entrada.
            </div>
            <Link
              to={loginPath}
              className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-medium text-neutralCustom-800 mb-2 text-left">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="text-sm text-neutralCustom-500 mb-6 font-normal">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md font-normal">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-neutralCustom-500 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="forgot-email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className={`field field-lg w-full ${
                    fieldError
                      ? "border-fiscal-danger field-invalid focus:border-fiscal-danger"
                      : ""
                  }`}
                  placeholder={emailPlaceholder}
                />
                {fieldError && <p className="mt-1 text-xs text-fiscal-danger">{fieldError}</p>}
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
      </div>
    </div>
  );
}
