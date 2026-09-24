import Link from "next/link";
import { BUSINESS, PACKAGE_TERMS } from "@/data/business";
import { DOCUMENTOS_QUE_CONSUMEN } from "@/data/pricing";

/**
 * Información mínima previa a la compra (Ley 1480 de 2011, arts. 23, 26 y 50):
 * precio total, qué incluye, vigencia y condiciones de devolución.
 */
export function PricingConditions({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-brand-lg border border-neutralCustom-100 bg-white p-6 text-left text-sm leading-relaxed text-neutralCustom-500 ${className}`}>
      <h2 className="mb-3 text-base font-bold text-neutralCustom-800">Condiciones de los paquetes</h2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          Precios finales en pesos colombianos (COP). {BUSINESS.regimenIva}: no se cobra IVA adicional.
        </li>
        <li>
          Cada documento aceptado por la DIAN descuenta uno del paquete: {DOCUMENTOS_QUE_CONSUMEN.join(", ").toLowerCase()}.
          Los documentos rechazados no se descuentan.
        </li>
        <li>
          Los documentos se pueden usar durante {PACKAGE_TERMS.vigenciaMeses} meses contados desde la activación del
          paquete. Los no usados en ese plazo vencen.
        </li>
        <li>
          Con el paquete agotado no se puede enviar ningún documento a la DIAN, incluidas notas crédito y débito,
          anulaciones y eventos sobre facturas recibidas, hasta comprar un paquete nuevo.
        </li>
        <li>
          Tienes derecho de retracto dentro de los {PACKAGE_TERMS.diasRetracto} días hábiles siguientes a la compra si no
          has emitido ningún documento. Consulta la{" "}
          <Link href="/reembolsos" className="font-semibold text-brand-600 underline hover:text-brand-700">
            política de reembolsos y retracto
          </Link>{" "}
          y los{" "}
          <Link href="/terminos" className="font-semibold text-brand-600 underline hover:text-brand-700">
            términos y condiciones
          </Link>
          .
        </li>
      </ul>
    </div>
  );
}
