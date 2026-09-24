export type NavKey = "inicio" | "caracteristicas" | "precios" | "instructivos" | "contacto";

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "inicio", label: "Inicio", href: "/" },
  { key: "caracteristicas", label: "Características", href: "/caracteristicas" },
  { key: "precios", label: "Precios", href: "/precios" },
  { key: "instructivos", label: "Instructivos", href: "/instructivos" },
  { key: "contacto", label: "Contacto", href: "/contacto" },
];

export interface LegalNavItem {
  label: string;
  href: string;
}

export const LEGAL_NAV_ITEMS: LegalNavItem[] = [
  { label: "Términos y condiciones", href: "/terminos" },
  { label: "Tratamiento de datos personales", href: "/privacidad" },
  { label: "Política de cookies", href: "/cookies" },
  { label: "Reembolsos y retracto", href: "/reembolsos" },
];
