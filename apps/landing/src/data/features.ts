import type { ComponentType } from "react";
import { ChartIcon, InvoiceIcon, ShieldCheckIcon, UsersIcon } from "@/components/ui/icons";

export interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export const HOME_FEATURES: Feature[] = [
  {
    icon: InvoiceIcon,
    title: "Facturación en minutos",
    description: "Emite facturas, notas crédito y débito con validez ante la DIAN en segundos, sin instalar nada.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Cumplimiento DIAN automático",
    description: "Numeración, resolución y firma digital gestionadas por nosotros. Tú factura, nosotros cuidamos la norma.",
  },
  {
    icon: UsersIcon,
    title: "Clientes y productos organizados",
    description: "Guarda tus terceros y tu catálogo una sola vez y reutilízalos en cada factura.",
  },
  {
    icon: ChartIcon,
    title: "Reportes claros",
    description: "Visualiza cuántos documentos has emitido y cuánto cupo te queda, sin hojas de cálculo.",
  },
];

export interface FeatureItem {
  title: string;
  description: string;
  soon?: boolean;
}

export interface FeatureCategory {
  icon: ComponentType<{ className?: string }>;
  title: string;
  intro: string;
  items: FeatureItem[];
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    icon: InvoiceIcon,
    title: "Facturación electrónica",
    intro: "Emite los documentos que tu operación necesita, siempre con validez legal.",
    items: [
      { title: "Factura de venta electrónica", description: "Crea y envía facturas con validez ante la DIAN en pocos pasos." },
      { title: "Notas crédito y débito", description: "Ajusta o anula documentos ya emitidos sin salir de la plataforma." },
      { title: "Numeración controlada", description: "El consecutivo de tu resolución se lleva de forma automática, sin duplicados." },
      { title: "Firma y CUFE automáticos", description: "Cada documento sale firmado digitalmente y con su código único de factura." },
    ],
  },
  {
    icon: ShieldCheckIcon,
    title: "Cumplimiento DIAN",
    intro: "La normativa cambia; tu operación no debería frenarse por eso.",
    items: [
      { title: "Resolución configurable", description: "Registra tu rango autorizado y IngeFact controla el consecutivo por ti." },
      { title: "XML y CUFE válidos", description: "Documentos generados según el estándar exigido por la DIAN." },
      { title: "Alertas de cupo", description: "Te avisamos por correo cuando tu cupo de documentos esté por agotarse." },
      { title: "Estado por documento", description: "Consulta si cada factura fue aceptada, rechazada o está en proceso." },
    ],
  },
  {
    icon: UsersIcon,
    title: "Clientes y productos",
    intro: "Configura una vez, reutiliza en cada factura.",
    items: [
      { title: "Clientes validados", description: "Registra terceros con NIT o cédula verificados antes de facturar." },
      { title: "Consulta automática", description: "Autocompleta los datos del adquiriente consultando su NIT ante la DIAN." },
      { title: "Catálogo de productos", description: "Guarda tus productos y servicios para agregarlos en un clic." },
      { title: "Impuestos configurables", description: "Define el IVA u otros tributos aplicables a cada producto." },
    ],
  },
  {
    icon: ChartIcon,
    title: "Reportes y panel",
    intro: "Entiende tu operación de un vistazo.",
    items: [
      { title: "Dashboard en tiempo real", description: "Documentos emitidos y disponibles de tu plan, siempre visibles." },
      { title: "Historial de facturación", description: "Consulta cualquier documento emitido por tu empresa." },
      { title: "Estado de tu cupo", description: "Sabe cuántos documentos te quedan disponibles este mes." },
      { title: "Reportes exportables", description: "Próximamente: exporta tu historial en Excel o PDF.", soon: true },
    ],
  },
];
