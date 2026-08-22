-- Tabla de clientes (adquirientes) por tenant. Cada empresa (tenant) gestiona
-- su propio directorio de clientes para poder facturarles.

CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "empresa_id" uuid NOT NULL REFERENCES "public"."empresas"("id") ON DELETE CASCADE,
    "tipo_identificacion" character varying(20) NOT NULL,
    "numero_identificacion" character varying(50) NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "correo_electronico" character varying(150) NOT NULL,
    "telefono" character varying(50),
    "tipo_organizacion" character varying(50),
    "regimen" character varying(50),
    "tributo" character varying(50),
    "estado" character varying(20) DEFAULT 'activo',
    "creado" timestamp with time zone DEFAULT now(),
    "actualizado" timestamp with time zone DEFAULT now(),
    "eliminado" timestamp with time zone,
    UNIQUE ("empresa_id", "numero_identificacion")
);

CREATE INDEX IF NOT EXISTS "idx_clientes_empresa_id" ON "public"."clientes" ("empresa_id");

ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;

-- Staff interno (soporte/operaciones) puede ver y administrar clientes de
-- cualquier tenant, igual que ya puede con empresas/suscripciones.
CREATE POLICY "Staff_All_Clientes" ON "public"."clientes"
  TO "authenticated"
  USING (public.is_internal_staff())
  WITH CHECK (public.is_internal_staff());

-- Cada tenant solo puede ver/crear/editar/eliminar sus propios clientes.
CREATE POLICY "Tenants_All_Own_Clientes" ON "public"."clientes"
  TO "authenticated"
  USING (empresa_id IN (SELECT public.current_tenant_empresa_ids()))
  WITH CHECK (empresa_id IN (SELECT public.current_tenant_empresa_ids()));
