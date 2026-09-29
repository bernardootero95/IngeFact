/**
 * Artículos informativos: responden lo que la gente busca sobre documentos
 * electrónicos DIAN y atraen tráfico orgánico.
 *
 * Cada dato normativo se verificó contra el texto oficial (normograma DIAN o
 * micrositio de facturación electrónica) el 2026-09-28 y la fuente queda en
 * `sources`. Si la DIAN cambia la norma, actualiza el texto y `updated`.
 */
export type ArticleBlock = string | { list: string[]; ordered?: boolean };

export interface ArticleSection {
  id: string;
  title: string;
  blocks: ArticleBlock[];
}

export interface Article {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  /** Fechas ISO. */
  published: string;
  updated: string;
  intro: string;
  sections: ArticleSection[];
  /** Página de servicio relacionada (ver data/services.ts). */
  serviceSlug: string;
  sources: { label: string; url: string }[];
}

export const ARTICLES: Article[] = [
  {
    slug: "como-habilitarse-facturador-electronico",
    title: "Cómo habilitarse como facturador electrónico ante la DIAN, paso a paso",
    metaTitle: "Cómo habilitarse como facturador electrónico DIAN",
    description:
      "Los pasos para registrarte y habilitarte como facturador electrónico: portal de habilitación, modalidad, set de pruebas, numeración en MUISCA y salida a producción.",
    published: "2026-09-28",
    updated: "2026-09-28",
    intro:
      "Para emitir facturas electrónicas primero debes registrarte y habilitarte ante la DIAN. El proceso se hace en línea y tiene cinco pasos: registro, elección del software, set de pruebas, habilitación y numeración.",
    sections: [
      {
        id: "antes-de-empezar",
        title: "Antes de empezar",
        blocks: [
          "Revisa que tu RUT esté actualizado, en especial el correo electrónico: la DIAN envía a ese correo el token con el que ingresas a sus portales.",
          "Decide también con qué vas a facturar. La DIAN admite tres modalidades:",
          {
            list: [
              "Software de un proveedor tecnológico: un tercero autorizado por la DIAN valida y firma tus documentos. Es la opción más común para empresas pequeñas y medianas.",
              "Software propio: desarrollas y mantienes tu propio sistema.",
              "Solución gratuita de la DIAN: no tiene costo, pero ofrece menos funciones.",
            ],
          },
        ],
      },
      {
        id: "registro",
        title: "Paso 1: regístrate en el portal de habilitación",
        blocks: [
          "Ingresa al portal de habilitación de factura electrónica de la DIAN, genera el token con tus datos y ábrelo desde el correo del RUT. Dentro del portal, formaliza el registro con el botón Registrar, sal del sistema y vuelve a entrar con un token nuevo para que el cambio se refleje.",
        ],
      },
      {
        id: "modalidad",
        title: "Paso 2: elige el modo de operación y asocia el software",
        blocks: [
          "En el menú de registro y habilitación selecciona factura electrónica y el modo de operación que elegiste. Si usas un proveedor tecnológico, selecciónalo junto con su software y asócialo a tu empresa. El sistema genera entonces un rango de numeración de pruebas.",
        ],
      },
      {
        id: "set-de-pruebas",
        title: "Paso 3: supera el set de pruebas",
        blocks: [
          "El set de pruebas consiste en enviar, en el ambiente de pruebas de la DIAN, un grupo de facturas, notas crédito y notas débito que deben validarse sin errores. La cantidad de cada documento la indica el portal y depende de la modalidad. Si usas un proveedor tecnológico, normalmente él te guía o lo hace por ti.",
        ],
      },
      {
        id: "habilitacion",
        title: "Paso 4: pasa a Habilitado y fija tu fecha de inicio",
        blocks: [
          "Cuando superas el set de pruebas, tu estado cambia de Registrado a Habilitado. En el portal Facturando Electrónicamente indicas la fecha en la que empiezas a emitir facturas electrónicas. A partir de la habilitación, la DIAN agrega a tu RUT la responsabilidad 52, Facturador electrónico.",
        ],
      },
      {
        id: "numeracion",
        title: "Paso 5: solicita la numeración en MUISCA",
        blocks: [
          "Las facturas reales necesitan una numeración autorizada. Solicítala en el sistema MUISCA de la DIAN: allí pides el rango de numeración de facturación electrónica, con su prefijo, y la numeración para contingencias. Después vuelve al portal Facturando Electrónicamente y asocia ese rango a tu software.",
          "La autorización tiene una vigencia y un rango. Cuando se vence o se agota, debes pedir una nueva antes de seguir facturando.",
        ],
      },
      {
        id: "con-ingefact",
        title: "Si facturas con IngeFact",
        blocks: [
          "Te indicamos qué proveedor y software seleccionar en el paso 2 y te acompañamos por WhatsApp en el set de pruebas. Cuando tengas la resolución, la registras en IngeFact, que lleva el consecutivo y te avisa cuando se acerca su vencimiento.",
        ],
      },
    ],
    serviceSlug: "facturacion-electronica",
    sources: [
      {
        label: "DIAN: proceso de registro y habilitación como facturador electrónico",
        url: "https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proceso-de-registro-y-habilitacion-como-facturador-electronico/",
      },
      {
        label: "DIAN: requerimientos para ser facturador electrónico",
        url: "https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/requerimientos-para-ser-facturador-electronico/",
      },
    ],
  },
  {
    slug: "documento-soporte-no-obligados-a-facturar",
    title: "Documento soporte en compras a no obligados a facturar: qué es, quién lo emite y cuándo",
    metaTitle: "Documento soporte a no obligados a facturar: guía",
    description:
      "Qué es el documento soporte en adquisiciones a no obligados a facturar, quién debe emitirlo, en qué plazo se transmite y qué requisitos tiene (Resolución DIAN 000167 de 2021).",
    published: "2026-09-28",
    updated: "2026-09-28",
    intro:
      "Cuando le compras a alguien que no está obligado a expedir factura, la compra no queda soportada con una factura del vendedor. En ese caso eres tú, el comprador, quien genera el documento soporte electrónico y lo transmite a la DIAN.",
    sections: [
      {
        id: "que-es",
        title: "¿Qué es el documento soporte?",
        blocks: [
          "Es el documento electrónico que respalda las compras de bienes y servicios hechas a personas no obligadas a facturar. Lo regula la Resolución DIAN 000167 de 2021 y su transmisión electrónica es obligatoria desde el 1 de agosto de 2022.",
          "Sirve para soportar el costo, la deducción o el impuesto descontable de esa compra.",
        ],
      },
      {
        id: "quien",
        title: "¿Quién debe generarlo?",
        blocks: [
          "Según el artículo 3 de la resolución, lo generan los adquirentes que sean facturadores electrónicos, contribuyentes del impuesto sobre la renta o responsables de IVA, cuando compran a sujetos no obligados a facturar. Es el caso típico de las compras a:",
          {
            list: [
              "Personas naturales no responsables de IVA que no están obligadas a facturar.",
              "Pequeños proveedores, independientes y prestadores de servicios que no expiden factura.",
              "Proveedores del exterior sin residencia fiscal en Colombia: en ese caso el NIT se reemplaza por la identificación de su país.",
            ],
          },
        ],
      },
      {
        id: "cuando",
        title: "¿Cuándo se genera y se transmite?",
        blocks: [
          "La resolución permite dos formas:",
          {
            list: [
              "Por cada operación: generas el documento en el momento de la compra.",
              "Acumulado semanal: reúnes en un solo documento las compras de la semana a un mismo proveedor y lo transmites a más tardar el último día hábil de esa semana.",
            ],
          },
          "Genéralo dentro de esos plazos: un documento soporte emitido fuera de ellos puede perder su efecto fiscal.",
        ],
      },
      {
        id: "requisitos",
        title: "¿Qué requisitos tiene?",
        blocks: [
          {
            list: [
              "Llamarse expresamente documento soporte en adquisiciones efectuadas a sujetos no obligados a expedir factura.",
              "La fecha de la operación, que debe coincidir con la de generación.",
              "Nombre o razón social y NIT del vendedor o prestador del servicio.",
              "Un número consecutivo dentro de un rango y una vigencia autorizados por la DIAN: el documento soporte necesita su propia resolución de numeración, distinta de la de facturación.",
              "La descripción, el valor de la operación y los impuestos que apliquen.",
            ],
          },
        ],
      },
      {
        id: "con-ingefact",
        title: "Si emites el documento soporte con IngeFact",
        blocks: [
          "Registras a tus proveedores y la resolución de numeración del documento soporte; IngeFact lleva el consecutivo, transmite el documento a la DIAN y te muestra si fue aceptado. Hoy admite proveedores con identificación colombiana.",
        ],
      },
    ],
    serviceSlug: "documento-soporte",
    sources: [
      {
        label: "Resolución DIAN 000167 de 2021 (normograma DIAN)",
        url: "https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0167_2021.htm",
      },
      {
        label: "DIAN: documento soporte con sujetos no obligados a expedir factura",
        url: "https://www.dian.gov.co/impuestos/Paginas/Sistema-de-Factura-Electronica/Documento-Soporte-Adquisiciones-No-Obligados.aspx",
      },
    ],
  },
  {
    slug: "eventos-radian-factura-titulo-valor",
    title: "Eventos RADIAN: qué son y cómo convierten la factura electrónica en título valor",
    metaTitle: "Eventos RADIAN y factura electrónica como título valor",
    description:
      "Qué es RADIAN, cuáles son los eventos de la factura electrónica (acuse, recibo, aceptación y reclamo) y qué se necesita para que sea título valor (Resolución DIAN 000085 de 2022).",
    published: "2026-09-28",
    updated: "2026-09-28",
    intro:
      "Una factura electrónica puede venderse o usarse como garantía, igual que una factura en papel, pero solo si queda registrada como título valor. Para eso existen RADIAN y sus eventos.",
    sections: [
      {
        id: "que-es",
        title: "¿Qué es RADIAN?",
        blocks: [
          "RADIAN es el Registro de la Factura Electrónica de Venta considerada Título Valor, que administra la DIAN. Allí quedan los eventos de cada factura: si el comprador la recibió, si recibió lo facturado y si la aceptó o la reclamó. Lo regula la Resolución DIAN 000085 de 2022.",
          "Según el artículo 31 de esa resolución, la factura electrónica que no se registre en RADIAN no puede circular como título valor en el territorio nacional.",
        ],
      },
      {
        id: "eventos",
        title: "Los eventos de la factura electrónica",
        blocks: [
          {
            list: [
              "Acuse de recibo: el comprador informa que recibió la factura electrónica.",
              "Recibo del bien o prestación del servicio: el comprador deja constancia de que recibió lo facturado.",
              "Aceptación expresa: el comprador acepta la factura.",
              "Reclamo: el comprador rechaza la factura e indica el motivo.",
              "Aceptación tácita: la registra el vendedor cuando el comprador no reclamó a tiempo.",
            ],
          },
        ],
      },
      {
        id: "titulo-valor",
        title: "¿Qué se necesita para que la factura sea título valor?",
        blocks: [
          "El artículo 7 de la Resolución 000085 de 2022 exige tres eventos:",
          {
            list: [
              "El acuse de recibo de la factura.",
              "El recibo del bien o de la prestación del servicio.",
              "La aceptación, expresa o tácita.",
            ],
            ordered: true,
          },
          "La aceptación tácita se basa en el artículo 773 del Código de Comercio: si el comprador no reclama dentro de los tres días hábiles siguientes, la factura se entiende aceptada de forma irrevocable. Según las reglas de la DIAN, ese plazo se cuenta desde el evento de recibo del bien o del servicio.",
        ],
      },
      {
        id: "obligatorio",
        title: "¿Estoy obligado a registrar los eventos?",
        blocks: [
          "Los eventos son necesarios para que la factura circule como título valor. Si tu proveedor quiere vender su factura (factoring) o usarla como respaldo de un crédito, necesitará que registres el acuse, el recibo y la aceptación. Un reclamo, en cambio, impide que la factura sea aceptada. Confirma con tu contador cómo aplica a tu empresa.",
        ],
      },
      {
        id: "con-ingefact",
        title: "Si registras los eventos con IngeFact",
        blocks: [
          "Registras la factura recibida con su CUFE y eliges el evento: acuse de recibo, recibo del bien o servicio, aceptación expresa o reclamo. IngeFact lo transmite a la DIAN y te muestra la respuesta. Cada evento aceptado por la DIAN descuenta un documento de tu paquete.",
        ],
      },
    ],
    serviceSlug: "radian",
    sources: [
      {
        label: "Resolución DIAN 000085 de 2022 (normograma DIAN)",
        url: "https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0085_2022.htm",
      },
      {
        label: "Resolución DIAN 000085 de 2022 (texto publicado por la DIAN)",
        url: "https://www.dian.gov.co/normatividad/Normatividad/Resoluci%C3%B3n%20000085%20de%2008-04-2022.pdf",
      },
    ],
  },
  {
    slug: "nomina-electronica-plazos-obligados",
    title: "Nómina electrónica: quién debe transmitirla y en qué plazo",
    metaTitle: "Nómina electrónica DIAN: plazos y obligados",
    description:
      "Quién está obligado a transmitir la nómina electrónica, en qué plazo se envía a la DIAN y cómo se corrige o anula un comprobante (Resolución DIAN 000013 de 2021).",
    published: "2026-09-28",
    updated: "2026-09-28",
    intro:
      "La nómina electrónica es el reporte mensual de lo que el empleador pagó y descontó a cada trabajador. No reemplaza la liquidación de la nómina ni la planilla de seguridad social: es el soporte que la DIAN exige para aceptar esos pagos como costo o deducción.",
    sections: [
      {
        id: "que-es",
        title: "¿Qué es el documento soporte de pago de nómina electrónica?",
        blocks: [
          "Es el documento que regula la Resolución DIAN 000013 de 2021. Se genera por cada trabajador y reúne los devengados (salario, auxilio de transporte, horas extra, vacaciones, primas, cesantías, incapacidades y demás) y las deducciones (salud, pensión, retención en la fuente, libranzas y demás) del mes.",
        ],
      },
      {
        id: "obligados",
        title: "¿Quién debe transmitirla?",
        blocks: [
          "Según el artículo 4 de la resolución, los contribuyentes del impuesto sobre la renta que hacen pagos o abonos en cuenta derivados de una relación laboral, o legal y reglamentaria, y que quieren soportar esos pagos como costo o deducción. También incluye los pagos a pensionados a cargo del empleador.",
        ],
      },
      {
        id: "plazo",
        title: "¿En qué plazo se transmite?",
        blocks: [
          "El artículo 8 fija el plazo: el documento se transmite dentro de los diez (10) primeros días del mes siguiente al mes del pago o abono en cuenta. Por ejemplo, la nómina pagada en septiembre se transmite dentro de los primeros diez días de octubre.",
          "No necesita resolución de numeración, a diferencia de la factura y del documento soporte.",
        ],
      },
      {
        id: "correcciones",
        title: "¿Cómo se corrige un comprobante?",
        blocks: [
          "Un comprobante ya transmitido no se borra: se corrige con una nota de ajuste, que puede reemplazarlo o eliminarlo. La nota de eliminación anula el comprobante y lleva su propia numeración.",
        ],
      },
      {
        id: "con-ingefact",
        title: "Si transmites la nómina con IngeFact",
        blocks: [
          "Registras a tus empleados una vez y transmites el comprobante de cada uno con sus devengados y deducciones. Si hace falta, lo anulas con una nota de eliminación. Cada comprobante aceptado descuenta un documento de tu paquete, y cada anulación descuenta otro.",
        ],
      },
    ],
    serviceSlug: "nomina-electronica",
    sources: [
      {
        label: "Resolución DIAN 000013 de 2021 (normograma DIAN)",
        url: "https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0013_2021.htm",
      },
    ],
  },
];

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
