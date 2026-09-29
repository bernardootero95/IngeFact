const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export const formatoPesos = (n) => `$${numero.format(Math.round(n))}`;
export const formatoNumero = (n) => numero.format(Math.round(n));
