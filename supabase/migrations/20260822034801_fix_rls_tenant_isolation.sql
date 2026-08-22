-- Corrige el aislamiento multi-tenant: las políticas anteriores confiaban en
-- auth.jwt()->user_metadata, un campo que el propio usuario puede modificar con
-- supabase.auth.updateUser({ data: {...} }). Esto permitía a cualquier usuario
-- autenticado leer/escribir empresas, suscripciones y usuarios_empresas de
-- OTROS tenants con solo quitarse su flag is_tenant_admin.
--
-- La corrección usa funciones SECURITY DEFINER que verifican membresía real
-- contra las tablas usuarios / usuarios_empresas (no el JWT), siguiendo el
-- patrón recomendado por Supabase para evitar recursión y mejorar el plan de
-- ejecución de las políticas RLS.

CREATE OR REPLACE FUNCTION "public"."is_internal_staff"()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND estado = 'activo' AND eliminado IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION "public"."current_tenant_empresa_ids"()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT empresa_id FROM public.usuarios_empresas
  WHERE id = auth.uid() AND estado = 'activo' AND empresa_id IS NOT NULL;
$$;

-- ---------------------------------------------------------------------------
-- empresas
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "SuperAdmins_All_Empresas" ON "public"."empresas";
DROP POLICY IF EXISTS "Tenants_Select_Own_Empresa" ON "public"."empresas";
DROP POLICY IF EXISTS "Tenants_Update_Own_Empresa" ON "public"."empresas";

CREATE POLICY "Staff_All_Empresas" ON "public"."empresas"
  TO "authenticated"
  USING (public.is_internal_staff())
  WITH CHECK (public.is_internal_staff());

CREATE POLICY "Tenants_Select_Own_Empresa" ON "public"."empresas"
  FOR SELECT TO "authenticated"
  USING (id IN (SELECT public.current_tenant_empresa_ids()));

CREATE POLICY "Tenants_Update_Own_Empresa" ON "public"."empresas"
  FOR UPDATE TO "authenticated"
  USING (id IN (SELECT public.current_tenant_empresa_ids()))
  WITH CHECK (id IN (SELECT public.current_tenant_empresa_ids()));

-- ---------------------------------------------------------------------------
-- suscripciones
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "SuperAdmins_All_Suscripciones" ON "public"."suscripciones";
DROP POLICY IF EXISTS "Tenants_Select_Own_Suscripcion" ON "public"."suscripciones";

CREATE POLICY "Staff_All_Suscripciones" ON "public"."suscripciones"
  TO "authenticated"
  USING (public.is_internal_staff())
  WITH CHECK (public.is_internal_staff());

CREATE POLICY "Tenants_Select_Own_Suscripcion" ON "public"."suscripciones"
  FOR SELECT TO "authenticated"
  USING (empresa_id IN (SELECT public.current_tenant_empresa_ids()));

-- ---------------------------------------------------------------------------
-- usuarios_empresas
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "SuperAdmins_All_UsuariosEmpresas" ON "public"."usuarios_empresas";
DROP POLICY IF EXISTS "Tenants_Select_Own_Usuarios" ON "public"."usuarios_empresas";

CREATE POLICY "Staff_All_UsuariosEmpresas" ON "public"."usuarios_empresas"
  TO "authenticated"
  USING (public.is_internal_staff())
  WITH CHECK (public.is_internal_staff());

CREATE POLICY "Tenants_Select_Own_Usuarios" ON "public"."usuarios_empresas"
  FOR SELECT TO "authenticated"
  USING (empresa_id IN (SELECT public.current_tenant_empresa_ids()));

-- ---------------------------------------------------------------------------
-- usuarios (staff interno) — hoy cualquier autenticado podía leer/insertar/
-- actualizar filas aquí (USING/WITH CHECK true). La creación de staff ya pasa
-- por la Edge Function create-admin-user con service_role (se salta RLS), así
-- que no hace falta política de INSERT para el rol authenticated.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir actualización a administradores autenticados" ON "public"."usuarios";
DROP POLICY IF EXISTS "Permitir inserción a administradores autenticados" ON "public"."usuarios";
DROP POLICY IF EXISTS "Permitir lectura de todos los usuarios a admins autenticados" ON "public"."usuarios";

CREATE POLICY "Staff_Select_Usuarios" ON "public"."usuarios"
  FOR SELECT TO "authenticated"
  USING (public.is_internal_staff());

CREATE POLICY "Staff_Update_Usuarios" ON "public"."usuarios"
  FOR UPDATE TO "authenticated"
  USING (public.is_internal_staff())
  WITH CHECK (public.is_internal_staff());

-- ---------------------------------------------------------------------------
-- logs_auditoria — los logs de auditoría no deberían ser legibles por
-- cualquier usuario autenticado (incluidos usuarios de tenants), solo staff.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir lectura de logs a usuarios autenticados" ON "public"."logs_auditoria";

CREATE POLICY "Staff_Select_Logs" ON "public"."logs_auditoria"
  FOR SELECT TO "authenticated"
  USING (public.is_internal_staff());
