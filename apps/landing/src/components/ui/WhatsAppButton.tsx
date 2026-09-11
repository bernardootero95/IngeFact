import { WhatsAppIcon } from "@/components/ui/icons";
import { WHATSAPP_DISPLAY, buildWhatsAppLink } from "@/lib/whatsapp";

interface WhatsAppButtonProps {
  message?: string;
  label?: string;
  className?: string;
}

export function WhatsAppButton({ message, label, className = "" }: WhatsAppButtonProps) {
  return (
    <a
      href={buildWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-[#166616] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#0F4F0F] ${className}`}
    >
      <WhatsAppIcon className="h-4 w-4" />
      {label ?? WHATSAPP_DISPLAY}
    </a>
  );
}
