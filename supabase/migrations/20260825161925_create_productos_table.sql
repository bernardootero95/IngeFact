-- Tabla de productos/servicios (catálogo propio de cada tenant). Alegra no
-- expone un catálogo de items en su API de e-provider: cada línea de factura
-- se envía inline (code, description, price, unitCode, taxes[]). Esta tabla
-- existe solo para que el tenant no tenga que reescribir esos datos cada vez
-- que factura; el módulo de Facturas la usará para precargar líneas.

CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "empresa_id" uuid NOT NULL REFERENCES "public"."empresas"("id") ON DELETE CASCADE,
    "tipo" character varying(20) NOT NULL DEFAULT 'bien' CHECK ("tipo" IN ('bien', 'servicio')),
    "codigo" character varying(50),
    "nombre" character varying(255) NOT NULL,
    "descripcion" text,
    "precio" numeric(14,2) NOT NULL CHECK ("precio" >= 0),
    "unidad_medida" character varying(50) NOT NULL,
    "tributo" character varying(50),
    "tarifa_impuesto" numeric(5,2) NOT NULL DEFAULT 0 CHECK ("tarifa_impuesto" >= 0 AND "tarifa_impuesto" <= 100),
    "estado" character varying(20) DEFAULT 'activo',
    "creado" timestamp with time zone DEFAULT now(),
    "actualizado" timestamp with time zone DEFAULT now(),
    "eliminado" timestamp with time zone,
    UNIQUE ("empresa_id", "codigo")
);

CREATE INDEX IF NOT EXISTS "idx_productos_empresa_id" ON "public"."productos" ("empresa_id");

ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;

-- Staff interno (soporte/operaciones) puede ver y administrar productos de
-- cualquier tenant, igual que ya puede con empresas/clientes.
CREATE POLICY "Staff_All_Productos" ON "public"."productos"
  TO "authenticated"
  USING (public.is_internal_staff())
  WITH CHECK (public.is_internal_staff());

-- Cada tenant solo puede ver/crear/editar/eliminar sus propios productos.
CREATE POLICY "Tenants_All_Own_Productos" ON "public"."productos"
  TO "authenticated"
  USING (empresa_id IN (SELECT public.current_tenant_empresa_ids()))
  WITH CHECK (empresa_id IN (SELECT public.current_tenant_empresa_ids()));
