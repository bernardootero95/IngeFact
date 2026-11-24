/**
 * Presentacion de GET /tenant/dashboard/actividad (ver domain/tenant_actividad.py).
 * Los estados llegan siempre en femenino, tambien los del documento soporte.
 */

function plural(n, singular, pluralTexto) {
  return n === 1 ? `1 ${singular}` : `${n.toLocaleString("es-CO")} ${pluralTexto}`;
}

export const TIPO_DOCUMENTO = {
  factura: {
    etiqueta: "Factura",
    plural: ["factura", "facturas"],
    listado: "/invoices",
    ruta: (id) => `/invoices/${id}`,
  },
  nota_credito: {
    etiqueta: "Nota crédito",
    plural: ["nota crédito", "notas crédito"],
    listado: "/credit-notes",
    ruta: (id) => `/credit-notes/${id}`,
  },
  nota_debito: {
    etiqueta: "Nota débito",
    plural: ["nota débito", "notas débito"],
    listado: "/debit-notes",
    ruta: (id) => `/debit-notes/${id}`,
  },
  documento_soporte: {
    etiqueta: "Documento soporte",
    plural: ["documento soporte", "documentos soporte"],
    listado: "/support-documents",
    ruta: (id) => `/support-documents/${id}`,
  },
};

/**
 * {factura: 2, documento_soporte: 1} -> total, detalle "2 facturas y 1
 * documento soporte" y ruta: el listado del tipo si hay uno solo; si hay
 * varios, el del tipo con más documentos.
 */
export function resumenPorTipo(conteo = {}) {
  const tipos = Object.entries(conteo).filter(([tipo, n]) => n > 0 && TIPO_DOCUMENTO[tipo]);
  const total = tipos.reduce((suma, [, n]) => suma + n, 0);
  if (!total) return null;
  const partes = tipos.map(([tipo, n]) => plural(n, ...TIPO_DOCUMENTO[tipo].plural));
  const detalle = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
  const [tipoPrincipal] = [...tipos].sort((a, b) => b[1] - a[1])[0];
  return { total, detalle, ruta: TIPO_DOCUMENTO[tipoPrincipal].listado };
}

export const ESTADO_DOCUMENTO = {
  borrador: { etiqueta: "Borrador", clase: "bg-neutralCustom-100 text-neutralCustom-600" },
  enviada: { etiqueta: "En validación", clase: "bg-fiscal-info/10 text-fiscal-info" },
  aceptada: { etiqueta: "Aceptada", clase: "bg-brand-50 text-brand-700" },
  rechazada: { etiqueta: "Rechazada", clase: "bg-fiscal-danger/10 text-fiscal-danger" },
  anulada: { etiqueta: "Anulada", clase: "bg-fiscal-danger/10 text-fiscal-danger" },
};

export const etiquetaTipo = (tipo) => TIPO_DOCUMENTO[tipo]?.etiqueta ?? tipo;
export const rutaDocumento = (doc) => TIPO_DOCUMENTO[doc.tipo]?.ruta(doc.id) ?? null;
export const estadoDocumento = (estado) =>
  ESTADO_DOCUMENTO[estado] ?? { etiqueta: estado, clase: ESTADO_DOCUMENTO.borrador.clase };

const NOMBRE_RESOLUCION = {
  factura: "de facturación",
  documento_soporte: "de documento soporte",
};

function alertaResolucion(r) {
  const nombre = `Resolución ${NOMBRE_RESOLUCION[r.tipo] ?? r.tipo} (${r.prefijo})`;
  const base = { id: `resolucion-${r.tipo}`, ruta: "/settings/resolution", accion: "Actualizar" };
  if (r.agotada) return { ...base, tono: "critico", texto: `${nombre} agotada: no puedes emitir más con ella.` };
  if (r.vencida) return { ...base, tono: "critico", texto: `${nombre} vencida: no puedes emitir más con ella.` };
  const partes = [];
  if (r.dias_para_vencer <= 30) {
    partes.push(r.dias_para_vencer === 0 ? "vence hoy" : `vence en ${plural(r.dias_para_vencer, "día", "días")}`);
  }
  partes.push(`${r.restantes === 1 ? "queda" : "quedan"} ${plural(r.restantes, "número", "números")}`);
  return { ...base, tono: "aviso", texto: `${nombre}: ${partes.join(" y ")}.` };
}

/**
 * Lista de avisos en orden de urgencia: primero lo que impide facturar o
 * quedo rechazado, al final lo informativo. Vacia si no hay nada pendiente.
 * tono: "critico" | "aviso" | "info".
 */
export function alertasDashboard(alertas) {
  if (!alertas) return [];
  const lista = [];
  const resoluciones = (alertas.resoluciones ?? []).map(alertaResolucion);
  lista.push(...resoluciones.filter((a) => a.tono === "critico"));

  const rechazados = resumenPorTipo(alertas.rechazados);
  if (rechazados) {
    lista.push({
      id: "rechazados",
      tono: "critico",
      texto: `Rechazados por la DIAN: ${rechazados.detalle}.`,
      ruta: rechazados.ruta,
      accion: "Revisar",
    });
  }
  lista.push(...resoluciones.filter((a) => a.tono !== "critico"));

  if (alertas.recibidas_sin_evento > 0) {
    lista.push({
      id: "recibidas",
      tono: "aviso",
      texto: `${plural(alertas.recibidas_sin_evento, "factura recibida", "facturas recibidas")} sin acuse de recibo.`,
      ruta: "/received-invoices",
      accion: "Registrar eventos",
    });
  }
  const borradores = resumenPorTipo(alertas.borradores);
  if (borradores) {
    lista.push({
      id: "borradores",
      tono: "info",
      texto: `Borradores sin enviar a la DIAN: ${borradores.detalle}.`,
      ruta: borradores.ruta,
      accion: "Ver",
    });
  }
  const enValidacion = resumenPorTipo(alertas.en_validacion);
  if (enValidacion) {
    lista.push({
      id: "validacion",
      tono: "info",
      texto: `En validación con la DIAN: ${enValidacion.detalle}.`,
      ruta: enValidacion.ruta,
      accion: "Ver",
    });
  }
  return lista;
}
