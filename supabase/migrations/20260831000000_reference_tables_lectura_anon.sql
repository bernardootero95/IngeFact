-- apps/admin dejo de autenticar con Supabase Auth (Sprint 2, migracion a JWT
-- propio de apps/api) -- ya no llega ninguna sesion "authenticated" al
-- cliente de Supabase del panel admin. Las 13 tablas de catalogo DIAN son
-- datos de referencia publicos (sin dato de tenant), y el plan del sprint ya
-- las expondra sin guard en FastAPI (GET /api/v1/public/reference-tables/{tabla})
-- una vez migradas -- se adelanta ese mismo criterio aqui via RLS mientras
-- conviven ambos backends, en vez de dejar los combos de CompanyModal rotos.
alter policy "Lectura pública/autenticada de departamentos" on public.departamentos to authenticated, anon;
alter policy "Lectura pública/autenticada de municipios" on public.municipios to authenticated, anon;
alter policy "Lectura pública/autenticada de paises" on public.paises to authenticated, anon;
alter policy "Lectura pública/autenticada de monedas" on public.monedas to authenticated, anon;
alter policy "Lectura pública/autenticada de formas_pago" on public.formas_pago to authenticated, anon;
alter policy "Lectura pública/autenticada de metodos_pago" on public.metodos_pago to authenticated, anon;
alter policy "Lectura pública/autenticada de tipos_organizacion" on public.tipos_organizacion to authenticated, anon;
alter policy "Lectura pública/autenticada de responsabilidades_fiscales" on public.responsabilidades_fiscales to authenticated, anon;
alter policy "Lectura pública/autenticada de tributos" on public.tributos to authenticated, anon;
alter policy "Lectura pública/autenticada de tipos_identificacion" on public.tipos_identificacion to authenticated, anon;
alter policy "Lectura pública/autenticada de tipos_unidad" on public.tipos_unidad to authenticated, anon;
alter policy "Lectura pública/autenticada de conceptos_nota_credito" on public.conceptos_nota_credito to authenticated, anon;
alter policy "Lectura pública/autenticada de conceptos_nota_debito" on public.conceptos_nota_debito to authenticated, anon;
