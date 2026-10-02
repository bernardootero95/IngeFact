import { AppFooter } from "@ingefact/ui";
import { version } from "../../package.json";

// Mismo numero de WhatsApp que la landing (apps/landing/src/lib/whatsapp.ts).
const SOPORTE_WHATSAPP = `https://wa.me/573046402211?text=${encodeURIComponent(
  "Hola, necesito soporte técnico con IngeFact.",
)}`;

export default function Footer() {
  return <AppFooter ownerName="TecnoIngeniería B.O." version={version} supportHref={SOPORTE_WHATSAPP} />;
}
