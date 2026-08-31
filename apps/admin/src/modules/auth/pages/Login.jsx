import { useNavigate } from "react-router-dom";
import { LoginForm } from "@ingefact/ui";
import { useAuthStore } from "../store/authStore";
import logo from "../../../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  return (
    <LoginForm
      logo={logo}
      subtitle="Sistema de Facturación Electrónica SaaS"
      heading="Ingresar al sistema"
      emailPlaceholder="ejemplo@ingefact.com"
      onSubmit={login}
      onSuccess={() => navigate("/admin/dashboard", { replace: true })}
      mapError={(err) => err.message}
    />
  );
}
