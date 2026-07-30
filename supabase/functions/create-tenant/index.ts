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

    // 1. Validaciones básicas de entrada
    if (
      !empresa?.numeroIdentificacion ||
      !empresa?.razonSocial ||
      !usuario?.correoElectronico
    ) {
      throw new Error("Datos incompletos para aprovisionar el Tenant.");
    }

    // 2. Registrar la empresa en Alegra (API e-provider)
    const token = (Deno.env.get("ALLEGRA_TOKEN") || "").trim();
    if (!token)
      throw new Error(
        "El token de Allegra no está configurado en el servidor.",
      );

    const alegraPayload = {
      name: empresa.razonSocial,
      tradeName: empresa.nombreComercial || empresa.razonSocial,
      identification: empresa.numeroIdentificacion,
      dv: String(empresa.digitoVerificacion),
      useAlegraCertificate: true, // Configuramos por defecto el certificado de Alegra
      identificationType: "31", // NIT por defecto según DIAN
      email: usuario.correoElectronico,
      phone: empresa.telefono || "",
      organizationType: empresa.tipoOrganizacion
        ? Number(empresa.tipoOrganizacion)
        : 1,
      regimeCode: empresa.regimen === "48" ? "O-48" : "R-99-PN",
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
        const errData = await alegraRes.json();
        errDetail = JSON.stringify(errData);
      } catch {
        errDetail = alegraRes.statusText;
      }
      throw new Error(`Rechazo de Allegra (${alegraRes.status}): ${errDetail}`);
    }

    const alegraData = await alegraRes.json();
    const idAlegra = alegraData.id;

    // 3. Inicializar el cliente administrativo de Supabase (Brinda permisos totales)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // 4. Insertar la Empresa en Base de Datos
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

    // 5. Insertar la Suscripción ligada a la Empresa
    const { error: errSub } = await supabaseAdmin.from("suscripciones").insert({
      empresa_id: dbEmpresa.id,
      max_documentos: Number(suscripcion.maxDocumentos),
      fecha_inicio: suscripcion.fechaInicio,
      fecha_fin: suscripcion.fechaFin,
      estado: "activa",
    });

    if (errSub)
      throw new Error(`Fallo al guardar la Suscripción: ${errSub.message}`);

    // 6. Crear el Usuario en Supabase Auth
    const tempPassword = `Ing-${Math.random().toString(36).slice(-6)}*`;
    const { data: authUser, error: errAuth } =
      await supabaseAdmin.auth.admin.createUser({
        email: usuario.correoElectronico,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { is_tenant_admin: true, empresa_id: dbEmpresa.id },
      });

    if (errAuth)
      throw new Error(
        `Fallo al crear el Usuario de Autenticación: ${errAuth.message}`,
      );

    // 7. Insertar en tabla local de usuarios_empresas
    const { error: errUsrEmp } = await supabaseAdmin
      .from("usuarios_empresas")
      .insert({
        id: authUser.user.id,
        empresa_id: dbEmpresa.id,
        nombre: "Administrador de Tenant",
        email: usuario.correoElectronico,
        estado: "activo",
      });

    if (errUsrEmp)
      throw new Error(
        `Fallo al enlazar el perfil de Usuario: ${errUsrEmp.message}`,
      );

    // 8. Respuesta de Éxito
    return new Response(
      JSON.stringify({
        success: true,
        empresa_id: dbEmpresa.id,
        id_alegra: idAlegra,
        mensaje: "Tenant aprovisionado exitosamente.",
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
