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
export const PRICING_PACKAGES: PricingPackage[] = [
  paquete(10, 20_000),
  paquete(25, 46_000),
  paquete(50, 92_000),
  paquete(150, 142_000, true),
  paquete(500, 317_000),
  paquete(1_500, 650_000),
  paquete(5_000, 1_350_000),
];

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
