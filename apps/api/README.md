# IngeFact API

Backend de IngeFact (SaaS de facturación electrónica en Colombia). FastAPI +
PostgreSQL + SQLAlchemy + Alembic, Clean Architecture. Orquesta datos y llama a
la API de Alegra (proveedor tecnológico e-provider) — no implementa un motor
DIAN propio (UBL/CUFE/firma).

## Estructura

```
src/
  core/            # config, seguridad (JWT/bcrypt), AlegraClient, mapeo de
                    # errores, rate limiting, email, PDF, utilidades DIAN (NIT/DV)
  domain/          # esquemas Pydantic (Request/Response) por entidad
  application/     # servicios de negocio (*_service.py)
  infrastructure/  # modelos SQLAlchemy + sesión de BD
  presentation/    # rutas FastAPI (routes/tenant_*.py, admin_*.py, external_*.py)
  main.py
```

## Levantar en local

1. `cp .env.example .env` y completar `DATABASE_URL`, `ALEGRA_TOKEN`, `JWT_SECRET`
   (generar con `python -c "import secrets; print(secrets.token_urlsafe(64))"`).
2. Postgres vía `docker compose up postgres` desde la raíz del repo (puerto 5434
   en el host — 5433/5432 suelen estar ocupados por otros servicios locales, ver
   comentario en `.env.example`).
3. `python -m venv venv && ./venv/Scripts/pip install -r requirements.txt`
   (Windows) o `venv/bin/pip install -r requirements.txt` (Unix).
4. `alembic upgrade head`.
5. `./venv/Scripts/python.exe -m uvicorn src.main:app --reload --port 8000`.

**Reiniciar uvicorn a mano tras cada cambio de backend antes de verificar en
navegador** — `--reload` no siempre recoge cambios de forma confiable en este
entorno (lección de varias sesiones).

## Tests

`./venv/Scripts/python.exe -m pytest` (o `pytest` con el venv activado). Usa una
BD Postgres real (`ingefact_test`, mismo servidor que `DATABASE_URL`, nombre fijo
en `tests/conftest.py`), creada con `Base.metadata.create_all` (no corre
Alembic). Alegra y el envío de correos siempre están mockeados en los tests
automáticos (`respx`/fakes inyectados vía `monkeypatch` — ver `conftest.py`) para
nunca golpear la red real. CI (`.github/workflows/ci.yml`, job `api-tests`) corre
esta misma suite contra un Postgres de servicio.

## Convenciones del repo (leer antes de agregar un módulo nuevo)

- **CRUD tenant-scoped** (ver `application/cliente_service.py`/`producto_service.py`
  como plantilla): `empresa_id` sale SIEMPRE de `CurrentTenant` (JWT, vía
  `Depends(get_current_tenant)`), nunca del body/path de la request.
- **Soft-delete** vía índice único parcial
  (`Index(..., unique=True, postgresql_where=text("eliminado IS NULL"))`), nunca
  `UniqueConstraint` plano — libera el documento/código al eliminar.
  `eliminar()` solo pone `eliminado = now()`, nunca hace DELETE real.
- **Snapshot de líneas**: un documento con líneas (Factura, Nota Crédito/Débito)
  copia los campos del producto (`descripcion`/`precio`/`tributo`) AL CREAR la
  línea, nunca los re-lee del FK después — un documento ya enviado no debe
  cambiar si el producto se edita/elimina luego.
- **Consecutivos DIAN**: siempre con `UPDATE ... WHERE ... RETURNING` atómico
  (ver `resolucion_dian_service.py::incrementar_consecutivo`), nunca
  `SELECT` + `UPDATE` separados (condición de carrera real bajo concurrencia).
- **AlegraClient** (`core/alegra_client.py`): cada método es un wrapper delgado
  sobre `self._request()`. `AlegraApiError` → HTTP 400 (rechazo real, no
  infraestructura), `AlegraTransientError` → HTTP 502 (reintentable). Errores se
  mapean a mensajes claros vía `core/alegra_errors.py`.
- **Documentación de hallazgos contra Alegra**: `docs/alegra-investigacion.md` —
  extenderlo con cada investigación nueva contra el sandbox real, nunca
  reescribirlo. Antes de diseñar el payload de un documento DIAN nuevo, correr
  un script de exploración en `scripts/` contra el sandbox y documentar ahí los
  hallazgos, mismo patrón ya usado para Facturas/Notas Crédito-Débito.
