import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@ingefact/core-api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutralCustom-50 font-sans p-4">
      <div className="w-full max-w-md bg-white border border-neutralCustom-100 rounded-brand-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600 tracking-tight">
            IngeFact
          </h1>
          <p className="text-sm text-neutralCustom-500 mt-2 font-normal">
            Acceso a Clientes
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md font-normal text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
              Usuario (Correo)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
              placeholder="admin@miempresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutralCustom-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-neutralCustom-50 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutralCustom-500 hover:text-brand-600"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-brand-md transition-colors disabled:opacity-50 text-sm mt-4"
          >
            {loading ? "Ingresando..." : "Ingresar a mi cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
