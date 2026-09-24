export interface PricingPackage {
  documentos: string;
  precio: string;
  precioPorDocumento: string;
  destacado?: boolean;
}

const cop = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

function paquete(documentos: number, precio: number, destacado = false): PricingPackage {
  return {
    documentos: cop.format(documentos),
    precio: `$${cop.format(precio)}`,
    precioPorDocumento: `$${cop.format(Math.round(precio / documentos))}`,
    destacado,
  };
}

// Precios finales en COP. El negocio es no responsable de IVA (ver BUSINESS.regimenIva).
export const PRICING_PACKAGE_VALUES = [
  { documentos: 10, precio: 20_000 },
  { documentos: 25, precio: 46_000 },
  { documentos: 50, precio: 92_000 },
  { documentos: 150, precio: 142_000, destacado: true },
  { documentos: 500, precio: 317_000 },
  { documentos: 1_500, precio: 650_000 },
  { documentos: 5_000, precio: 1_350_000 },
] as const;

export const PRICING_PACKAGES: PricingPackage[] = PRICING_PACKAGE_VALUES.map((p) =>
  paquete(p.documentos, p.precio, "destacado" in p && p.destacado)
);

export const PRICING_HIGHLIGHTS: PricingPackage[] = [
  PRICING_PACKAGES[0],
  PRICING_PACKAGES[2],
  PRICING_PACKAGES[4],
  PRICING_PACKAGES[6],
];

/** Documentos que descuentan 1 del paquete (ver contar_documentos_usados en apps/api). */
export const DOCUMENTOS_QUE_CONSUMEN = [
  "Factura electrónica de venta",
  "Nota crédito",
  "Nota débito",
  "Documento soporte",
  "Comprobante de nómina electrónica y cada anulación de un comprobante",
  "Evento sobre factura recibida (acuse de recibo, recibo del bien o servicio, aceptación o reclamo)",
];
