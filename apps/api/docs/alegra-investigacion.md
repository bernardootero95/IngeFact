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
