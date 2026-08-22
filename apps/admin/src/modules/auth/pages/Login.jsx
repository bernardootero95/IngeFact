import { useNavigate } from "react-router-dom";
import { supabase } from "@ingefact/core-api";
import { LoginForm } from "@ingefact/ui";
import logo from "../../../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();

  return (
    <LoginForm
      logo={logo}
      subtitle="Sistema de Facturación Electrónica SaaS"
      heading="Ingresar al sistema"
      emailPlaceholder="ejemplo@ingefact.com"
      onSubmit={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }}
      onSuccess={() => navigate("/admin/dashboard", { replace: true })}
      mapError={(err) => err.message}
    />
  );
}
