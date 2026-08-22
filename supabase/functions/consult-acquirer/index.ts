import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, requireTenantUser } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Cualquier usuario activo de un tenant puede consultar el NIT de un adquiriente
    await requireTenantUser(req, supabaseAdmin);

    const { identificationType, identificationNumber } = await req.json();

    if (!identificationType || !identificationNumber) {
      throw new Error("Faltan identificationType o identificationNumber.");
    }

    const token = (Deno.env.get("ALLEGRA_TOKEN") || "").trim();
    if (!token) throw new Error("El token de Allegra no está configurado.");

    const alegraRes = await fetch(
      `https://api.alegra.com/e-provider/col/v1/acquirer-info?identificationType=${encodeURIComponent(
        identificationType,
      )}&identificationNumber=${encodeURIComponent(identificationNumber)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (!alegraRes.ok) {
      if (alegraRes.status === 404)
        throw new Error("Adquiriente no encontrado en la DIAN.");
      if (alegraRes.status === 400)
        throw new Error("Datos de consulta inválidos.");
      throw new Error("Error de conexión con el proveedor.");
    }

    const data = await alegraRes.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
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
