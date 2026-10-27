// Logica pura del evento en bloque. La pantalla solo presenta; el backend
// decide que facturas admiten el evento y si el cupo alcanza.
import { TIPO_RECLAMO, validateClaimCode, validateGeneradorField } from "./pages/ReceivedInvoiceDetailPage.validation";

// La aceptacion tacita (034) la registra el emisor: no se ofrece.
export const TIPOS_EVENTO_MASIVO = ["030", "032", "033", "031"];
// El backend acepta hasta 20 por tanda; tandas mas chicas dan un avance mas fluido.
export const TAMANO_TANDA = 5;

export const CAMPOS_GENERADOR = ["tipo_identificacion", "numero_identificacion", "nombres", "apellidos", "cargo"];

export const CRITERIOS_VACIOS = { fecha_desde: "", fecha_hasta: "", proveedor_nit: "", tipo: "" };

export const RESULTADO_LABELS = { aceptado: "Aplicado", fallido: "Falló" };
export const RESULTADO_BADGE = {
  aceptado: "bg-brand-50 text-brand-600",
  fallido: "bg-fiscal-danger/10 text-fiscal-danger",
};

export function validateFechaDesde(valor) {
  return valor ? "" : "Elige la fecha inicial.";
}

export function validateFechaHasta(valor, desde) {
  if (!valor) return "Elige la fecha final.";
  // Fechas ISO (aaaa-mm-dd): se comparan bien como texto.
  if (desde && valor < desde) return "La fecha final no puede ser anterior a la inicial.";
  return "";
}

export function normalizarNit(valor) {
  return (valor || "").trim().split("-")[0].replace(/[.\s]/g, "");
}

export function validateProveedorNit(valor) {
  const nit = normalizarNit(valor);
  if (!nit) return "";
  if (!/^\d{5,15}$/.test(nit)) return "Escribe solo el número del NIT (entre 5 y 15 dígitos).";
  return "";
}

export function validateTipoMasivo(tipo) {
  return TIPOS_EVENTO_MASIVO.includes(tipo) ? "" : "Selecciona el evento a aplicar.";
}

// El cargo es opcional en el flujo individual, pero aqui se pide siempre
// porque el mismo firmante queda en todos los eventos del lote.
export function validateGeneradorMasivo(name, value) {
  if (name === "cargo") return value?.trim() ? "" : "Este campo es obligatorio.";
  return validateGeneradorField(name, value);
}

export function validarCriterios(criterios) {
  return {
    fecha_desde: validateFechaDesde(criterios.fecha_desde),
    fecha_hasta: validateFechaHasta(criterios.fecha_hasta, criterios.fecha_desde),
    proveedor_nit: validateProveedorNit(criterios.proveedor_nit),
    tipo: validateTipoMasivo(criterios.tipo),
  };
}

export function validarEmision(criterios, generador, claimCode) {
  const errores = {};
  CAMPOS_GENERADOR.forEach((campo) => {
    errores[`generador_${campo}`] = validateGeneradorMasivo(campo, generador[campo]);
  });
  if (criterios.tipo === TIPO_RECLAMO) errores.claim_code = validateClaimCode(claimCode);
  return errores;
}

export const hayErrores = (errores) => Object.values(errores).some(Boolean);

export function criteriosPayload(criterios) {
  return {
    fecha_desde: criterios.fecha_desde,
    fecha_hasta: criterios.fecha_hasta,
    proveedor_nit: normalizarNit(criterios.proveedor_nit) || null,
    tipo: criterios.tipo,
  };
}

export function tandaPayload(criterios, facturaIds, generador, claimCode, notas) {
  const payload = {
    ...criteriosPayload(criterios),
    factura_ids: facturaIds,
    generador: {
      tipo_identificacion: generador.tipo_identificacion,
      numero_identificacion: generador.numero_identificacion.trim(),
      dv: generador.dv?.trim() || null,
      nombres: generador.nombres.trim(),
      apellidos: generador.apellidos.trim(),
      cargo: generador.cargo.trim(),
    },
  };
  if (criterios.tipo === TIPO_RECLAMO) {
    payload.claim_code = claimCode;
    payload.notas = notas.trim() || null;
  }
  return payload;
}

export function partirEnTandas(items, tamano = TAMANO_TANDA) {
  const tandas = [];
  for (let i = 0; i < items.length; i += tamano) tandas.push(items.slice(i, i + tamano));
  return tandas;
}

// Una tanda que falla entera (red caida, cupo agotado entre tanto) marca sus
// facturas como fallidas con el motivo, sin perder el resto.
export function resultadosDeTandaFallida(facturas, mensaje) {
  return facturas.map((f) => ({
    factura_id: f.id,
    numero: f.numero,
    proveedor_nombre: f.proveedor_nombre,
    resultado: "fallido",
    mensaje,
  }));
}

export function contarResultadosEvento(resultados) {
  const conteo = { aceptado: 0, fallido: 0 };
  for (const r of resultados) conteo[r.resultado] = (conteo[r.resultado] || 0) + 1;
  return conteo;
}
