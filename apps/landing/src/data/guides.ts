import type { ComponentType } from "react";
import {
  ChartIcon,
  ClockIcon,
  DocumentIcon,
  InvoiceIcon,
  PencilIcon,
  RefundIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersIcon,
  XCircleIcon,
} from "@/components/ui/icons";

export interface Guide {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export interface GuideGroup {
  title: string;
  guides: Guide[];
}

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    title: "Primeros pasos",
    guides: [
      { icon: DocumentIcon, title: "Crear tu empresa en IngeFact", description: "Qué información necesitas y cómo queda vinculada tu empresa a la plataforma." },
      { icon: PencilIcon, title: "Configurar tus datos fiscales", description: "NIT, régimen y demás datos que la DIAN exige antes de tu primera factura." },
      { icon: UsersIcon, title: "Invitar a tu equipo", description: "Cómo dar acceso a otras personas de tu empresa para facturar contigo." },
    ],
  },
  {
    title: "Facturación",
    guides: [
      { icon: InvoiceIcon, title: "Emitir tu primera factura", description: "De la selección del cliente al envío ante la DIAN, paso a paso." },
      { icon: RefundIcon, title: "Crear una nota crédito", description: "Cuándo usarla y cómo queda vinculada a la factura original." },
      { icon: XCircleIcon, title: "Anular un documento", description: "Qué opciones tienes si emitiste una factura por error." },
    ],
  },
  {
    title: "Resolución DIAN",
    guides: [
      { icon: ShieldCheckIcon, title: "Configurar tu resolución", description: "Cómo registrar el rango autorizado por la DIAN en IngeFact." },
      { icon: ChartIcon, title: "Entender tu consecutivo", description: "Cómo se incrementa el número autorizado en cada factura." },
      { icon: ClockIcon, title: "Renovar una resolución vencida", description: "Qué hacer cuando tu rango autorizado está por agotarse." },
    ],
  },
  {
    title: "Clientes",
    guides: [
      { icon: UsersIcon, title: "Registrar un cliente", description: "Datos mínimos para poder facturarle a un nuevo cliente." },
      { icon: SearchIcon, title: "Consultar un NIT ante la DIAN", description: "Cómo autocompletar los datos de un adquiriente automáticamente." },
    ],
  },
];
