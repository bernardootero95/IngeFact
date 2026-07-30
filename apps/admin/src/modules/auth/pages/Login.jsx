import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@ingefact/core-api";
import logo from "../../../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  const validateEmail = (value) => {
    if (!value.trim()) return "El correo es obligatorio.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Ingresa un correo electrónico válido.";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "La contraseña es obligatoria.";
    if (value.length < 6)
      return "La contraseña debe tener al menos 6 caracteres.";
    return "";
  };

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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Corrección: Apagar el estado de carga y redirigir al Dashboard
    setLoading(false);
    navigate("/admin/dashboard", { replace: true });
  };

  const hasErrors = fieldErrors.email || fieldErrors.password;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutralCustom-50 font-sans p-4">
      <div className="w-full max-w-md bg-white border border-neutralCustom-100 rounded-brand-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={logo}
              alt="Logo IngeFact"
              className="h-24 w-auto object-contain"
            />
          </div>

          <h1 className="text-3xl font-bold text-brand-600 tracking-tight">
            IngeFact
          </h1>
          <p className="text-sm text-neutralCustom-500 mt-2 font-normal">
            Sistema de Facturación Electrónica SaaS
          </p>
        </div>

        <h2 className="text-xl font-medium text-neutralCustom-800 mb-6 text-left">
          Ingresar al sistema
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md font-normal">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutralCustom-500 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={handleEmailChange}
              className={`w-full px-4 py-2.5 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 placeholder-neutralCustom-500 focus:outline-none transition-colors font-normal text-sm ${
                fieldErrors.email
                  ? "border-fiscal-danger focus:border-fiscal-danger"
                  : "border-neutralCustom-100 focus:border-brand-400"
              }`}
              placeholder="ejemplo@ingefact.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-fiscal-danger">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-neutralCustom-500">
                Contraseña
              </label>
              <a
                href="/forgot-password"
                className="text-xs font-medium text-brand-600 hover:text-brand-400 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={handlePasswordChange}
                className={`w-full pl-4 pr-10 py-2.5 bg-neutralCustom-50 border rounded-brand-md text-neutralCustom-800 placeholder-neutralCustom-500 focus:outline-none transition-colors font-normal text-sm ${
                  fieldErrors.password
                    ? "border-fiscal-danger focus:border-fiscal-danger"
                    : "border-neutralCustom-100 focus:border-brand-400"
                }`}
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutralCustom-500 hover:text-brand-600 transition-colors"
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-fiscal-danger">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || hasErrors}
            className="w-full py-3 bg-brand-600 hover:bg-brand-400 text-white font-medium rounded-brand-md transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {loading ? "Validando credenciales..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
