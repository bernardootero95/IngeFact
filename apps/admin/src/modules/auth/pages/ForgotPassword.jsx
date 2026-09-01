import { ForgotPasswordForm } from "@ingefact/ui";
import { forgotPasswordAdmin } from "@ingefact/core-api";
import logo from "../../../assets/logo.png";

export default function ForgotPassword() {
  return (
    <ForgotPasswordForm
      logo={logo}
      subtitle="Sistema de Facturación Electrónica SaaS"
      emailPlaceholder="ejemplo@ingefact.com"
      onSubmit={forgotPasswordAdmin}
      loginPath="/login"
    />
  );
}
