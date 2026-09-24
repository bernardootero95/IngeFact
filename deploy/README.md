# Despliegue de producción

Copia versionada de la configuración que vive en el servidor
(`ingefact-api-prod`, Hetzner, carpeta `~/ingefact`). **La fuente de verdad
es el servidor**: si cambias algo allá, actualiza también este archivo en el
mismo cambio.

## Arquitectura

```
Usuario → Cloudflare (proxy) → Caddy (80/443, HTTPS) → api:8000 (uvicorn) → Postgres
```

- Solo Caddy expone puertos (80/443). El puerto 8000 de la API **no** se
  publica: si se publicara, cualquiera podría falsificar su IP.
- Los frontends (`ingefact.com`, `app.ingefact.com`, `admi.ingefact.com`)
  están hoy en Vercel.

## Archivos

| Archivo | Ruta en el servidor | Estado |
|---|---|---|
| `Caddyfile` | `~/ingefact/Caddyfile` | Versionado (2026-09-24) |
| `docker-compose.prod.yml` | `~/ingefact/docker-compose.prod.yml` | **Pendiente**: falta copiarlo aquí sin secretos |

## IP real del cliente

La API usa la IP del cliente para el límite de intentos de login y como
prueba de la aceptación de términos (tabla `aceptaciones_legales`). La
cadena para que llegue la IP real:

1. **Cloudflare** envía la IP del usuario en la cabecera `CF-Connecting-IP`.
2. **Caddy** solo le cree esa cabecera a peticiones que vienen de los rangos
   de Cloudflare (`trusted_proxies`); a cualquier otra le usa la IP de
   conexión, así que no se puede falsificar. La reenvía como
   `X-Forwarded-For {client_ip}`.
3. **uvicorn** confía en `X-Forwarded-For` solo si viene de la red de Docker:
   el `command` de la API en `docker-compose.prod.yml` debe terminar en
   `--forwarded-allow-ips 172.18.0.0/16`.

Comprobar que funciona (debe verse la IP pública del usuario, no `172.18.x.x`
ni `172.64`–`172.71.x.x`):

```bash
cd ~/ingefact && docker compose -f docker-compose.prod.yml logs --tail 10 api
```

Si vuelven a aparecer IP de Cloudflare, Cloudflare cambió sus rangos:
actualiza `trusted_proxies` con https://www.cloudflare.com/ips-v4 y
https://www.cloudflare.com/ips-v6.

## Cambiar el Caddyfile sin cortar el servicio

```bash
cd ~/ingefact && cp Caddyfile Caddyfile.bak
# editar Caddyfile (o copiar el de este repo)
cd ~/ingefact && docker compose -f docker-compose.prod.yml exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
cd ~/ingefact && docker compose -f docker-compose.prod.yml exec -w /etc/caddy caddy caddy reload
```

Si `validate` falla, restaura con `cp Caddyfile.bak Caddyfile` antes de
recargar.

## Verificar los PDF con WeasyPrint real

En Windows no hay GTK, así que los PDF solo se pueden probar dentro del
contenedor de la API:

```bash
docker compose run --rm -e PYTHONPATH=/app -v "${PWD}/apps/api:/app" api python scripts/verificar_pdf_seguro.py
```
