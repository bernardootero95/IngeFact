-- El código interno del producto pasa a ser obligatorio: ya no basta con el
-- nombre para identificar el ítem al facturar. La unicidad por empresa ya
-- existía (UNIQUE empresa_id, codigo desde la creación de la tabla).

ALTER TABLE "public"."productos" ALTER COLUMN "codigo" SET NOT NULL;
