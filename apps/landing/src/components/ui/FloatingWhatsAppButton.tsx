import { WhatsAppIcon } from "@/components/ui/icons";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function FloatingWhatsAppButton() {
  return (
    <a
      href={buildWhatsAppLink("Hola, quiero más información sobre IngeFact.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#166616] text-white shadow-[0_8px_20px_rgba(22,102,22,0.4)] transition-transform hover:scale-105 hover:bg-[#0F4F0F]"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
