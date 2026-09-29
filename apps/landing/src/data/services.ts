import type { ComponentType } from "react";
import { InboxCheckIcon, InvoiceIcon, PayrollIcon, ReceiptIcon } from "@/components/ui/icons";
import { FEATURE_CATEGORIES, type FeatureItem } from "@/data/features";
import type { FaqEntry } from "@/data/faq";

/**
 * Una página por servicio, cada una enfocada en lo que la gente busca en
 * Google ("nómina electrónica DIAN", "documento soporte", etc.).
 *
 * Las afirmaciones normativas son generales y citan la norma vigente; cada
 * página aclara que el caso concreto se confirma con el contador. Revisar
 * estos textos si la DIAN cambia la regulación.
 */
export interface Service {
  slug: string;
  icon: ComponentType<{ className?: string }>;
  /** Nombre corto, para enlaces y la ruta de navegación. */
  name: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  whatIs: { title: string; paragraphs: string[] };
  whoMustComply: { title: string; intro: string; points: string[] };
  features: FeatureItem[];
  /** Qué descuenta del paquete en este servicio. */
  consumption: string;
  guideSlugs: string[];
  faq: FaqEntry[];
}

function featuresOf(categoryTitle: string): FeatureItem[] {
  const category = FEATURE_CATEGORIES.find((c) => c.title === categoryTitle);
  if (!category) throw new Error(`No existe la categoría de características "${categoryTitle}"`);
  return category.items;
}

export const SERVICES = {
  facturacion: {
    slug: "facturacion-electronica",
    icon: InvoiceIcon,
    name: "Facturación electrónica",
    metaTitle: "Software de facturación electrónica DIAN",
    metaDescription:
      "Emite facturas electrónicas, notas crédito y notas débito ante la DIAN desde el navegador. Pagas por paquetes de documentos, sin mensualidades ni permanencia.",
    eyebrow: "Facturación electrónica",
    h1: "Software de facturación electrónica DIAN para tu empresa",
    intro:
      "Crea tus facturas de venta, envíalas a la DIAN y recibe la respuesta en la misma pantalla. Corrige o anula con notas crédito y débito, y envía el PDF y el XML a tu cliente por correo.",
    whatIs: {
      title: "¿Qué es la factura electrónica de venta?",
      paragraphs: [
        "Es la factura que se genera en formato XML, se firma digitalmente y se valida ante la DIAN antes de entregarse al comprador. Tiene la misma validez que la factura en papel y hoy es el sistema general de facturación en Colombia (Resolución DIAN 000165 de 2023).",
        "Cada factura lleva un código único (CUFE) y un código QR con el que cualquiera puede consultarla en el portal de la DIAN. Su numeración sale de una resolución de facturación que el emisor tramita ante la DIAN.",
      ],
    },
    whoMustComply: {
      title: "¿Quién debe facturar electrónicamente?",
      intro:
        "En general, quienes venden bienes o prestan servicios y están obligados a facturar según el Estatuto Tributario, por ejemplo:",
      points: [
        "Personas jurídicas, sin importar su tamaño.",
        "Personas naturales responsables de IVA o del impuesto nacional al consumo.",
        "Quienes no estando obligados deciden facturar, por ejemplo para soportar sus ingresos ante sus clientes.",
      ],
    },
    features: featuresOf("Facturación electrónica"),
    consumption: "Cada factura, nota crédito y nota débito aceptada por la DIAN descuenta un documento de tu paquete.",
    guideSlugs: ["emitir-factura", "nota-credito", "nota-debito", "anular-documento", "configurar-resolucion"],
    faq: [
      {
        question: "¿Necesito una resolución de facturación para usar IngeFact?",
        answer:
          "Sí. La resolución de numeración la tramitas tú ante la DIAN y luego la registras en IngeFact, que lleva el consecutivo y te avisa cuando se acerca su vencimiento.",
      },
      {
        question: "¿Puedo anular una factura electrónica?",
        answer:
          "Una factura aceptada por la DIAN no se borra: se anula o corrige con una nota crédito, total o parcial. IngeFact la genera a partir de la factura original.",
      },
      {
        question: "¿Mi cliente recibe la factura?",
        answer:
          "Sí. Puedes enviarle por correo la representación gráfica en PDF y el XML desde IngeFact, o descargarlos para enviarlos por tu cuenta.",
      },
    ],
  },
  nomina: {
    slug: "nomina-electronica",
    icon: PayrollIcon,
    name: "Nómina electrónica",
    metaTitle: "Nómina electrónica DIAN para empleadores",
    metaDescription:
      "Registra a tus empleados y transmite a la DIAN el documento soporte de pago de nómina electrónica, con devengados, deducciones y anulaciones. Sin mensualidades.",
    eyebrow: "Nómina electrónica",
    h1: "Nómina electrónica DIAN, sin complicaciones",
    intro:
      "Registra a tus empleados una sola vez y transmite a la DIAN el comprobante de nómina de cada uno, con sus devengados y deducciones. Si te equivocas, lo anulas con su propia numeración.",
    whatIs: {
      title: "¿Qué es la nómina electrónica?",
      paragraphs: [
        "Es el documento soporte de pago de nómina electrónica: el reporte que el empleador transmite a la DIAN con lo que pagó y descontó a cada trabajador en el mes (Resolución DIAN 000013 de 2021). Se transmite una vez al mes, dentro de los plazos que fija la DIAN.",
        "No reemplaza la liquidación de la nómina ni la planilla de seguridad social (PILA): es el soporte que la DIAN exige para aceptar esos pagos como costo o deducción en la declaración de renta.",
      ],
    },
    whoMustComply: {
      title: "¿Quién debe transmitir nómina electrónica?",
      intro: "Quienes hacen pagos derivados de una relación laboral y quieren soportarlos como costo o deducción, por ejemplo:",
      points: [
        "Empresas y personas naturales empleadoras con trabajadores vinculados por contrato laboral.",
        "Quienes llevan esos pagos como costo o deducción en su declaración de renta.",
      ],
    },
    features: featuresOf("Nómina electrónica"),
    consumption:
      "Cada comprobante de nómina aceptado por la DIAN descuenta un documento de tu paquete, y cada anulación de un comprobante descuenta otro.",
    guideSlugs: ["nomina-electronica"],
    faq: [
      {
        question: "¿La nómina electrónica necesita resolución de numeración?",
        answer: "No. A diferencia de la factura y del documento soporte, la nómina electrónica no requiere resolución: IngeFact lleva su numeración.",
      },
      {
        question: "¿IngeFact liquida la nómina?",
        answer:
          "IngeFact registra y transmite los valores que liquidas (básico, horas extra, vacaciones, prima, salud, pensión y demás). El cálculo y su revisión siguen a cargo de tu empresa y tu contador.",
      },
      {
        question: "¿Qué pasa si transmití un comprobante con errores?",
        answer: "Puedes anularlo con una nota de eliminación, que tiene su propia numeración, y transmitir el comprobante correcto.",
      },
    ],
  },
  documentoSoporte: {
    slug: "documento-soporte",
    icon: ReceiptIcon,
    name: "Documento soporte",
    metaTitle: "Documento soporte electrónico DIAN",
    metaDescription:
      "Emite el documento soporte electrónico de tus compras a personas no obligadas a facturar y transmítelo a la DIAN. Con numeración propia y PDF para tu proveedor.",
    eyebrow: "Documento soporte",
    h1: "Documento soporte electrónico para tus compras",
    intro:
      "Cuando le compras a alguien que no está obligado a facturar, el documento soporte es lo que respalda esa compra ante la DIAN. En IngeFact lo creas, lo transmites y guardas su PDF y XML.",
    whatIs: {
      title: "¿Qué es el documento soporte?",
      paragraphs: [
        "Es el documento electrónico que emite el comprador cuando adquiere bienes o servicios de una persona que no está obligada a expedir factura (Resolución DIAN 000167 de 2021).",
        "Sirve para soportar el costo, la deducción o el impuesto descontable de esa compra. Como la factura, se valida ante la DIAN y usa una numeración autorizada, distinta de la de facturación.",
      ],
    },
    whoMustComply: {
      title: "¿Cuándo debes emitirlo?",
      intro: "Cuando quieres soportar una compra hecha a un proveedor que no factura, por ejemplo:",
      points: [
        "Personas naturales no responsables de IVA que no están obligadas a facturar.",
        "Pequeños comerciantes, independientes y prestadores de servicios que no expiden factura.",
        "Cualquier compra que quieras llevar como costo o deducción y cuyo proveedor no te entregó factura por no estar obligado.",
      ],
    },
    features: featuresOf("Documento soporte"),
    consumption: "Cada documento soporte aceptado por la DIAN descuenta un documento de tu paquete.",
    guideSlugs: ["documento-soporte", "configurar-resolucion"],
    faq: [
      {
        question: "¿El documento soporte necesita resolución?",
        answer:
          "Sí. Necesita una resolución de numeración propia, separada de la de facturación. La tramitas ante la DIAN y la registras en IngeFact.",
      },
      {
        question: "¿Quién emite el documento soporte, el comprador o el vendedor?",
        answer: "El comprador. Es quien adquiere el bien o servicio el que lo genera y lo transmite a la DIAN.",
      },
      {
        question: "¿Le puedo enviar el documento al proveedor?",
        answer: "Sí. Puedes descargar el PDF y el XML o enviarlos por correo desde IngeFact.",
      },
    ],
  },
  radian: {
    slug: "radian",
    icon: InboxCheckIcon,
    name: "Aceptación de facturas (RADIAN)",
    metaTitle: "Eventos RADIAN: acepta o reclama tus facturas",
    metaDescription:
      "Registra ante la DIAN el acuse de recibo, el recibo del bien o servicio, la aceptación o el reclamo de las facturas electrónicas que te emiten tus proveedores.",
    eyebrow: "RADIAN",
    h1: "Acepta o reclama tus facturas recibidas ante la DIAN",
    intro:
      "Registra los eventos de las facturas electrónicas que te emiten tus proveedores: acuse de recibo, recibo del bien o servicio, aceptación expresa o reclamo, desde el CUFE de cada factura.",
    whatIs: {
      title: "¿Qué es RADIAN y para qué sirven los eventos?",
      paragraphs: [
        "RADIAN es el registro de la DIAN donde quedan los eventos de cada factura electrónica: si el comprador la recibió, si recibió lo facturado y si la aceptó o la reclamó (Resolución DIAN 000085 de 2022).",
        "Esos eventos son los que permiten que una factura circule como título valor, por ejemplo para venderla en factoring o usarla como respaldo de un crédito.",
      ],
    },
    whoMustComply: {
      title: "¿Qué eventos registras como comprador?",
      intro: "Sobre cada factura que recibes puedes registrar:",
      points: [
        "Acuse de recibo de la factura electrónica.",
        "Recibo del bien o de la prestación del servicio.",
        "Aceptación expresa de la factura, o un reclamo con su motivo si no estás de acuerdo.",
      ],
    },
    features: featuresOf("Aceptación de facturas (RADIAN)"),
    consumption: "Cada evento aceptado por la DIAN descuenta un documento de tu paquete; los que la DIAN rechaza no.",
    guideSlugs: ["aceptar-facturas-recibidas"],
    faq: [
      {
        question: "¿Estoy obligado a aceptar las facturas que recibo?",
        answer:
          "Los eventos son los que le dan efectos de título valor a la factura. Si tu proveedor necesita esa aceptación, por ejemplo para hacer factoring, te la pedirá. Confirma con tu contador cómo aplica a tu caso.",
      },
      {
        question: "¿Qué necesito para registrar un evento?",
        answer: "El CUFE de la factura que recibiste. Con él la registras en IngeFact y luego eliges el evento.",
      },
      {
        question: "¿Puedo reclamar una factura después de aceptarla?",
        answer:
          "No. La DIAN rechaza el reclamo de una factura que ya aceptaste, y la aceptación de una que ya reclamaste. Un evento rechazado no descuenta documentos de tu paquete.",
      },
    ],
  },
} satisfies Record<string, Service>;

export const ALL_SERVICES: Service[] = Object.values(SERVICES);
