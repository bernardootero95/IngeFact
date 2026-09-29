/**
 * Lógica de la calculadora de precios de paquetes (solo para el admin).
 *
 * Con los parámetros por defecto reproduce los precios publicados en la
 * landing (apps/landing/src/data/pricing.ts); pricingCalculator.test.js lo
 * verifica. Si cambias la fórmula aquí, actualiza también esos precios.
 */

export const DEFAULT_PARAMS = {
  // Reemplaza al antiguo plan gratis: ningún paquete cuesta menos que esto.
  precioMinimo: 20000,
  // Tramo micro: precio lineal hasta `microTope` documentos, calibrado para
  // valer `microAncla` en el tope.
  microTope: 50,
  microAncla: 92000,
  // Fórmula estándar: (base + tarifas por documento) / margen.
  base: 20000,
  margenPct: 30,
  // Tarifa marginal por documento a partir de cada umbral (acumulativa).
  tramos: [
    { desde: 0, tarifa: 150 },
    { desde: 500, tarifa: 100 },
    { desde: 1500, tarifa: 60 },
    { desde: 5000, tarifa: 40 },
  ],
  comisionPct: 10,
};

/**
 * Tarifas del proveedor tecnológico por documento, según el volumen del
 * mes. Por decisión del negocio (2026-09-28), el costo de un paquete se
 * estima con su promedio mensual (documentos / 12) cobrado desde el primer
 * documento, sin descontar los 1.000 incluidos en la mensualidad: es una
 * estimación conservadora que no depende del volumen de otros clientes.
 * Los tramos suman los documentos de todos los clientes en el mes
 * calendario. La mensualidad es un costo fijo del negocio: no se carga a
 * cada paquete, se usa para ver cuántos paquetes hacen falta para cubrirla.
 */
export const DEFAULT_COSTOS = {
  mensualidad: 120000,
  tramos: [
    { desde: 0, tarifa: 14 },
    { desde: 200000, tarifa: 10 },
    { desde: 500000, tarifa: 6 },
    { desde: 1000000, tarifa: 4 },
  ],
};

/** Planes anuales "G" de Factoa, consultados en septiembre de 2026. */
const FACTOA = [
  [25, 55000], [35, 86000], [50, 98000], [100, 153000], [150, 210000], [200, 252000],
  [300, 313000], [400, 347000], [500, 407000], [600, 428000], [750, 487000],
  [1000, 587000], [1300, 725000], [2000, 954000], [3000, 1243000], [4000, 1592000],
  [5000, 1912000], [6000, 2235000], [7000, 2476000], [10000, 2914000],
];

export const redondearMil = (n) => Math.round(n / 1000) * 1000;

/** Suma acumulada por tramos: cada documento paga la tarifa de su tramo. */
export function sumaPorTramos(cantidad, tramos) {
  const ordenados = [...tramos].sort((a, b) => a.desde - b.desde);
  let total = 0;
  const detalle = [];
  ordenados.forEach((tramo, i) => {
    const hasta = i + 1 < ordenados.length ? ordenados[i + 1].desde : Infinity;
    const enTramo = Math.min(cantidad, hasta) - tramo.desde;
    if (enTramo > 0) {
      total += enTramo * tramo.tarifa;
      detalle.push({ desde: tramo.desde, cantidad: enTramo, tarifa: tramo.tarifa });
    }
  });
  return { total, detalle };
}

export function calcularPrecio(documentos, params = DEFAULT_PARAMS) {
  if (documentos <= 0) return { tramo: "Sin documentos", precio: 0, lineas: [] };

  if (documentos <= params.microTope) {
    const tarifa = params.microAncla / params.microTope;
    const lineal = tarifa * documentos;
    const aplicaMinimo = lineal < params.precioMinimo;
    const precio = redondearMil(Math.max(lineal, params.precioMinimo));
    return {
      tramo: `Micro (hasta ${params.microTope} documentos)`,
      precio,
      lineas: [
        {
          concepto: "Tarifa por documento",
          detalle: `$${Math.round(tarifa)} × ${documentos}, calibrada para dar $${params.microAncla} en ${params.microTope}`,
          valor: lineal,
        },
        ...(aplicaMinimo
          ? [{ concepto: "Precio mínimo", detalle: "Ningún paquete cuesta menos", valor: params.precioMinimo }]
          : []),
        { concepto: "Precio del paquete", valor: precio, total: true },
      ],
    };
  }

  const { total: porDocumento, detalle } = sumaPorTramos(documentos, params.tramos);
  const precioBase = params.base + porDocumento;
  const precio = redondearMil(precioBase / (params.margenPct / 100));
  return {
    tramo: `Tramo ${detalle.length} de ${params.tramos.length}`,
    precio,
    lineas: [
      { concepto: "Base fija", valor: params.base },
      {
        concepto: "Tarifa por documento",
        detalle: detalle.map((d) => `${d.cantidad} × $${d.tarifa}`).join(" + "),
        valor: porDocumento,
      },
      { concepto: "Precio base", detalle: "Base fija + tarifa por documento", valor: precioBase },
      { concepto: "Precio del paquete", detalle: `Precio base ÷ ${params.margenPct} %`, valor: precio, total: true },
    ],
  };
}

/** Costo estimado del paquete ante el proveedor (ver DEFAULT_COSTOS). */
export function calcularCosto(documentos, costos = DEFAULT_COSTOS) {
  const promedioMes = documentos / 12;
  const costoMes = sumaPorTramos(promedioMes, costos.tramos).total;
  return { promedioMes, costoMes, costoAnual: costoMes * 12 };
}

export function calcularResultado(documentos, params = DEFAULT_PARAMS, costos = DEFAULT_COSTOS) {
  const precio = calcularPrecio(documentos, params);
  const costo = calcularCosto(documentos, costos);
  const comision = precio.precio * (params.comisionPct / 100);
  const neto = precio.precio - comision - costo.costoAnual;
  const mensualidadAnual = costos.mensualidad * 12;
  return {
    ...precio,
    comision,
    costo,
    neto,
    // Paquetes como este que hay que vender al año para pagar la mensualidad.
    paquetesParaCubrirMensualidad: neto > 0 ? Math.ceil(mensualidadAnual / neto) : null,
    margenNetoPct: precio.precio > 0 ? (neto / precio.precio) * 100 : 0,
    precioPorDocumento: documentos > 0 ? precio.precio / documentos : 0,
  };
}

/** Precio de Factoa interpolado; null por debajo de su plan mínimo. */
export function precioFactoa(documentos) {
  if (documentos < FACTOA[0][0]) return null;
  for (let i = 0; i < FACTOA.length - 1; i++) {
    const [d0, p0] = FACTOA[i];
    const [d1, p1] = FACTOA[i + 1];
    if (documentos <= d1) return { precio: p0 + ((documentos - d0) / (d1 - d0)) * (p1 - p0), extrapolado: false };
  }
  const [d0, p0] = FACTOA[FACTOA.length - 2];
  const [d1, p1] = FACTOA[FACTOA.length - 1];
  return { precio: p1 + ((p1 - p0) / (d1 - d0)) * (documentos - d1), extrapolado: true };
}
