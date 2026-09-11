import type { ComponentType } from "react";
import {
  ChartIcon,
  ClockIcon,
  InvoiceIcon,
  KeyIcon,
  PencilIcon,
  PlusCircleIcon,
  RefundIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersIcon,
  XCircleIcon,
} from "@/components/ui/icons";

export interface Guide {
  slug: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  intro: string;
  steps: string[];
  note?: string;
}

export interface GuideGroup {
  title: string;
  guides: Guide[];
}

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    title: "Primeros pasos",
    guides: [
      {
        slug: "iniciar-sesion",
        icon: KeyIcon,
        title: "Inicia sesión por primera vez",
        description: "Tu cuenta la activa nuestro equipo; usa la contraseña temporal que te enviamos para entrar.",
        intro:
          "Cuando tu empresa queda registrada en IngeFact, tú no creas la cuenta: nuestro equipo la activa por ti y te envía las credenciales para tu primer ingreso.",
        steps: [
          "Recibe el correo con tu usuario y una contraseña temporal apenas tu empresa queda activa en IngeFact.",
          "Entra a la aplicación con esas credenciales.",
          "En tu primer ingreso, el sistema te pedirá cambiar la contraseña temporal por una tuya antes de dejarte continuar.",
          "De ahí en adelante, inicia sesión normalmente con tu correo y tu nueva contraseña.",
        ],
        note: "Solo existe un usuario por empresa en IngeFact — no hay un flujo para invitar a más personas de tu equipo.",
      },
      {
        slug: "datos-fiscales",
        icon: PencilIcon,
        title: "Configura tus datos fiscales",
        description: "NIT, régimen y demás datos que la DIAN exige antes de tu primera factura.",
        intro: "Antes de emitir tu primera factura, revisa que los datos de tu empresa estén completos.",
        steps: [
          "Ve a Configuración → Datos de la Empresa.",
          "Tu NIT, razón social y correo aparecen de solo lectura — los administra nuestro equipo porque están ligados a lo ya registrado ante la DIAN.",
          "Puedes editar tú mismo el nombre comercial, el teléfono y la dirección.",
          "Guarda los cambios: se reflejan de inmediato en el menú lateral y en tus documentos.",
        ],
      },
      {
        slug: "panel-principal",
        icon: ChartIcon,
        title: "Conoce tu panel principal",
        description: "Revisa cuántos documentos tienes disponibles y el estado de tu empresa de un vistazo.",
        intro: "El panel principal (Dashboard) es lo primero que ves al iniciar sesión.",
        steps: [
          "Revisa cuántas facturas has emitido este mes y cuántos clientes tienes registrados.",
          "Consulta tus documentos disponibles: cuántos has usado de tu plan actual y cuántos te quedan.",
          "El indicador de conexión con la DIAN te confirma que tu empresa está lista para facturar.",
          "Desde el menú lateral accedes a Documentos, Clientes, Catálogo y Configuración.",
        ],
      },
    ],
  },
  {
    title: "Facturación",
    guides: [
      {
        slug: "emitir-factura",
        icon: InvoiceIcon,
        title: "Emitir tu primera factura",
        description: "De la selección del cliente al envío ante la DIAN, paso a paso.",
        intro:
          "Antes de tu primera factura necesitas tener al menos un cliente registrado, un producto o servicio en tu catálogo, y tu Resolución DIAN configurada.",
        steps: [
          "Ve a Documentos → Facturas → Nueva Factura.",
          "Elige el cliente, o créalo ahí mismo sin perder lo que ya llevas escrito.",
          "Agrega las líneas de producto o servicio: el precio y el impuesto se calculan solos, pero puedes ajustar el precio unitario si lo necesitas.",
          "Revisa el resumen de totales, siempre visible en la misma pantalla.",
          "Usa \"Guardar Borrador\" para seguir después sin gastar numeración, o \"Enviar a DIAN\" para emitirla de verdad.",
          "Si la DIAN la rechaza, puedes corregirla y reenviarla sin perder tu trabajo ni tu cupo.",
          "Ya aceptada, puedes ver su representación gráfica con QR y firma digital, descargar el XML, o reenviarla por correo a tu cliente.",
        ],
      },
      {
        slug: "nota-credito",
        icon: RefundIcon,
        title: "Crear una nota crédito",
        description: "Cuándo usarla y cómo queda vinculada a la factura original.",
        intro: "Una nota crédito ajusta o corrige una factura que ya fue aceptada por la DIAN.",
        steps: [
          "Desde el detalle de una factura aceptada, usa el botón \"Crear Nota Crédito\".",
          "Elige si es total o parcial: puedes seleccionar solo algunas líneas y ajustar la cantidad a devolver.",
          "Selecciona el motivo, tomado del catálogo oficial de la DIAN.",
          "Guarda como borrador o envíala directo.",
          "Puedes crear varias notas parciales sobre la misma factura mientras quede saldo por acreditar.",
        ],
      },
      {
        slug: "nota-debito",
        icon: PlusCircleIcon,
        title: "Crear una nota débito",
        description: "Para cargos adicionales sobre una factura ya emitida.",
        intro: "A diferencia de la nota crédito, la nota débito agrega un cargo — no descuenta nada de lo ya facturado.",
        steps: [
          "Al igual que la nota crédito, se crea desde el detalle de una factura ya aceptada.",
          "Agrega las líneas del cargo adicional que quieres cobrar.",
          "Selecciona el motivo del catálogo oficial de la DIAN.",
          "Guarda como borrador o envíala a la DIAN.",
        ],
      },
      {
        slug: "anular-documento",
        icon: XCircleIcon,
        title: "Anular una factura",
        description: "Qué opciones tienes si emitiste una factura por error.",
        intro: "Anular una factura genera automáticamente una nota crédito por el 100% de su valor.",
        steps: [
          "En el detalle de una factura aceptada, usa el botón \"Anular Factura\".",
          "IngeFact arma la nota crédito completa con el motivo oficial de anulación — no necesitas llenar ningún formulario.",
          "Cuando esa nota queda aceptada, la factura pasa a estado \"Anulada\".",
          "Si solo necesitas corregir una parte de la factura, usa una nota crédito parcial en su lugar (ver guía \"Crear una nota crédito\").",
        ],
      },
    ],
  },
  {
    title: "Resolución DIAN",
    guides: [
      {
        slug: "configurar-resolucion",
        icon: ShieldCheckIcon,
        title: "Configurar tu resolución",
        description: "Cómo registrar el rango autorizado por la DIAN en IngeFact.",
        intro: "Sin una resolución configurada no podrás enviar facturas a la DIAN.",
        steps: [
          "Ve a Configuración → Resolución DIAN.",
          "Ingresa los datos exactos que te autorizó la DIAN: número de resolución, prefijo, rango mínimo y máximo, fechas de vigencia y clave técnica.",
          "Si tu empresa ya tenía una resolución cargada en Alegra, puedes usar \"Cargar desde Alegra\" para prellenar el formulario.",
          "Guarda los cambios.",
        ],
      },
      {
        slug: "entender-consecutivo",
        icon: ChartIcon,
        title: "Entender tu consecutivo",
        description: "Cómo se incrementa el número autorizado en cada factura.",
        intro: "El consecutivo es el número interno que IngeFact asigna a cada factura dentro de tu rango autorizado.",
        steps: [
          "Arranca en el número mínimo de tu rango y sube de a uno cada vez que envías una factura a la DIAN (nunca al guardar un borrador).",
          "Si vienes de otro proveedor y ya tienes documentos emitidos fuera de IngeFact, puedes ajustar el \"Consecutivo Actual\" manualmente para continuar donde ibas.",
          "Una vez que el consecutivo avanza, no se puede retroceder.",
          "Si llega al número máximo de tu rango, no podrás seguir facturando hasta configurar una resolución nueva.",
        ],
      },
      {
        slug: "renovar-resolucion",
        icon: ClockIcon,
        title: "Renovar una resolución vencida",
        description: "Qué hacer cuando tu rango autorizado está por agotarse.",
        intro: "Cuando tu resolución esté por vencer o tu rango se agote, la renovación se tramita ante la DIAN, no dentro de IngeFact.",
        steps: [
          "Tramita la renovación de tu resolución directamente ante la DIAN.",
          "Con la nueva resolución en mano, vuelve a Configuración → Resolución DIAN.",
          "Actualiza número, prefijo, rango y fechas con los datos nuevos.",
          "Guarda los cambios: tus facturas anteriores no se ven afectadas, y las nuevas usan la resolución actualizada.",
        ],
      },
    ],
  },
  {
    title: "Clientes",
    guides: [
      {
        slug: "registrar-cliente",
        icon: UsersIcon,
        title: "Registrar un cliente",
        description: "Datos mínimos para poder facturarle a un nuevo cliente.",
        intro: "Registra a tus clientes una vez y reutilízalos en cualquier factura o nota.",
        steps: [
          "Ve a Clientes → Nuevo Cliente.",
          "Completa tipo y número de identificación, nombre, régimen fiscal y responsabilidad tributaria.",
          "Puedes usar \"Consultar DIAN\" para autocompletar nombre y correo a partir del NIT (ver la siguiente guía).",
          "Guarda: el cliente queda disponible para elegirlo en cualquier factura o nota.",
        ],
      },
      {
        slug: "consultar-nit",
        icon: SearchIcon,
        title: "Consultar un NIT ante la DIAN",
        description: "Cómo autocompletar los datos de un adquiriente automáticamente.",
        intro: "Ahorra tiempo al registrar un cliente autocompletando sus datos desde su NIT.",
        steps: [
          "En el formulario de un cliente nuevo (o al editar uno existente), ingresa el número de identificación.",
          "Presiona \"Consultar DIAN\".",
          "Si el NIT está registrado como adquiriente, IngeFact autocompleta el nombre y el correo.",
          "Si no está registrado, el sistema te avisa y completas los datos a mano.",
          "Revisa y ajusta los datos autocompletados antes de guardar.",
        ],
      },
    ],
  },
];

export const ALL_GUIDES: Guide[] = GUIDE_GROUPS.flatMap((group) => group.guides);

export function findGuideBySlug(slug: string): { guide: Guide; groupTitle: string } | undefined {
  for (const group of GUIDE_GROUPS) {
    const guide = group.guides.find((g) => g.slug === slug);
    if (guide) return { guide, groupTitle: group.title };
  }
  return undefined;
}
