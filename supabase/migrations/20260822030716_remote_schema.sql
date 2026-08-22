


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."estado_registro" AS ENUM (
    'activo',
    'inactivo'
);


ALTER TYPE "public"."estado_registro" OWNER TO "postgres";


CREATE TYPE "public"."estado_usuario" AS ENUM (
    'activo',
    'inactivo'
);


ALTER TYPE "public"."estado_usuario" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conceptos_nota_credito" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "value_nade" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."conceptos_nota_credito" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conceptos_nota_debito" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."conceptos_nota_debito" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."departamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empresas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "razon_social" character varying(255) NOT NULL,
    "nombre_comercial" character varying(255),
    "numero_identificacion" character varying(50) NOT NULL,
    "digito_verificacion" character varying(1) NOT NULL,
    "tipo_identificacion" character varying(20) DEFAULT 'NIT'::character varying,
    "direccion" "text",
    "departamento" character varying(10),
    "municipio" character varying(10),
    "regimen" character varying(50),
    "telefono" character varying(50),
    "correo_electronico" character varying(150) NOT NULL,
    "notificacion_correo" boolean DEFAULT true,
    "tipo_organizacion" character varying(50),
    "logo" "text",
    "id_alegra" character varying(100),
    "estado" character varying(20) DEFAULT 'activo'::character varying,
    "creado" timestamp with time zone DEFAULT "now"(),
    "actualizado" timestamp with time zone DEFAULT "now"(),
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."empresas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."formas_pago" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."formas_pago" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logs_auditoria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid",
    "tabla_nombre" character varying(100) NOT NULL,
    "operacion" character varying(20) NOT NULL,
    "registro_id" "text" NOT NULL,
    "datos_anteriores" "jsonb",
    "datos_nuevos" "jsonb",
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logs_auditoria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."metodos_pago" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."metodos_pago" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monedas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."monedas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."municipios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "department_code" character varying(50) NOT NULL,
    "department_value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."municipios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."paises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."responsabilidades_fiscales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."responsabilidades_fiscales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suscripciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid",
    "max_documentos" integer NOT NULL,
    "documentos_usados" integer DEFAULT 0,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date" NOT NULL,
    "estado" character varying(20) DEFAULT 'activa'::character varying,
    "creado" timestamp with time zone DEFAULT "now"(),
    "actualizado" timestamp with time zone DEFAULT "now"(),
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."suscripciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipos_identificacion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."tipos_identificacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipos_organizacion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."tipos_organizacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipos_unidad" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."tipos_unidad" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tributos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "value" character varying(255) NOT NULL,
    "estado" "public"."estado_registro" DEFAULT 'activo'::"public"."estado_registro" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."tributos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "estado" "public"."estado_usuario" DEFAULT 'activo'::"public"."estado_usuario" NOT NULL,
    "creado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios_empresas" (
    "id" "uuid" NOT NULL,
    "empresa_id" "uuid",
    "nombre" character varying(150) NOT NULL,
    "email" character varying(150) NOT NULL,
    "estado" character varying(20) DEFAULT 'activo'::character varying,
    "creado" timestamp with time zone DEFAULT "now"(),
    "actualizado" timestamp with time zone DEFAULT "now"(),
    "eliminado" timestamp with time zone
);


ALTER TABLE "public"."usuarios_empresas" OWNER TO "postgres";


ALTER TABLE ONLY "public"."conceptos_nota_credito"
    ADD CONSTRAINT "conceptos_nota_credito_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."conceptos_nota_credito"
    ADD CONSTRAINT "conceptos_nota_credito_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conceptos_nota_debito"
    ADD CONSTRAINT "conceptos_nota_debito_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."conceptos_nota_debito"
    ADD CONSTRAINT "conceptos_nota_debito_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departamentos"
    ADD CONSTRAINT "departamentos_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."departamentos"
    ADD CONSTRAINT "departamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_numero_identificacion_key" UNIQUE ("numero_identificacion");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."formas_pago"
    ADD CONSTRAINT "formas_pago_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."formas_pago"
    ADD CONSTRAINT "formas_pago_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logs_auditoria"
    ADD CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."metodos_pago"
    ADD CONSTRAINT "metodos_pago_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."metodos_pago"
    ADD CONSTRAINT "metodos_pago_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monedas"
    ADD CONSTRAINT "monedas_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."monedas"
    ADD CONSTRAINT "monedas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."municipios"
    ADD CONSTRAINT "municipios_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."municipios"
    ADD CONSTRAINT "municipios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paises"
    ADD CONSTRAINT "paises_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."paises"
    ADD CONSTRAINT "paises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responsabilidades_fiscales"
    ADD CONSTRAINT "responsabilidades_fiscales_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."responsabilidades_fiscales"
    ADD CONSTRAINT "responsabilidades_fiscales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suscripciones"
    ADD CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipos_identificacion"
    ADD CONSTRAINT "tipos_identificacion_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."tipos_identificacion"
    ADD CONSTRAINT "tipos_identificacion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipos_organizacion"
    ADD CONSTRAINT "tipos_organizacion_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."tipos_organizacion"
    ADD CONSTRAINT "tipos_organizacion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipos_unidad"
    ADD CONSTRAINT "tipos_unidad_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."tipos_unidad"
    ADD CONSTRAINT "tipos_unidad_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tributos"
    ADD CONSTRAINT "tributos_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."tributos"
    ADD CONSTRAINT "tributos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios_empresas"
    ADD CONSTRAINT "usuarios_empresas_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios_empresas"
    ADD CONSTRAINT "usuarios_empresas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_suscripcion_activa_unica" ON "public"."suscripciones" USING "btree" ("empresa_id") WHERE ((("estado")::"text" = 'activa'::"text") AND ("eliminado" IS NULL));



CREATE INDEX "logs_auditoria_tabla_registro_idx" ON "public"."logs_auditoria" USING "btree" ("tabla_nombre", "registro_id");



ALTER TABLE ONLY "public"."suscripciones"
    ADD CONSTRAINT "suscripciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios_empresas"
    ADD CONSTRAINT "usuarios_empresas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Lectura pública/autenticada de conceptos_nota_credito" ON "public"."conceptos_nota_credito" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de conceptos_nota_debito" ON "public"."conceptos_nota_debito" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de departamentos" ON "public"."departamentos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de formas_pago" ON "public"."formas_pago" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de metodos_pago" ON "public"."metodos_pago" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de monedas" ON "public"."monedas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de municipios" ON "public"."municipios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de paises" ON "public"."paises" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de responsabilidades_fiscales" ON "public"."responsabilidades_fiscales" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de tipos_identificacion" ON "public"."tipos_identificacion" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de tipos_organizacion" ON "public"."tipos_organizacion" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de tipos_unidad" ON "public"."tipos_unidad" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura pública/autenticada de tributos" ON "public"."tributos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir actualización a administradores autenticados" ON "public"."usuarios" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Permitir inserción a administradores autenticados" ON "public"."usuarios" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Permitir lectura de logs a usuarios autenticados" ON "public"."logs_auditoria" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir lectura de todos los usuarios a admins autenticados" ON "public"."usuarios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "SuperAdmins_All_Empresas" ON "public"."empresas" TO "authenticated" USING ((COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_tenant_admin'::"text"), 'false'::"text") <> 'true'::"text")) WITH CHECK ((COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_tenant_admin'::"text"), 'false'::"text") <> 'true'::"text"));



CREATE POLICY "SuperAdmins_All_Suscripciones" ON "public"."suscripciones" TO "authenticated" USING ((COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_tenant_admin'::"text"), 'false'::"text") <> 'true'::"text")) WITH CHECK ((COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_tenant_admin'::"text"), 'false'::"text") <> 'true'::"text"));



CREATE POLICY "SuperAdmins_All_UsuariosEmpresas" ON "public"."usuarios_empresas" TO "authenticated" USING ((COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_tenant_admin'::"text"), 'false'::"text") <> 'true'::"text")) WITH CHECK ((COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_tenant_admin'::"text"), 'false'::"text") <> 'true'::"text"));



CREATE POLICY "Tenants_Select_Own_Empresa" ON "public"."empresas" FOR SELECT TO "authenticated" USING ((("id")::"text" = (("auth"."jwt"() -> 'user_metadata'::"text") ->> 'empresa_id'::"text")));



CREATE POLICY "Tenants_Select_Own_Suscripcion" ON "public"."suscripciones" FOR SELECT TO "authenticated" USING ((("empresa_id")::"text" = (("auth"."jwt"() -> 'user_metadata'::"text") ->> 'empresa_id'::"text")));



CREATE POLICY "Tenants_Select_Own_Usuarios" ON "public"."usuarios_empresas" FOR SELECT TO "authenticated" USING ((("empresa_id")::"text" = (("auth"."jwt"() -> 'user_metadata'::"text") ->> 'empresa_id'::"text")));



CREATE POLICY "Tenants_Update_Own_Empresa" ON "public"."empresas" FOR UPDATE TO "authenticated" USING ((("id")::"text" = (("auth"."jwt"() -> 'user_metadata'::"text") ->> 'empresa_id'::"text"))) WITH CHECK ((("id")::"text" = (("auth"."jwt"() -> 'user_metadata'::"text") ->> 'empresa_id'::"text")));



ALTER TABLE "public"."conceptos_nota_credito" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conceptos_nota_debito" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."formas_pago" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logs_auditoria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."metodos_pago" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monedas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."municipios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."responsabilidades_fiscales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suscripciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipos_identificacion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipos_organizacion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipos_unidad" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tributos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios_empresas" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."conceptos_nota_credito" TO "anon";
GRANT ALL ON TABLE "public"."conceptos_nota_credito" TO "authenticated";
GRANT ALL ON TABLE "public"."conceptos_nota_credito" TO "service_role";



GRANT ALL ON TABLE "public"."conceptos_nota_debito" TO "anon";
GRANT ALL ON TABLE "public"."conceptos_nota_debito" TO "authenticated";
GRANT ALL ON TABLE "public"."conceptos_nota_debito" TO "service_role";



GRANT ALL ON TABLE "public"."departamentos" TO "anon";
GRANT ALL ON TABLE "public"."departamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."departamentos" TO "service_role";



GRANT ALL ON TABLE "public"."empresas" TO "anon";
GRANT ALL ON TABLE "public"."empresas" TO "authenticated";
GRANT ALL ON TABLE "public"."empresas" TO "service_role";



GRANT ALL ON TABLE "public"."formas_pago" TO "anon";
GRANT ALL ON TABLE "public"."formas_pago" TO "authenticated";
GRANT ALL ON TABLE "public"."formas_pago" TO "service_role";



GRANT ALL ON TABLE "public"."logs_auditoria" TO "anon";
GRANT ALL ON TABLE "public"."logs_auditoria" TO "authenticated";
GRANT ALL ON TABLE "public"."logs_auditoria" TO "service_role";



GRANT ALL ON TABLE "public"."metodos_pago" TO "anon";
GRANT ALL ON TABLE "public"."metodos_pago" TO "authenticated";
GRANT ALL ON TABLE "public"."metodos_pago" TO "service_role";



GRANT ALL ON TABLE "public"."monedas" TO "anon";
GRANT ALL ON TABLE "public"."monedas" TO "authenticated";
GRANT ALL ON TABLE "public"."monedas" TO "service_role";



GRANT ALL ON TABLE "public"."municipios" TO "anon";
GRANT ALL ON TABLE "public"."municipios" TO "authenticated";
GRANT ALL ON TABLE "public"."municipios" TO "service_role";



GRANT ALL ON TABLE "public"."paises" TO "anon";
GRANT ALL ON TABLE "public"."paises" TO "authenticated";
GRANT ALL ON TABLE "public"."paises" TO "service_role";



GRANT ALL ON TABLE "public"."responsabilidades_fiscales" TO "anon";
GRANT ALL ON TABLE "public"."responsabilidades_fiscales" TO "authenticated";
GRANT ALL ON TABLE "public"."responsabilidades_fiscales" TO "service_role";



GRANT ALL ON TABLE "public"."suscripciones" TO "anon";
GRANT ALL ON TABLE "public"."suscripciones" TO "authenticated";
GRANT ALL ON TABLE "public"."suscripciones" TO "service_role";



GRANT ALL ON TABLE "public"."tipos_identificacion" TO "anon";
GRANT ALL ON TABLE "public"."tipos_identificacion" TO "authenticated";
GRANT ALL ON TABLE "public"."tipos_identificacion" TO "service_role";



GRANT ALL ON TABLE "public"."tipos_organizacion" TO "anon";
GRANT ALL ON TABLE "public"."tipos_organizacion" TO "authenticated";
GRANT ALL ON TABLE "public"."tipos_organizacion" TO "service_role";



GRANT ALL ON TABLE "public"."tipos_unidad" TO "anon";
GRANT ALL ON TABLE "public"."tipos_unidad" TO "authenticated";
GRANT ALL ON TABLE "public"."tipos_unidad" TO "service_role";



GRANT ALL ON TABLE "public"."tributos" TO "anon";
GRANT ALL ON TABLE "public"."tributos" TO "authenticated";
GRANT ALL ON TABLE "public"."tributos" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios_empresas" TO "anon";
GRANT ALL ON TABLE "public"."usuarios_empresas" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios_empresas" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































