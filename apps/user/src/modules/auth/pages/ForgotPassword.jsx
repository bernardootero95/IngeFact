import { ForgotPasswordForm } from "@ingefact/ui";
import { forgotPasswordTenant } from "@ingefact/core-api";
import logo from "../../../assets/logo.png";

export default function ForgotPassword() {
  return (
    <ForgotPasswordForm
      logo={logo}
      subtitle="Acceso a Clientes - Facturación Electrónica"
      emailPlaceholder="admin@miempresa.com"
      onSubmit={forgotPasswordTenant}
      loginPath="/login"
    />
  );
}
