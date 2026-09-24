export interface FaqEntry {
  question: string;
  answer: string;
}

export const PRICING_FAQ: FaqEntry[] = [
  {
    question: "¿Cómo compro un paquete de documentos?",
    answer: "Escríbenos por WhatsApp con el paquete que necesitas y te ayudamos a activarlo en tu empresa.",
  },
  {
    question: "¿Qué cuenta como un documento?",
    answer:
      "Cada factura, nota crédito, nota débito, documento soporte, comprobante de nómina, anulación de nómina o evento sobre una factura recibida (acuse de recibo, recibo del bien o servicio, aceptación o reclamo) aceptado por la DIAN descuenta uno de tu paquete. Lo que la DIAN rechaza no se descuenta.",
  },
  {
    question: "¿Los documentos vencen?",
    answer:
      "Sí. Cada paquete se puede usar durante 12 meses desde su activación; los documentos que no uses en ese plazo vencen y no son reembolsables.",
  },
  {
    question: "¿Qué pasa cuando se me acaban los documentos?",
    answer:
      "Te enviamos un aviso por correo al llegar al 90 % de tu paquete. Al agotarse, no podrás enviar ningún documento a la DIAN (tampoco notas crédito o débito, anulaciones ni eventos) hasta comprar otro paquete.",
  },
  {
    question: "¿Necesito una resolución DIAN propia?",
    answer:
      "Para facturas y documento soporte, sí: la resolución la tramitas tú ante la DIAN y la registras en IngeFact, que controla el consecutivo. La nómina electrónica no requiere resolución de numeración.",
  },
  {
    question: "¿Y si necesito una cantidad distinta a las del listado?",
    answer: "Escríbenos por WhatsApp y armamos un paquete a la medida de tu negocio.",
  },
];

export const CONTACT_FAQ: FaqEntry[] = [
  {
    question: "¿IngeFact reemplaza a mi contador?",
    answer:
      "No. IngeFact es la herramienta para emitir y transmitir tus documentos electrónicos. La información que registras y el cumplimiento de tus obligaciones tributarias y laborales siguen siendo responsabilidad de tu empresa y de tu contador.",
  },
  {
    question: "¿Cómo protegen mis datos?",
    answer:
      "La información de cada empresa está aislada de las demás y solo se accede con tu usuario y contraseña, por conexiones cifradas. Consulta la política de tratamiento de datos personales para conocer el detalle y tus derechos.",
  },
  {
    question: "¿Cómo empiezo a usar IngeFact?",
    answer: "Escríbenos por WhatsApp y te ayudamos a configurar tu empresa paso a paso.",
  },
];
