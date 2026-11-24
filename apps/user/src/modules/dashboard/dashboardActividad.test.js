import { describe, expect, it } from "vitest";
import { alertasDashboard, estadoDocumento, etiquetaTipo, resumenPorTipo, rutaDocumento } from "./dashboardActividad";

const sinNada = { rechazados: {}, en_validacion: {}, borradores: {}, recibidas_sin_evento: 0, resoluciones: [] };

const resolucion = (over = {}) => ({
  tipo: "factura",
  prefijo: "SETP",
  restantes: 50,
  dias_para_vencer: 200,
  agotada: false,
  vencida: false,
  ...over,
});

describe("documentos", () => {
  it("arma la ruta del detalle por tipo", () => {
    expect(rutaDocumento({ tipo: "factura", id: "1" })).toBe("/invoices/1");
    expect(rutaDocumento({ tipo: "nota_credito", id: "2" })).toBe("/credit-notes/2");
    expect(rutaDocumento({ tipo: "nota_debito", id: "3" })).toBe("/debit-notes/3");
    expect(rutaDocumento({ tipo: "documento_soporte", id: "4" })).toBe("/support-documents/4");
    expect(rutaDocumento({ tipo: "otro", id: "5" })).toBeNull();
  });

  it("etiquetas de tipo y estado, con respaldo para valores desconocidos", () => {
    expect(etiquetaTipo("nota_debito")).toBe("Nota débito");
    expect(estadoDocumento("enviada").etiqueta).toBe("En validación");
    expect(estadoDocumento("raro").etiqueta).toBe("raro");
  });
});

describe("alertasDashboard", () => {
  it("vacia sin datos o sin pendientes", () => {
    expect(alertasDashboard(null)).toEqual([]);
    expect(alertasDashboard(sinNada)).toEqual([]);
  });

  it("ordena por urgencia: resolucion agotada, rechazados, aviso de resolucion, recibidas, borradores, validacion", () => {
    const lista = alertasDashboard({
      rechazados: { factura: 2 },
      en_validacion: { factura: 1 },
      borradores: { nota_credito: 3 },
      recibidas_sin_evento: 4,
      resoluciones: [
        resolucion({ tipo: "documento_soporte", prefijo: "DS", restantes: 5 }),
        resolucion({ restantes: 0, agotada: true }),
      ],
    });
    expect(lista.map((a) => a.id)).toEqual([
      "resolucion-factura",
      "rechazados",
      "resolucion-documento_soporte",
      "recibidas",
      "borradores",
      "validacion",
    ]);
    expect(lista.map((a) => a.tono)).toEqual(["critico", "critico", "aviso", "aviso", "info", "info"]);
  });

  it("textos en singular y plural", () => {
    const uno = alertasDashboard({ ...sinNada, rechazados: { factura: 1 }, recibidas_sin_evento: 1 });
    expect(uno[0].texto).toBe("Rechazados por la DIAN: 1 factura.");
    expect(uno[1].texto).toBe("1 factura recibida sin acuse de recibo.");
    const varios = alertasDashboard({ ...sinNada, borradores: { documento_soporte: 3 } });
    expect(varios[0].texto).toBe("Borradores sin enviar a la DIAN: 3 documentos soporte.");
  });

  it("lleva al listado del tipo de documento", () => {
    const [ds] = alertasDashboard({ ...sinNada, rechazados: { documento_soporte: 1 } });
    expect(ds.ruta).toBe("/support-documents");
    const [notas] = alertasDashboard({ ...sinNada, en_validacion: { nota_debito: 2 } });
    expect(notas.ruta).toBe("/debit-notes");
  });
});

describe("resumenPorTipo", () => {
  it("null si no hay nada", () => {
    expect(resumenPorTipo({})).toBeNull();
    expect(resumenPorTipo(undefined)).toBeNull();
    expect(resumenPorTipo({ factura: 0 })).toBeNull();
  });

  it("junta varios tipos y va al que tiene mas", () => {
    expect(resumenPorTipo({ factura: 1, nota_credito: 2, documento_soporte: 1 })).toEqual({
      total: 4,
      detalle: "1 factura, 2 notas crédito y 1 documento soporte",
      ruta: "/credit-notes",
    });
  });

  it("ignora tipos desconocidos", () => {
    expect(resumenPorTipo({ otro: 5, factura: 1 })).toEqual({ total: 1, detalle: "1 factura", ruta: "/invoices" });
  });

  it("describe la resolucion por agotarse, por vencer, vencida y agotada", () => {
    const texto = (r) => alertasDashboard({ ...sinNada, resoluciones: [resolucion(r)] })[0].texto;
    expect(texto({ restantes: 8 })).toBe("Resolución de facturación (SETP): quedan 8 números.");
    expect(texto({ restantes: 1 })).toBe("Resolución de facturación (SETP): queda 1 número.");
    expect(texto({ dias_para_vencer: 12 })).toBe("Resolución de facturación (SETP): vence en 12 días y quedan 50 números.");
    expect(texto({ dias_para_vencer: 0 })).toBe("Resolución de facturación (SETP): vence hoy y quedan 50 números.");
    expect(texto({ vencida: true, dias_para_vencer: -3 })).toBe(
      "Resolución de facturación (SETP) vencida: no puedes emitir más con ella.",
    );
    expect(texto({ tipo: "documento_soporte", prefijo: "DS", agotada: true, restantes: 0 })).toBe(
      "Resolución de documento soporte (DS) agotada: no puedes emitir más con ella.",
    );
  });
});
