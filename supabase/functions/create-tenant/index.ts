import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apiKey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { empresa, suscripcion, usuario } = payload;

    if (
      !empresa?.numeroIdentificacion ||
      !empresa?.razonSocial ||
      !usuario?.correoElectronico
    ) {
      throw new Error("Datos incompletos para aprovisionar el Tenant.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    let dbEmpresaId = empresa.id;
    let idAlegra = empresa.idAlegra;

    // --- FASE 1: CREAR O ACTUALIZAR EMPRESA ---
    if (!dbEmpresaId) {
      const token = (Deno.env.get("ALLEGRA_TOKEN") || "").trim();
      if (!token) throw new Error("El token de Allegra no está configurado.");

      const alegraPayload = {
        name: empresa.razonSocial,
        tradeName: empresa.nombreComercial || empresa.razonSocial,
        identification: empresa.numeroIdentificacion,
        dv: String(empresa.digitoVerificacion),
        useAlegraCertificate: true,
        identificationType: "31",
        email: usuario.correoElectronico,
        phone: empresa.telefono || "",
        organizationType: empresa.tipoOrganizacion
          ? Number(empresa.tipoOrganizacion)
          : 1,
        regimeCode: empresa.regimen || "R-99-PN",
        address: {
          address: empresa.direccion || "No registrada",
          department: empresa.departamento || "11",
          city: empresa.municipio || "11001",
          country: "CO",
        },
      };

      const alegraRes = await fetch(
        "https://api.alegra.com/e-provider/col/v1/companies",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(alegraPayload),
        },
      );

      if (!alegraRes.ok) {
        let errDetail = "";
        try {
          errDetail = JSON.stringify(await alegraRes.json());
        } catch {
          errDetail = alegraRes.statusText;
        }
        throw new Error(
          `Rechazo de Allegra (${alegraRes.status}): ${errDetail}`,
        );
      }

      const alegraData = await alegraRes.json();
      idAlegra = alegraData.company.id;

      const { data: dbEmpresa, error: errEmpresa } = await supabaseAdmin
        .from("empresas")
        .insert({
          razon_social: empresa.razonSocial,
          nombre_comercial: empresa.nombreComercial,
          numero_identificacion: empresa.numeroIdentificacion,
          digito_verificacion: empresa.digitoVerificacion,
          direccion: empresa.direccion,
          departamento: empresa.departamento,
          municipio: empresa.municipio,
          regimen: empresa.regimen,
          telefono: empresa.telefono,
          correo_electronico: usuario.correoElectronico,
          notificacion_correo: empresa.notificacionCorreo,
          tipo_organizacion: empresa.tipoOrganizacion,
          id_alegra: idAlegra,
          estado: empresa.estadoEmpresa || "activo",
        })
        .select()
        .single();

      if (errEmpresa)
        throw new Error(`Fallo al guardar la Empresa: ${errEmpresa.message}`);
      dbEmpresaId = dbEmpresa.id;
    } else {
      const { error: errUpd } = await supabaseAdmin
        .from("empresas")
        .update({
          razon_social: empresa.razonSocial,
          nombre_comercial: empresa.nombreComercial,
          direccion: empresa.direccion,
          departamento: empresa.departamento,
          municipio: empresa.municipio,
          regimen: empresa.regimen,
          telefono: empresa.telefono,
          notificacion_correo: empresa.notificacionCorreo,
          estado: empresa.estadoEmpresa || "activo",
          tipo_organizacion: empresa.tipoOrganizacion,
          actualizado: new Date().toISOString(),
        })
        .eq("id", dbEmpresaId);

      if (errUpd)
        throw new Error(`Fallo al actualizar la Empresa: ${errUpd.message}`);
    }

    // --- FASE 2: GESTIÓN DE LA SUSCRIPCIÓN ---
    const { data: subActual } = await supabaseAdmin
      .from("suscripciones")
      .select("id")
      .eq("empresa_id", dbEmpresaId)
      .eq("estado", "activa")
      .maybeSingle();

    if (subActual) {
      await supabaseAdmin
        .from("suscripciones")
        .update({
          max_documentos: Number(suscripcion.maxDocumentos),
          fecha_inicio: suscripcion.fechaInicio,
          fecha_fin: suscripcion.fechaFin,
          actualizado: new Date().toISOString(),
        })
        .eq("id", subActual.id);
    } else {
      const { error: errSub } = await supabaseAdmin
        .from("suscripciones")
        .insert({
          empresa_id: dbEmpresaId,
          max_documentos: Number(suscripcion.maxDocumentos),
          fecha_inicio: suscripcion.fechaInicio,
          fecha_fin: suscripcion.fechaFin,
          estado: "activa",
        });
      if (errSub)
        throw new Error(`Fallo al crear la Suscripción: ${errSub.message}`);
    }

    // --- FASE 3: GESTIÓN DEL USUARIO ADMINISTRADOR ---
    let tempPasswordGenerada = null;
    const { data: userLocal } = await supabaseAdmin
      .from("usuarios_empresas")
      .select("id")
      .eq("empresa_id", dbEmpresaId)
      .maybeSingle();

    if (!userLocal) {
      tempPasswordGenerada = `Ing-${Math.random().toString(36).slice(-6)}*`;

      const { data: authUser, error: errAuth } =
        await supabaseAdmin.auth.admin.createUser({
          email: usuario.correoElectronico,
          password: tempPasswordGenerada,
          email_confirm: true,
          user_metadata: { is_tenant_admin: true, empresa_id: dbEmpresaId },
        });

      if (errAuth)
        throw new Error(`Fallo al generar el acceso: ${errAuth.message}`);

      const { error: errUsrEmp } = await supabaseAdmin
        .from("usuarios_empresas")
        .insert({
          id: authUser.user.id,
          empresa_id: dbEmpresaId,
          nombre: "Administrador",
          email: usuario.correoElectronico,
          estado: "activo",
        });

      if (errUsrEmp)
        throw new Error(
          `Fallo al enlazar el perfil de Usuario: ${errUsrEmp.message}`,
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        empresa_id: dbEmpresaId,
        id_alegra: idAlegra,
        password_temporal: tempPasswordGenerada,
        mensaje: "Tenant gestionado y aprovisionado exitosamente.",
      }),
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
