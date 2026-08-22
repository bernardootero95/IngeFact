import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, requireInternalAdmin } from "../_shared/auth.ts";

// 1. Configuración de endpoints
const ALLEGRA_CONFIG: Record<string, { url: string; key: string }> = {
  tipos_identificacion: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/identification-types",
    key: "identification-types",
  },
  monedas: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/currencies",
    key: "currencies",
  },
  formas_pago: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/payment-forms",
    key: "payment-forms",
  },
  metodos_pago: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/payment-methods",
    key: "payment-methods",
  },
  paises: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/countries",
    key: "countries",
  },
  departamentos: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/departments",
    key: "departments",
  },
  municipios: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/municipalities",
    key: "municipalities",
  },
  tipos_organizacion: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/organization-types",
    key: "organization-types",
  },
  responsabilidades_fiscales: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/fiscal-Responsability-types",
    key: "fiscal-Responsability-types",
  },
  tributos: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/tax-types",
    key: "tax-types",
  },
  tipos_unidad: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/unit-codes",
    key: "unit-codes",
  },
  conceptos_nota_credito: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/correction-concept-codes-nc",
    key: "correction-concept-codes-nc",
  },
  conceptos_nota_debito: {
    url: "https://api.alegra.com/e-provider/col/v1/dian/correction-concept-codes-nd",
    key: "correction-concept-codes-nd",
  },
};

// 2. Funciones Auxiliares
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

const transformRecord = (item: any, tableName: string) => {
  const baseRecord: any = {
    code: String(item.code),
    value: item.value,
    estado: "activo",
    actualizado: new Date().toISOString(),
  };

  if (tableName === "municipios") {
    baseRecord.department_code = String(item.departmentCode);
    baseRecord.department_value = item.departmentValue;
  }

  if (
    tableName === "conceptos_nota_credito" ||
    tableName === "conceptos_nota_debito"
  ) {
    if (item.valueNADE) baseRecord.value_nade = item.valueNADE;
  }

  return baseRecord;
};

// 3. Controlador Principal
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    await requireInternalAdmin(req, supabaseAdmin);

    const { tableName } = await req.json();
    const config = ALLEGRA_CONFIG[tableName];

    if (!config) {
      throw new Error(
        `La tabla "${tableName}" no está registrada en el mapeo de sincronización.`,
      );
    }

    // SANITIZACIÓN ESTRICTA: .trim() elimina espacios invisibles
    const token = (Deno.env.get("ALLEGRA_TOKEN") || "").trim();

    if (!token) {
      throw new Error(
        "El token de Allegra no está configurado en las variables de entorno.",
      );
    }

    // Autorización Bearer según la documentación de e-provider
    const allegraResponse = await fetch(config.url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!allegraResponse.ok) {
      let errorDetail = "";
      try {
        const errorData = await allegraResponse.json();
        errorDetail = JSON.stringify(errorData);
      } catch (e) {
        errorDetail = allegraResponse.statusText;
      }
      throw new Error(
        `Error de comunicación con Allegra: ${allegraResponse.status}. Detalles: ${errorDetail}`,
      );
    }

    const externalData = await allegraResponse.json();
    const rawList = externalData[config.key];

    if (!Array.isArray(rawList)) {
      throw new Error(
        `La respuesta de Allegra para ${tableName} no contiene un arreglo válido bajo la clave "${config.key}".`,
      );
    }

    const recordsToUpsert = rawList.map((item) =>
      transformRecord(item, tableName),
    );

    const BATCH_SIZE = 250;
    const batches = chunkArray(recordsToUpsert, BATCH_SIZE);

    let totalProcessed = 0;

    for (const batch of batches) {
      const { error: dbError } = await supabaseAdmin
        .from(tableName)
        .upsert(batch, { onConflict: "code" });

      if (dbError) throw dbError;
      totalProcessed += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
