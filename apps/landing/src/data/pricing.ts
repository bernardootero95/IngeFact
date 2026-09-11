export interface PricingPackage {
  documentos: string;
  precio: string;
  destacado?: boolean;
}

export const PRICING_PACKAGES: PricingPackage[] = [
  { documentos: "10", precio: "$20.000" },
  { documentos: "25", precio: "$46.000" },
  { documentos: "50", precio: "$92.000" },
  { documentos: "150", precio: "$142.000", destacado: true },
  { documentos: "500", precio: "$317.000" },
  { documentos: "1.500", precio: "$650.000" },
  { documentos: "5.000", precio: "$1.350.000" },
];

export const PRICING_HIGHLIGHTS: PricingPackage[] = [
  PRICING_PACKAGES[0],
  PRICING_PACKAGES[2],
  PRICING_PACKAGES[4],
  PRICING_PACKAGES[6],
];
