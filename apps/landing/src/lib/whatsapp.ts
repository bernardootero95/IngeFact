export const WHATSAPP_NUMBER = "573046402211";
export const WHATSAPP_DISPLAY = "+57 304 6402211";

export function buildWhatsAppLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
