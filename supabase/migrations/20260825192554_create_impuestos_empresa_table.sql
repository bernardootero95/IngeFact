-- Impuestos predefinidos por empresa (tenant): en vez de que cada producto
-- elija libremente entre los ~20 tributos DIAN y escriba una tarifa a mano,
-- la empresa configura de antemano sus combinaciones tributo+tarifa (ej.
-- "IVA 19%", "IVA 5%") y el formulario de productos elige entre esos presets.

CREATE TABLE IF NOT EXISTS "public"."impuestos_empresa" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "empresa_id" uuid NOT NULL REFERENCES "public"."empresas"("id") ON DELETE CASCADE,
    "tributo" character varying(50) NOT NULL,
    "tarifa" numeric(5,2) NOT NULL DEFAULT 0 CHECK ("tarifa" >= 0 AND "tarifa" <= 100),
    "estado" character varying(20) DEFAULT 'activo',
    "creado" timestamp with time zone DEFAULT now(),
    "actualizado" timestamp with time zone DEFAULT now(),
    "eliminado" timestamp with time zone,
    UNIQUE ("empresa_id", "tributo", "tarifa")
);

CREATE INDEX IF NOT EXISTS "idx_impuestos_empresa_empresa_id" ON "public"."impuestos_empresa" ("empresa_id");

ALTER TABLE "public"."impuestos_empresa" ENABLE ROW LEVEL SECURITY;

-- Staff interno (soporte/operaciones) puede ver y administrar los impuestos
-- configurados de cualquier tenant, igual que ya puede con empresas/productos.
CREATE POLICY "Staff_All_ImpuestosEmpresa" ON "public"."impuestos_empresa"
  TO "authenticated"
  USING (public.is_internal_staff())
  WITH CHECK (public.is_internal_staff());

-- Cada tenant solo puede ver/crear/editar/eliminar sus propios impuestos.
CREATE POLICY "Tenants_All_Own_ImpuestosEmpresa" ON "public"."impuestos_empresa"
  TO "authenticated"
  USING (empresa_id IN (SELECT public.current_tenant_empresa_ids()))
  WITH CHECK (empresa_id IN (SELECT public.current_tenant_empresa_ids()));
