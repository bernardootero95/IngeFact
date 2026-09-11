import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export function CustomAmountBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-between gap-6 rounded-brand-lg bg-brand-600 px-7 py-6 text-left ${className}`}
    >
      <div>
        <div className="mb-0.5 text-[15px] font-bold text-white">¿Necesitas una cantidad específica?</div>
        <div className="text-[13px] text-brand-50">Escríbenos y armamos tu plan a la medida.</div>
      </div>
      <WhatsAppButton message="Hola, necesito un paquete de documentos a la medida." className="flex-shrink-0" />
    </div>
  );
}
