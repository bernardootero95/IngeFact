import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { aceptarTerminos } from "@ingefact/core-api";
import { AuthLayout, Button, FormAlert, LEGAL_LINKS } from "@ingefact/ui";
import { useAuthStore } from "../store/authStore";
import logo from "../../../assets/logo.png";

/**
 * Aceptacion obligatoria de terminos y politica de datos antes de usar la
 * app. Se muestra en el primer ingreso y cada vez que se publica una
 * version nueva de los textos (el backend decide via /auth/me). El
 * backend guarda fecha, IP y navegador como prueba de la autorizacion.
 */
export default function AcceptTermsPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const markTermsAccepted = useAuthStore((state) => state.markTermsAccepted);
  const logout = useAuthStore((state) => state.logout);

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!profile?.terminos_pendientes) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checked) return;
    setLoading(true);
    setError(null);
    try {
      await aceptarTerminos(profile.version_terminos);
      markTermsAccepted();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <AuthLayout logo={logo} subtitle="Antes de continuar, revisa y acepta nuestras condiciones.">
      <h2 className="text-xl font-medium text-neutralCustom-800 mb-4 text-left">Términos y tratamiento de datos</h2>

      <p className="text-sm text-neutralCustom-600 mb-3">
        Para usar IngeFact necesitamos que aceptes los términos del servicio y la política de tratamiento de datos
        personales. Ahí explicamos, entre otras cosas:
      </p>
      <ul className="list-disc pl-5 text-sm text-neutralCustom-600 space-y-1 mb-4">
        <li>Qué documentos descuentan de tu paquete y cuánto tiempo tienes para usarlos.</li>
        <li>Que la información que registras y tus obligaciones ante la DIAN son responsabilidad de tu empresa.</li>
        <li>
          Que tratamos los datos de tus clientes, proveedores y empleados solo por cuenta de tu empresa, que debe contar
          con su autorización.
        </li>
      </ul>
      <ul className="text-sm mb-6 space-y-1">
        {LEGAL_LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 underline hover:text-brand-700"
            >
              Leer {link.label.toLowerCase()}
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </li>
        ))}
      </ul>

      <FormAlert className="mb-4">{error}</FormAlert>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-start gap-3">
          <input
            id="accept-terms"
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-neutralCustom-400 text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400"
          />
          <label htmlFor="accept-terms" className="text-sm text-neutralCustom-800">
            He leído y acepto los términos y condiciones y la política de tratamiento de datos personales, en nombre de
            la empresa que represento.
          </label>
        </div>

        <Button type="submit" disabled={!checked || loading} variant="primary" size="lg" fullWidth loading={loading}>
          Aceptar y continuar
        </Button>
        <Button type="button" onClick={handleLogout} variant="ghost" fullWidth>
          Cerrar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}
