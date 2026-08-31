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
      subtitle="Acceso a Clientes - Facturación Electrónica"
      heading="Ingresar a tu empresa"
      emailPlaceholder="admin@miempresa.com"
      onSubmit={login}
      onSuccess={() => navigate("/dashboard", { replace: true })}
      mapError={() => "Credenciales incorrectas. Verifica tu correo y contraseña."}
    />
  );
}
