import { useNavigate } from "react-router-dom";
import { supabase } from "@ingefact/core-api";
import { LoginForm } from "@ingefact/ui";
import logo from "../../../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();

  return (
    <LoginForm
      logo={logo}
      subtitle="Acceso a Clientes - Facturación Electrónica"
      heading="Ingresar a tu empresa"
      emailPlaceholder="admin@miempresa.com"
      onSubmit={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }}
      onSuccess={() => navigate("/dashboard", { replace: true })}
      mapError={() => "Credenciales incorrectas. Verifica tu correo y contraseña."}
    />
  );
}
