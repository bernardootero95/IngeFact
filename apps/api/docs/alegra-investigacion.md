# Investigación API Alegra E-Provider (Sprint 0 — Parte B)

Documentación oficial: https://e-provider-docs.alegra.com/ (índice completo en `/llms.txt`).

Todo lo marcado como **✅ verificado** fue probado en vivo contra el sandbox real
(`https://sandbox-api.alegra.com/e-provider/col/v1`) con el token existente, usando
`scripts/explore_alegra.py`. Lo marcado como **📄 solo doc** viene de la documentación
oficial pero no se probó en este sprint (se probará al construirlo en Sprint 8/9).

## Conceptos clave

- **Empresa "principal" vs "asociada"**: el token de Alegra pertenece a una empresa
  principal (la cuenta de IngeFact en Alegra). Cada tenant que aprovisionamos se crea
  como una empresa **asociada** a ese token vía `POST /companies`. ✅ verificado.
- **DV (dígito de verificación)**: dígito de control del NIT colombiano. Algoritmo
  oficial DIAN implementado en `scripts/explore_alegra.py::nit_check_digit` (pesos
  `[3,7,13,17,19,23,29,37,41,43,47,53,59,67,71]` aplicados de derecha a izquierda,
  módulo 11; si el resto es 0 o 1 el DV es el resto, si no `11 - resto`).
- **Sandbox vs producción**: entornos completamente independientes (URLs distintas).
  Sandbox apunta al ambiente de habilitación de la DIAN, no al de producción real.

## `POST /companies` — crear empresa asociada ✅ verificado

Payload real que usamos (igual al que ya usaba la Edge Function `create-tenant`):

```json
{
  "name": "string (requerido)",
  "tradeName": "string",
  "identification": "NIT sin DV (requerido)",
  "dv": "string (requerido)",
  "useAlegraCertificate": true,
  "identificationType": "31",
  "email": "string",
  "phone": "string",
  "organizationType": 1,
  "regimeCode": "R-99-PN",
  "address": { "address": "string", "department": "11", "city": "11001", "country": "CO" }
}
```

**Respuesta real (201)** — ⚠️ la doc oficial dice que el response es `{id, name, ...}`
plano, pero en la práctica viene **anidado bajo `company`**:

```json
{ "company": { "id": "01M16TSD58W0FG7EASHPQZDRQK", "name": "...", "type": "associated", ... } }
```

Confirma que el código ya existente (`alegraData.company.id` en la Edge Function) es
correcto — la documentación oficial está desactualizada en este punto.

## `POST /test-sets` — habilitar sandbox (test set) ✅ verificado

```json
{
  "type": "invoices",
  "governmentId": "a70562e0-631e-4ceb-aa65-36887b57dc17",
  "company": { "id": "<id devuelto por createcompany>" }
}
```

`governmentId` fijo para sandbox: `a70562e0-631e-4ceb-aa65-36887b57dc17` (en
producción es el ID real que entrega la DIAN). `type` puede ser `"invoices"`,
`"payrolls"` o `"pos"`.

**Respuesta real (201)** — ⚠️ también difiere de la doc (que dice `{testSets: [...]}`
en plural): viene **singular, `testSet`**:

```json
{ "testSet": { "id": "...", "governmentId": "...", "type": "invoices", "status": "ACCEPTED", "errors": [] } }
```

## `GET /resolutions/{nit}` — ⚠️ NO funciona en sandbox

Probado con 3 NITs distintos (uno recién creado, uno inventado, y el NIT real de la
empresa principal del token): **los tres devuelven 404 siempre**:

```json
{ "errors": [{ "code": "AEP9006", "message": "Environment not supported. Production environment only" }] }
```

**Conclusión importante para Sprint 1/5**: este endpoint es exclusivo de producción.
En sandbox no hay forma de consultar resoluciones vía API — la resolución de prueba
hay que conocerla de antemano (documentación/soporte Alegra) o, para el MVP real, el
tenant la carga a mano en "Configuración > Resolución DIAN" (Sprint 5) una vez la
obtiene de la DIAN. No podemos depender de este GET para validar la resolución del
tenant en ningún ambiente que no sea producción.

## `GET /company` — empresa principal del token ✅ verificado

Sin parámetros, devuelve la empresa dueña del token autenticado (`{company: {...}}`),
igual forma que el objeto de `createcompany`. Útil para *self-check* de conectividad.

## `POST /invoices` — crear factura

### Intento 1: payload mínimo → 400, errores reales:

```json
{
  "errors": [
    { "message": "instance.totalAmounts requires property \"discountTotal\"" },
    { "message": "instance.totalAmounts requires property \"chargeTotal\"" },
    { "message": "instance.totalAmounts requires property \"advanceTotal\"" },
    { "message": "instance requires property \"resolution\"" }
  ]
}
```

⚠️ La doc dice que `discountTotal`/`chargeTotal`/`advanceTotal` son opcionales — en
la práctica **son obligatorios** (aunque sea con valor `0`). `resolution` también es
obligatorio en el body de cada factura (no basta con tenerla configurada en Alegra).

### Intento 2: payload completo pero con `taxes[].taxPercentage` numérico → 400:

```json
{
  "errors": [
    { "message": "instance.items[0].taxes[0].taxPercentage is not of a type(s) string" },
    { "message": "instance.items[0].taxes[0].taxPercentage is not one of enum values: 0,0.0,0.00,5,5.0,5.00,16,16.0,16.00,19,19.0,19.00" },
    { "message": "instance.payments[0] requires property \"paymentForm\"" },
    { "message": "instance.payments[0] requires property \"paymentMethod\"" }
  ]
}
```

**Hallazgos clave:**
- `taxPercentage` va como **string**, y solo acepta los valores DIAN válidos:
  `"0"`, `"5"`, `"16"`, `"19"` (con o sin decimales) — coincide con las tarifas que
  ya maneja el módulo de Impuestos en `apps/user`.
- `payments[]` requiere `paymentForm` y `paymentMethod` (no `method`/`meanOfPayment`
  como sugeriría intuitivamente el nombre del campo `payments`).

### Intento 3: payload completo y sintácticamente válido → 201, pero `legalStatus: "REJECTED"`:

Usamos el `resolution.technicalKey` de ejemplo del roadmap original (que resulta ser
de la empresa de ejemplo de la documentación, NIT `900559088`) contra nuestra propia
empresa principal (NIT `1221975136`). Alegra **sí acepta la request** (201, genera
`id`, `cufe`, XML, ZIP, QR) pero la DIAN la rechaza:

```json
{
  "invoice": {
    "status": "SENT",
    "legalStatus": "REJECTED",
    "governmentResponse": {
      "code": "89",
      "message": "NIT 9005590882 no autorizado a enviar documentos para emisor con NIT 1221975136."
    }
  }
}
```

**Conclusión crítica**: el `technicalKey`/resolución está atado criptográficamente al
NIT que lo solicitó ante la DIAN — **no se puede reutilizar una resolución de ejemplo
ni de otro tenant**. Cada empresa (tenant) necesita su propia resolución real
(Sprint 5 — "Resolución DIAN"), y no hay forma de fabricar una válida en sandbox sin
pasar por el proceso real de habilitación DIAN. Para pruebas de desarrollo, el flujo
completo (payload → Alegra → XML/CUFE/QR) sí es 100% verificable de punta a punda
aunque el resultado final sea `REJECTED` — es información suficiente para construir y
probar el Sprint 8 sin tener una resolución real todavía.

**Campos confirmados de la respuesta exitosa (aunque legalmente rechazada)**:
`invoice.id`, `invoice.cufe`, `invoice.status` (`SENT`), `invoice.legalStatus`
(`ACCEPTED`|`REJECTED`), `invoice.governmentResponse.{code,message,errorMessages}`,
`invoice.fullNumber`, `invoice.xmlFileName`/`zipFileName`, `invoice.qrCodeContent`
(el texto que va codificado en el QR del PDF), y un bloque `files.xml` con una URL
S3 firmada (temporal) para descargar el XML generado.

## `POST /credit-notes` y `POST /debit-notes` 📄 solo doc

Mismo patrón que `/invoices` pero con `conceptCode` (motivo de la nota, tabla DIAN
1-6 para crédito) y `associatedDocuments[]` referenciando la factura original
(`date`, `documentType`, `number`, `prefix`, `uuid`=CUFE). Se probarán en vivo en
Sprint 9, cuando ya exista una factura real para referenciar.

## Resolución de pruebas real (post-cierre Sprint 8) — ✅ verificado

Hasta este punto, todas las facturas de prueba habían salido `REJECTED`
(código `89`, "NIT no autorizado...") porque usábamos el `technicalKey`/
resolución de ejemplo de la documentación oficial contra una empresa de
sandbox con un NIT inventado. El usuario preguntó si existía una forma real
de probar una factura **aceptada**. Se investigó contra la documentación
oficial (`docs/entornos`) y se encontró la respuesta explícita:

> "Para realizar pruebas de documentos aceptados en el ambiente sandbox
> puedes usar el NIT (900559088) y DV (2) de Alegra con un prefijo único
> para evitar respuestas de error por documento con número duplicado."

Es decir: la resolución de ejemplo (`resolutionNumber: 18760000001`,
`prefix: SETP`, `minNumber: 990000000`, `maxNumber: 995000000`,
`technicalKey: fc8eac422eba16e22ffd8c6f94b3f40a6e38162c`) **es una
resolución real**, registrada ante la DIAN a nombre del NIT público de
pruebas de Alegra (900559088 / DV 2) — no un dato inventado. Cualquier
empresa asociada que se cree en el sandbox **con ese mismo NIT** hereda esa
resolución.

**Verificado en vivo** (`scripts/explore_alegra_test_resolution.py`):
1. Crear una empresa asociada nueva con `identification: "900559088"`,
   `dv: "2"` (en vez de un NIT aleatorio).
2. Habilitarla con el `test-set` de siempre.
3. Enviar una factura usando el `prefix`/rango/`technicalKey` **exactos**
   de la resolución de ejemplo (no se pueden inventar un prefijo o rango
   propios — la DIAN los valida contra lo ya registrado para ese NIT;
   probado y confirmado con las reglas `FAB10b`/`FAB11b`/`FAB12b`).

Resultado real: `legalStatus: "ACCEPTED_WITH_OBSERVATIONS"`,
`governmentResponse.code: "00"` ("Procesado Correctamente."), con solo 2
notificaciones no bloqueantes (`FAZ09` y `FAJ43b`).

**Hallazgo colateral importante — número duplicado**: el primer número del
rango (`990000000`+1) ya estaba usado por otro desarrollador en algún lugar
del mundo (NIT 900559088 es público y compartido por *todos* los que
prueban con Alegra) → `Regla: 90, Rechazo: Documento procesado
anteriormente.`. Arrancar el `number` en un punto aleatorio dentro del
rango evita la colisión. **Aplica también a la app real**: si se usa esta
resolución de pruebas desde `apps/user`, el consecutivo interno de la
empresa de pruebas no debe arrancar en `rango_minimo` exacto.

**Bug real de nuestro propio código encontrado en el camino**:
`FacturaService._aplicar_respuesta_envio`/`webhooks.py` solo reconocían
`legalStatus == "ACCEPTED"` — `ACCEPTED_WITH_OBSERVATIONS` (una aceptación
real de la DIAN, solo con notificaciones no bloqueantes) caía al `else` y
la factura quedaba encallada en `enviada` para siempre. Corregido para
tratar ambos valores como aceptación real.

**Fixture de desarrollo**: `scripts/seed_working_test_resolution.py`
reconfigura la empresa del tenant de pruebas local (`tenant@example.com`)
para usar esta resolución real — deja `id_alegra` apuntando a una empresa
sandbox con NIT 900559088 y la `ResolucionDian` con los valores exactos de
arriba (consecutivo arrancado en un punto aleatorio del rango, no en
`rango_minimo`, por el hallazgo de arriba).

## `GET /invoices/{id}` — Sprint 8, investigación de PDF

Antes de construir el botón "Descargar PDF" del mockup de detalle de
factura, se probó contra el sandbox real si existe un archivo PDF análogo al
`files.xml` ya documentado (`apps/api/scripts/explore_alegra_invoice_detail.py`).

**Resultado: no existe PDF en la API de e-provider.**
- `GET /invoices/{id}` devuelve exactamente el mismo shape que la respuesta
  de `POST /invoices` (`invoice.*` + `files.xml`) — **sin** `files.pdf` ni
  ningún campo equivalente.
- `GET /invoices/{id}/pdf` (probado por si existiera un endpoint dedicado no
  documentado) → `404 {"message": "Not Found"}`.
- El único archivo descargable es el XML (`files.xml`, URL S3 firmada que
  expira en 1h — **no persistir esta URL**, hay que volver a pedir
  `GET /invoices/{id}` cada vez que el usuario quiera descargar).
- `invoice.qrCodeContent` sí incluye una URL de verificación del portal
  público de la DIAN (`catalogo-vpfe-hab.dian.gov.co/document/searchqr?
  documentkey=<CUFE>`) — sirve para que un tercero verifique el documento,
  pero no es un PDF de la factura en sí.

**Decisión Sprint 8**: el detalle de factura solo ofrece "Descargar XML".
No se construye "Descargar PDF" — queda fuera de alcance (generar un PDF
propio a partir del XML/CUFE sería trabajo nuevo no pedido por el roadmap,
se deja como posible tarea futura si el usuario lo pide).

## Webhooks 📄 solo doc

Se configuran por empresa dentro del payload de `POST /companies` /
`PATCH /companies/{id}` (bloque `webhooks.{general|invoices|creditNotes|...}.
emissionFinished = {url, headers, status}`). No hay firma/HMAC documentada para
verificar la autenticidad de la llamada entrante — hay que asumir que cualquier
`POST` a nuestra URL de webhook podría venir de un tercero, y **no confiar en el
contenido sin validar contra el estado que ya tenemos guardado** (ej. que el
`invoice.id` exista y esté en estado `SENT` antes de aceptar la actualización).

Payload de `invoices.emissionFinished`:

```json
{
  "invoice": {
    "type": "invoice",
    "id": "...",
    "cufe": "... (solo si fue aceptada)",
    "status": "SENT",
    "legalStatus": "ACCEPTED | REJECTED",
    "governmentResponse": { "code": "...", "message": "...", "errorMessages": [] },
    "errors": []
  }
}
```

## Errores comunes observados/documentados

| Código | Mensaje | Causa |
|---|---|---|
| `AEP9006` | Environment not supported. Production environment only | Endpoint solo disponible en producción (ej. `GET /resolutions/{nit}`) |
| `89` (governmentResponse) | NIT X no autorizado a enviar documentos para emisor con NIT Y | El `technicalKey` de la resolución no pertenece al NIT emisor |
| — | instance.totalAmounts requires property "X" | Falta un subcampo obligatorio en `totalAmounts` (discountTotal/chargeTotal/advanceTotal) aunque sea 0 |
| — | instance.items[].taxes[].taxPercentage is not one of enum values | `taxPercentage` debe ser string y solo puede ser 0/5/16/19 |
| — | instance.payments[] requires property "paymentForm"/"paymentMethod" | Nombres de campo correctos para forma/método de pago |

## Reproducibilidad

`apps/api/scripts/explore_alegra.py` reproduce todo lo anterior contra el sandbox
real (usa el token de `apps/api/.env`). Genera una empresa de prueba nueva cada vez
que corre (NIT aleatorio con DV válido), así que es seguro re-ejecutarlo.
