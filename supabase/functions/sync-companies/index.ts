import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, requireInternalAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const token = (Deno.env.get("ALLEGRA_TOKEN") || "").trim();
    if (!token) throw new Error("El token de Allegra no está configurado.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    await requireInternalAdmin(req, supabaseAdmin);

    let allCompanies: any[] = [];
    let fetchMore = true;
    let fromId = "";

    // Bucle de paginación para traer todas las empresas de Alegra
    while (fetchMore) {
      const url = new URL("https://api.alegra.com/e-provider/col/v1/companies");
      url.searchParams.append("limit", "80");
      if (fromId) url.searchParams.append("from", fromId);

      const alegraRes = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!alegraRes.ok) {
        let errDetail = "";
        try {
          const errData = await alegraRes.json();
          errDetail = JSON.stringify(errData);
        } catch {
          errDetail = alegraRes.statusText;
        }
        throw new Error(`Error Alegra (${alegraRes.status}): ${errDetail}`);
      }

      const data = await alegraRes.json();
      const companies = data.companies || [];
      allCompanies = [...allCompanies, ...companies];

      // Verificamos si hay una siguiente página según el metadata de Alegra
      if (data.metadata?.to && data.metadata.results_count === 80) {
        fromId = data.metadata.to;
      } else {
        fetchMore = false;
      }
    }

    if (allCompanies.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          mensaje: "No hay empresas en Alegra.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Transformar los datos al formato de nuestra DB local
    const recordsToUpsert = allCompanies.map((c: any) => ({
      id_alegra: c.id,
      razon_social: c.name,
      nombre_comercial: c.tradeName || null,
      numero_identificacion: c.identification,
      digito_verificacion: c.dv,
      tipo_identificacion: c.identificationType || "31",
      correo_electronico: c.email || "sin_correo@empresa.com",
      telefono: c.phone || null,
      direccion: c.address?.address || null,
      departamento: c.address?.department || null,
      municipio: c.address?.city || null,
      tipo_organizacion: c.organizationType ? String(c.organizationType) : null,
      regimen: c.regimeCode === "O-48" ? "48" : "49", // Mapeo básico de régimen
      estado: "activo",
      actualizado: new Date().toISOString(),
    }));

    // Ejecutar Upsert masivo basado en numero_identificacion (NIT)
    const { error: dbError } = await supabaseAdmin
      .from("empresas")
      .upsert(recordsToUpsert, { onConflict: "numero_identificacion" });

    if (dbError) throw new Error(`Error en DB local: ${dbError.message}`);

    return new Response(
      JSON.stringify({ success: true, processed: recordsToUpsert.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
