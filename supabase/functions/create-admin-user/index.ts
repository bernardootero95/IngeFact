import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, requireInternalAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  // Manejo del preflight request de CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Inicializar cliente con la clave de servicio (Service Role Key) para evadir RLS de forma segura en servidor
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    await requireInternalAdmin(req, supabaseAdmin);

    const { nombre, email, estado } = await req.json();

    // 1. Crear el usuario en Supabase Auth (Dispara automáticamente el correo de verificación)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: false, // Obliga a que verifique su correo antes de poder loguearse
        user_metadata: { nombre: nombre },
      });

    if (authError) throw authError;

    // 2. Insertar el registro vinculando el ID real de Auth en tu tabla pública
    const { error: dbError } = await supabaseAdmin.from("usuarios").insert([
      {
        id: authData.user.id,
        nombre: nombre,
        email: email,
        estado: estado,
      },
    ]);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
