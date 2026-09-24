import type { ComponentType } from "react";
import {
  ChartIcon,
  InboxCheckIcon,
  InvoiceIcon,
  PayrollIcon,
  ReceiptIcon,
  UsersIcon,
} from "@/components/ui/icons";

export interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export const HOME_FEATURES: Feature[] = [
  {
    icon: InvoiceIcon,
    title: "Facturación electrónica",
    description: "Emite facturas de venta, notas crédito y notas débito y envíalas a la DIAN desde el navegador.",
  },
  {
    icon: PayrollIcon,
    title: "Nómina electrónica",
    description: "Registra a tus empleados y transmite el comprobante de nómina de cada uno, con devengados y deducciones.",
  },
  {
    icon: ReceiptIcon,
    title: "Documento soporte",
    description: "Soporta tus compras a proveedores no obligados a facturar con su propia numeración autorizada.",
  },
  {
    icon: InboxCheckIcon,
    title: "Aceptación de facturas (RADIAN)",
    description: "Registra acuse de recibo, recibo del bien o servicio, aceptación o reclamo de las facturas que te emiten.",
  },
  {
    icon: UsersIcon,
    title: "Terceros y catálogo",
    description: "Guarda clientes, proveedores, empleados y productos una sola vez y reutilízalos en cada documento.",
  },
  {
    icon: ChartIcon,
    title: "Control de tu paquete",
    description: "Consulta cuántos documentos has usado y recibe un aviso por correo al llegar al 90 % de tu paquete.",
  },
];

export interface FeatureItem {
  title: string;
  description: string;
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
    intro: "Los documentos de venta que tu operación necesita.",
    items: [
      { title: "Factura de venta electrónica", description: "Crea la factura, envíala a la DIAN y consulta su respuesta en la misma pantalla." },
      { title: "Notas crédito y débito", description: "Corrige, ajusta o anula facturas ya aceptadas, de forma total o parcial." },
      { title: "Numeración controlada", description: "El consecutivo de tu resolución avanza solo al enviar, nunca al guardar un borrador." },
      { title: "PDF, XML y correo", description: "Descarga la representación gráfica y el XML, o envíalos por correo a tu cliente." },
    ],
  },
  {
    icon: PayrollIcon,
    title: "Nómina electrónica",
    intro: "Transmite a la DIAN el soporte de pago de tus empleados.",
    items: [
      { title: "Empleados", description: "Registra tipo de trabajador, contrato, salario y lugar de trabajo una sola vez." },
      { title: "Devengados y deducciones", description: "Básico, auxilio de transporte, horas extra, vacaciones, prima, cesantías, incapacidades, salud, pensión y más." },
      { title: "Envío y anulación", description: "Transmite el comprobante a la DIAN y, si hace falta, anúlalo con su propia numeración." },
      { title: "Comprobante para el empleado", description: "Genera el PDF y envíalo por correo al empleado." },
    ],
  },
  {
    icon: ReceiptIcon,
    title: "Documento soporte",
    intro: "Para compras a personas o empresas no obligadas a facturar.",
    items: [
      { title: "Proveedores", description: "Registra tus proveedores con los datos que exige la DIAN para este documento." },
      { title: "Resolución propia", description: "Configura la numeración autorizada para documento soporte, separada de la de facturación." },
      { title: "Envío a la DIAN", description: "Transmite el documento y consulta si fue aceptado o rechazado, con el motivo." },
      { title: "PDF y XML", description: "Descarga la representación gráfica y el XML, o envíalos al proveedor." },
    ],
  },
  {
    icon: InboxCheckIcon,
    title: "Aceptación de facturas (RADIAN)",
    intro: "Gestiona las facturas electrónicas que te emiten tus proveedores.",
    items: [
      { title: "Facturas recibidas", description: "Registra la factura que recibiste a partir de su CUFE." },
      { title: "Acuse de recibo", description: "Informa a la DIAN que recibiste la factura electrónica." },
      { title: "Recibo del bien o servicio", description: "Deja constancia de que recibiste lo facturado." },
      { title: "Aceptación o reclamo", description: "Acepta expresamente la factura o regístrale un reclamo con su motivo." },
    ],
  },
  {
    icon: UsersIcon,
    title: "Terceros y catálogo",
    intro: "Configura una vez, reutiliza en cada documento.",
    items: [
      { title: "Clientes", description: "Registra identificación, régimen y responsabilidad fiscal de cada cliente." },
      { title: "Consulta de adquiriente", description: "Autocompleta nombre y correo de un cliente a partir de su NIT, cuando la DIAN tiene el dato." },
      { title: "Catálogo de productos", description: "Guarda tus productos y servicios para agregarlos en un clic." },
      { title: "Impuestos configurables", description: "Define el IVA u otros tributos aplicables a cada producto." },
    ],
  },
  {
    icon: ChartIcon,
    title: "Panel y control",
    intro: "Entiende tu operación de un vistazo.",
    items: [
      { title: "Panel principal", description: "Documentos emitidos, clientes registrados y documentos disponibles de tu paquete." },
      { title: "Historial por módulo", description: "Consulta y ordena cualquier documento emitido por tu empresa." },
      { title: "Estado ante la DIAN", description: "Consulta si cada documento fue aceptado, rechazado o sigue en proceso." },
      { title: "Aviso de paquete", description: "Te avisamos por correo cuando usaste el 90 % de los documentos de tu paquete." },
    ],
  },
];
