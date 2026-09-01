import { useSearchParams } from "react-router-dom";
import { ResetPasswordForm } from "@ingefact/ui";
import { resetPassword } from "@ingefact/core-api";
import logo from "../../../assets/logo.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  return (
    <ResetPasswordForm
      logo={logo}
      subtitle="Sistema de Facturación Electrónica SaaS"
      token={token}
      onSubmit={resetPassword}
      loginPath="/login"
      forgotPasswordPath="/forgot-password"
    />
  );
}
