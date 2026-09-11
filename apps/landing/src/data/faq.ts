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
    question: "¿Qué pasa cuando se me acaban los documentos?",
    answer: "Te avisamos antes de que se agote tu paquete. Puedes comprar uno nuevo en cualquier momento para seguir facturando sin interrupciones.",
  },
  {
    question: "¿Necesito una resolución DIAN propia?",
    answer: "Sí, la resolución de facturación la tramitas directamente ante la DIAN; IngeFact te ayuda a configurarla y a controlar el consecutivo automáticamente.",
  },
  {
    question: "¿Y si necesito una cantidad distinta a las del listado?",
    answer: "Escríbenos por WhatsApp y armamos un paquete a la medida de tu negocio.",
  },
];

export const CONTACT_FAQ: FaqEntry[] = [
  {
    question: "¿IngeFact reemplaza a mi contador?",
    answer: "No. IngeFact se encarga de la emisión y el cumplimiento técnico de tus facturas electrónicas; tu contador sigue siendo quien lleva tu contabilidad.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer: "Sí. Tu información y la de tus clientes se mantiene aislada por empresa y solo tu equipo puede acceder a ella.",
  },
  {
    question: "¿Cómo empiezo a usar IngeFact?",
    answer: "Escríbenos por WhatsApp y te ayudamos a configurar tu empresa paso a paso.",
  },
];
