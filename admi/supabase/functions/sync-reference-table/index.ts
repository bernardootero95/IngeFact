import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apiKey, content-type",
};

// Configuración de endpoints y llaves de respuesta basados en el Anexo Técnico de Allegra
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

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { tableName } = await req.json();
    const config = ALLEGRA_CONFIG[tableName];

    if (!config) {
      throw new Error(
        `La tabla "${tableName}" no está registrada en el mapeo de sincronización.`,
      );
    }

    // Autenticación con Allegra (Basic Auth usando Email y API Token)
    const email = Deno.env.get("ALLEGRA_EMAIL") || "";
    const token = Deno.env.get("ALLEGRA_TOKEN") || "";
    const credentials = btoa(`${email}:${token}`);

    // Consumir el endpoint de Allegra
    const allegraResponse = await fetch(config.url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (!allegraResponse.ok) {
      throw new Error(
        `Error de comunicación con Allegra: ${allegraResponse.status} ${allegraResponse.statusText}`,
      );
    }

    const externalData = await allegraResponse.json();
    const rawList = externalData[config.key];

    if (!Array.isArray(rawList)) {
      throw new Error(
        `La respuesta de Allegra para ${tableName} no contiene un arreglo válido bajo la clave "${config.key}".`,
      );
    }

    // Inicializar cliente administrativo de Supabase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Moldear los datos de forma segura según la tabla correspondiente
    const recordsToUpsert = rawList.map((item: any) => {
      // Regla de oro: Forzamos item.code a String.
      // Tablas como organization-types mandan enteros (1, 2) y romperían el VARCHAR de tu base de datos.
      const baseRecord: any = {
        code: String(item.code),
        value: item.value,
        estado: "activo",
        actualizado: new Date().toISOString(),
      };

      // Mapeo especial para la jerarquía de Municipios
      if (tableName === "municipios") {
        baseRecord.department_code = String(item.departmentCode);
        baseRecord.department_value = item.departmentValue;
      }

      // Mapeo especial para los conceptos estructurados de Notas Crédito (Anexo NADE)
      if (tableName === "conceptos_nota_credito") {
        baseRecord.value_nade = item.valueNADE;
      }

      return baseRecord;
    });

    // Ejecutar UPSERT masivo bloqueando duplicados gracias al "code" UNIQUE
    const { error: dbError } = await supabaseAdmin
      .from(tableName)
      .upsert(recordsToUpsert, { onConflict: "code" });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ success: true, processed: recordsToUpsert.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
