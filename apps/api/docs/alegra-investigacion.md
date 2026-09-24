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

## `POST /credit-notes` y `POST /debit-notes` — ✅ verificado (Sprint 9)

Mismo patrón que `/invoices` pero con `conceptCode` (motivo de la nota, tabla DIAN
1-6 para crédito) y `associatedDocuments[]` referenciando la factura original
(`date`, `documentType`, `number`, `prefix`, `uuid`=CUFE).

Probado en vivo contra el sandbox real (`scripts/explore_alegra_credit_note.py`),
referenciando una factura ya `ACCEPTED_WITH_OBSERVATIONS` (SETP991453316):

- **No exigen un bloque `resolution` propio** como `/invoices` — el consecutivo
  (`number`) es enteramente nuestro, sin rango/`technicalKey` que registrar ante
  la DIAN. `prefix` no se valida: si no se envía, Alegra lo devuelve vacío
  (`""`). IngeFact controla su propio prefijo visual (`NC-000001`) sin
  comunicárselo a Alegra.
- **Exigen `invoicePeriod`** (`{startDate, endDate}`) — no documentado en la doc
  oficial, el primer intento sin este campo respondió 400
  (`instance requires property "invoicePeriod"`).
- Deben salir de la **misma empresa/NIT** que emitió la factura original —
  mismo patrón de aislamiento ya conocido de facturas (probar con la empresa
  principal del token en vez de la asociada dueña de la factura dio
  `REJECTED` código 89 "NIT no autorizado").
- Respuesta 201 real: `creditNote.{id, cude, date, prefix, number, fullNumber,
  status, legalStatus, governmentResponse, qrCodeContent, xmlFileName,
  zipFileName}` + `files.{xml, attachedDocument, zip}` (a diferencia de
  `/invoices`, que solo trae `files.xml`). El campo equivalente al CUFE se
  llama `cude`, no `cufe`.
- `/debit-notes` respondió con la misma estructura y también
  `ACCEPTED_WITH_OBSERVATIONS` real, con la única diferencia de que
  `debitNote.number` volvió como **string** ("474021") mientras que
  `creditNote.number` volvió como **entero** (373350) — inconsistencia de
  tipos del lado de Alegra, no confiar en el tipo de ese campo en la
  respuesta si se llega a implementar Notas Débito.
- El catálogo `conceptos_nota_credito` (ya sincronizado desde Sprint 2+3) trae
  el código **"2" = "Anulación del documento equivalente electrónico"** —
  usado como motivo fijo del atajo "Anular Factura".

Alcance implementado en Sprint 9: solo Notas Crédito (+ el atajo "Anular
Factura", que es una Nota Crédito 100%/motivo fijo). Notas Débito quedan
para un sprint aparte, aunque el hallazgo de arriba ya deja documentado que
el mismo patrón de payload aplica.

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

## `POST /support-documents` — ✅ investigación concluyente (Fase 3)

Investigación mixta: doc oficial (`https://e-provider-docs.alegra.com/reference/createsupportdocument`)
+ verificación en vivo contra el sandbox real (`scripts/explore_alegra_support_document.py`,
empresa asociada NIT 900559088). A diferencia de Notas Crédito/Débito, **NO es
el mismo patrón que `/invoices`** en varios puntos.

**Confirmado en vivo:**
- Endpoint propio (`POST /support-documents`), no una variante de `/invoices`.
- **Sí exige un bloque `resolution` propio** (a diferencia de Notas Crédito/
  Débito) — pero, a diferencia del de `/invoices`, **sin `technicalKey`**:
  omitirlo no generó ningún error de schema en ninguno de los intentos.
- `company` **debe mandarse completo** (no basta `{id}` como en `/invoices`) —
  el primer intento con solo `{id}` dio `instance.company requires property
  "taxCode"`. Confirmado contra el schema OpenAPI crudo: `company` requiere
  `id` + `taxCode` (`taxCode.id` string, enum `01|ZZ`, igual que en
  `supplier.taxCode`); además admite opcionalmente `organizationType`,
  `identificationNumber`, `dv` (obligatorio si `identificationType=31`),
  `name`, `regimeCode` (patrón `O-(15|23|47|48|49)` o `R-99-PN`, separables
  con `;`).
- `resolution` **requeridos confirmados**: `resolutionNumber`, `minNumber`,
  `maxNumber`, `startDate`, `endDate` (`prefix` es opcional, a diferencia de
  Factura) — coincide con que no se vio error de schema al omitir
  `technicalKey` (Documento Soporte no lo tiene como propiedad, a diferencia
  de la resolución de Factura).
- `supplier` se manda **inline sin pre-registro** (igual que `customer` en
  facturas) — confirmado.
- `items[].standardCode` es **obligatorio** (`{identificationId, id}`, no
  existe en Factura) — `id` es el código del *esquema* de clasificación, con
  enum real confirmado: `001|010|020|999` (no el código del producto en sí,
  que va en `identificationId`).
- Respuesta esperada en éxito (según doc, sin confirmar en vivo porque no se
  llegó a pasar la validación de schema): `supportDocument.{id, date, status,
  legalStatus, cuds, prefix, number, fullNumber, governmentResponse}` +
  `files.{xml, applicationResponse}` — el equivalente al CUFE se llama
  **`cuds`**, no `cufe`/`cude`.

**✅ Pregunta de `supplier.identificationType` resuelta (2026-09-16), confirmada
contra el schema OpenAPI crudo publicado por Alegra (no la página HTML
renderizada, para evitar el ruido de mensajes de error inestables ya visto en
las pruebas en vivo):**

```json
"identificationType": {
  "type": "string",
  "description": "Tipo de documento de identificación del proveedor. Se debe
    colocar el Código que corresponda de la tabla de tipos de identificación
    de la DIAN",
  "maxLength": 2,
  "enum": ["21", "22", "31", "41", "42", "47", "50"]
}
```

Esto coincide exactamente con el enum que ya se había visto en los rechazos en
vivo (`is not one of enum values: 21,22,31,41,42,47,50`) — confirma que **NO
es un artefacto inestable del validador**, es una restricción real y
permanente del schema. Traducción de los códigos DIAN presentes vs. ausentes:

| Código | Significado                          | ¿En el enum? |
|--------|---------------------------------------|--------------|
| 11     | Registro civil                        | ❌ no        |
| 12     | Tarjeta de identidad                  | ❌ no        |
| **13** | **Cédula de ciudadanía**               | **❌ no**    |
| 21     | Tarjeta de extranjería                | ✅ sí        |
| 22     | Cédula de extranjería                 | ✅ sí        |
| 31     | NIT                                    | ✅ sí        |
| 41     | Pasaporte                              | ✅ sí        |
| 42     | Documento de identificación extranjero | ✅ sí        |
| 47     | PEP (Permiso Especial de Permanencia) | ✅ sí        |
| 50     | NIT de otro país                       | ✅ sí        |
| 91     | NUIP                                   | ❌ no        |

**Implicación de negocio, no técnica**: Alegra exige que todo proveedor de un
Documento Soporte tenga **NIT** (`31`) — no acepta cédula de ciudadanía
directamente, aunque el caso de uso normativo central de la DIAN para este
documento sea justamente comprarle a personas naturales no obligadas a
facturar. Esto es consistente con la práctica real en Colombia: una persona
natural sin negocio formal puede tramitar un **NIT personal** ante la DIAN
(vía RUT) precisamente para poder ser proveedor de un Documento Soporte — el
NIT no implica ser persona jurídica, `organizationType=2` (persona natural) +
`identificationType="31"` es la combinación esperada para ese caso.

**Decisión de producto que esto habilita (a confirmar con el usuario, no
asumida aquí)**: el `Proveedor` de IngeFact ya permite hoy cualquier
`tipo_identificacion` libre (incluida cédula, para Compras que no requieren
Documento Soporte). Para que un proveedor sea elegible para un Documento
Soporte, su `tipo_identificacion` debe estar en el subconjunto
`{21,22,31,41,42,47,50}` — la UI debe guiar al tenant a pedirle el NIT
personal al proveedor si solo tiene cédula, en vez de que el rechazo llegue
como un error crudo de Alegra en el momento de emitir.

**✅ Confirmación final en vivo (2026-09-16)**: con el payload corregido
(`company.taxCode: {"id": "01"}`, `supplier.organizationType=2` + persona
natural + `identificationType="31"` con NIT de prueba, `address.postalCode`
agregado) el request pasó **completo** el schema de Alegra —
`HTTP 201`, `legalStatus: REJECTED` solo por datos de prueba inventados
(`DSAJ24b`: DV del NIT incorrecto — se inventó el DV; `DSAB10b`: numeración
sin habilitar — la resolución `18760000002` de prueba no está registrada de
verdad para este NIT en el sandbox). Es el mismo patrón exacto que ya se vio
con Factura al principio del Sprint 0: el schema del payload es correcto, lo
que falta es una resolución de Documento Soporte real registrada para el NIT
de pruebas — no bloquea el diseño del modelo, ya se puede seguir con la
implementación. Respuesta real de éxito de schema confirmada:
`supportDocument.{id, companyIdentification, supplierIdentification, type,
cuds, date, prefix, number, fullNumber, status, legalStatus,
governmentResponse, qrCodeContent, xmlFileName, zipFileName}` +
`files.{xml, applicationResponse}`.

**✅ Aceptación real de la DIAN confirmada (mismo día)**: repitiendo el envío
sin `address.postalCode` (para confirmar si de verdad es obligatorio, ya que
no tiene sentido inventar un codigo postal falso para cada proveedor real) y
con un NIT de proveedor + DV que sí coincidían, la respuesta fue
`legalStatus: ACCEPTED_WITH_OBSERVATIONS`, `governmentResponse.code: "00"`
("Procesado Correctamente") — **la DIAN real aceptó el documento**, la única
observación (`DSAB10b`) fue no bloqueante (numeración de prueba vencida/sin
habilitar, mismo tipo de aviso ya visto en Factura). Esto confirma:
`address.postalCode` **no es obligatorio** (se omite del payload real), y
todo el resto del shape (`company`, `supplier` persona natural con NIT,
`items[].standardCode`, `payments` sin `amount`) es correcto de punta a
punta contra la DIAN real, no solo contra el validador de schema de Alegra.

## `POST /events/from-cufe` — Eventos del Receptor ✅ investigación concluyente (Fase 4)

Investigación mixta: doc oficial (`https://e-provider-docs.alegra.com/reference/createeventfromcufe`)
+ verificación en vivo contra el sandbox real (`scripts/explore_alegra_receiver_events.py`),
usando el CUFE real de una factura ya aceptada. Esta es la investigación que
resuelve la pregunta central de la Fase 4 ("¿cómo entra al sistema la factura
recibida del proveedor?").

**Confirmado en vivo:**
- **`GET /invoices` no tiene ningún parámetro de rol/receptor/adquiriente** —
  solo lista las facturas donde la empresa autenticada es la EMISORA. No
  existe forma de que Alegra nos diga "estas son las facturas donde soy
  comprador". **Se descarta la Hipótesis A** del plan original.
- **`POST /events/from-cufe` solo necesita el CUFE** de la factura (`uuid`) +
  `type` (código de evento) + `number` (número propio, alfanumérico) —
  **no requiere pre-cargar ningún dato financiero/completo de la factura
  recibida**. Confirma una tercera opción, más simple que las 2 hipótesis
  originales del plan: el tenant solo necesita teclear el CUFE (que le da su
  proveedor) — Alegra resuelve el resto server-side. `facturas_recibidas` (si
  se modela) solo necesita guardar CUFE + datos de referencia mínimos que el
  propio tenant escribe (proveedor asociado, número, fecha, monto — para su
  propia UI, no para el request a Alegra).
- **Códigos de evento reales confirmados**: `030`=Acuse de recibo,
  `031`=Reclamo, `032`=Recibo del bien/servicio, `033`=Aceptación expresa,
  `034`=Aceptación tácita. `issuerParty` (datos de quien firma el evento:
  tipo/número de identificación, nombre, apellido) es **obligatorio para 030 y
  032**, no para 031/033/034 en los intentos hechos (031 lleva `claimCode`
  01-04 en su lugar).
- **La DIAN sí valida que la empresa que registra el evento sea realmente la
  receptora de esa factura** — probado a propósito con una empresa que NO era
  la compradora real: `legalStatus: REJECTED`, código `89` (el mismo patrón
  de "NIT no autorizado" ya conocido de Facturas/Notas). Esto confirma que no
  se puede "falsear" ser el receptor de una factura ajena — coherente con que
  la DIAN es quien valida, no Alegra. Importante para IngeFact: el evento
  solo quedará realmente `ACCEPTED` cuando la empresa del tenant (su
  `id_alegra`) sea efectivamente el `customer` real de esa factura ante la
  DIAN — algo que solo se sabrá al intentarlo, no se puede validar antes.
- **No hay bloqueo de idempotencia por reintento** (al menos en estado
  `REJECTED`): registrar 2 veces el mismo `number`+`uuid` devolvió 201 ambas
  veces con `id`/`cude` distintos, sin error 409/422 — sin confirmar si esto
  cambia una vez el evento queda `ACCEPTED` de verdad.
- Respuesta real confirmada:
  `event.{id, cude, type:{code, value}, companyIdentification, date,
  associatedDocumentId, receiver:{id, name, identificationType, dv}, number,
  legalStatus, status, governmentResponse, qrCodeContent}` + `files.{xml,
  attachedDocument}`.

**Pendiente de decidir con el usuario (no técnico, de producto)**: el efecto
real de un Reclamo (031) — la investigación no encontró ninguna consecuencia
automática documentada ni observable vía API (no anula nada, no dispara nada
del lado de Alegra). Recomendación: tratarlo como **puramente informativo**
del lado de IngeFact (se registra el evento, se muestra su estado) — la
corrección real (nueva factura, Nota Crédito, etc.) sigue siendo
responsabilidad manual del proveedor/tenant, mismo criterio "MVP simple
primero" ya aplicado en el resto del proyecto.

## `taxes[].taxableAmount` menor que `subtotal` — impuesto monofásico (ICL/IBUA) ✅ verificado

Caso: un distribuidor revende producto que ya trae ICL/IBUA pagado al productor
(impuesto monofásico). No es responsable de ese impuesto, así que **no** lo factura
como tributo, pero la ley lo excluye de la base del IVA. Ej.: precio pre-IVA 51.857,14
= base 42.857,14 + ICL embebido 9.000; IVA 19% sobre 42.857,14 = 8.142,86; total 60.000.

Verificado en el sandbox (factura, nota crédito y nota débito, con los constructores de
payload reales de los servicios): una línea con `subtotal`/`price` = 51.857,14 y
`taxes[0].taxableAmount` = 42.857,14 (mismo IVA 19%) se acepta —
`legalStatus: ACCEPTED_WITH_OBSERVATIONS`, código 00. Reglas:

- `item.subtotal`/`price` siguen siendo el valor comercial de la línea (incluye el ICL embebido);
  solo `taxes[].taxableAmount` baja.
- `totalAmounts.taxableTotal` = suma de esas bases reducidas (regla FAU04 sigue cumpliéndose);
  `grossTotal` sigue siendo la suma de `subtotal`.
- El ICL/IBUA **no** viaja como `taxes[]`; el QR de la DIAN muestra `ValOtroIm: 0.00`.
- Las observaciones que aparecen (FAZ09 sin `standardCode`, FAJ43b nombre vs RUT del cliente
  de prueba, CAJ39/DAJ39 TaxScheme del emisor, DAK07 ubicación del adquiriente) no
  tienen relación con la diferencia de bases.

Reproducible con `apps/api/scripts/explore_alegra_taxable_amount_split.py` (empresa asociada
NIT 900559088 + resolución SETP de pruebas; usa el número dentro del rango 990000000-995000000,
fuera de él la DIAN rechaza con FAD05b).

## Errores comunes observados/documentados

| Código | Mensaje | Causa |
|---|---|---|
| `AEP9006` | Environment not supported. Production environment only | Endpoint solo disponible en producción (ej. `GET /resolutions/{nit}`) |
| `89` (governmentResponse) | NIT X no autorizado a enviar documentos para emisor con NIT Y | El `technicalKey` de la resolución no pertenece al NIT emisor |
| — | instance.totalAmounts requires property "X" | Falta un subcampo obligatorio en `totalAmounts` (discountTotal/chargeTotal/advanceTotal) aunque sea 0 |
| — | instance.items[].taxes[].taxPercentage is not one of enum values | `taxPercentage` debe ser string y solo puede ser 0/5/16/19 |
| — | instance.payments[] requires property "paymentForm"/"paymentMethod" | Nombres de campo correctos para forma/método de pago |

## Nómina Electrónica — investigación Fase 5 (2026-09-23)

Confirmado en vivo contra el sandbox real (empresa asociada NIT 900559088,
`COMPANY_ID = 01M1ESGJ04WNQT8MAW9NVV6Z67`) más el schema OpenAPI crudo leído
por `curl` directo a `https://e-provider-docs.alegra.com/reference/*.md`
(la página renderizada/resumida por un summarizer omite datos reales —
mismo hallazgo que ya forzó leer el OpenAPI crudo para Documento Soporte).

**Endpoints reales** (ninguno documentado con su path exacto en la doc
renderizada, solo en el OpenAPI embebido):
- `POST /payrolls` — emitir. `POST /payrolls/{id}/replace` — ajustar/reemplazar
  (requiere `prefix`+`number`+`governmentData` completos, más
  `governmentData.Novedad.CUNENov` con el CUNE del documento original).
  `POST /payrolls/{id}/cancel` — anular (body `{"prefix", "number"}` **de la
  anulación misma, numeración propia independiente del payroll anulado** —
  confirmado: `number` debe ser `number` JSON, NO string, pese a que el
  schema OpenAPI dice `"type": "string"`). `GET /payrolls/{id}` — consultar.
- **No usa resolución DIAN con rango** (a diferencia de Factura/Documento
  Soporte) — solo exige el test-set `type="payrolls"` (mismo mecanismo ya
  usado para facturas). Para la empresa de pruebas ya estaba `ACCEPTED` de
  antes.

**Respuesta real de `POST /payrolls` (201)** — igual que Factura/Documento
Soporte, viene envuelta y trae legalStatus inline (la propiedad del schema
OpenAPI se llama `emission` pero el body real usa la clave `payroll`, mismo
patrón de discrepancia doc-vs-realidad ya visto con `company`/`testSet`):
```json
{
  "payroll": {
    "id": "...", "type": "PAYROLL", "cune": "...", "prefix": "NE", "number": 85373,
    "fullNumber": "NE85373", "status": "SENT",
    "xmlFileName": "...", "zipFileName": "...",
    "qrCodeContent": "NumNIE: ...\nCUNE: ...\nQRCode: https://catalogo-vpfe-hab.dian.gov.co/...",
    "signatureValue": "...",
    "governmentResponse": {"code": "00", "message": "Procesado Correctamente.", "errorMessages": []},
    "legalStatus": "ACCEPTED"
  },
  "files": {"xml": "<url S3 firmada, expira 1h>"}
}
```
- `files.xml` **sí viene** con URL firmada (a diferencia de lo que sugería el
  schema estático, que solo listaba `xmlFileName`/`zipFileName` como nombres)
  — mismo patrón que `get_invoice`/`get_support_document`, no persistir la
  URL. `GET /payrolls/{id}` devuelve exactamente el mismo shape con una URL
  firmada nueva.
- `qrCodeContent` y `signatureValue` (firma digital) **vienen ya listos en la
  respuesta JSON** — no hace falta extraerlos del XML como sí se hace con
  Factura (`extraer_firma_digital`).
- `status` (interno Alegra, no DIAN): `REGISTERED/WAITING_RESPONSE/FAILED/
  SENT/CANCELED/REPLACED`. `legalStatus` (DIAN): `ACCEPTED/
  ACCEPTED_WITH_OBSERVATIONS/REJECTED` — mismo enum y mismo criterio de
  mapeo que ya usa `map_government_response`.
- Anular un payroll `ACCEPTED` cambia su `status` a `CANCELED` (confirmado:
  se anuló el payroll `NE85373` de prueba, quedó `CANCELED`) y crea un
  documento `"cancellation"` aparte con su propio `id`/`cune`/`legalStatus`/
  `idReference` (apunta al `id` del payroll original).

**Campos requeridos reales que la doc estática no marcaba bien** (encontrados
por 400 reales, no por lectura de schema):
- `Trabajador.LugarTrabajoPais` es obligatorio en la práctica (el schema no
  lo listaba en `required`).
- `DevengadosTotal`/`DeduccionesTotal`/`ComprobanteTotal` van **directo bajo
  `governmentData`**, NO anidados dentro de `Devengados`/`Deducciones` (fácil
  de errar copiando la agrupación visual de la doc).

**Catálogos de nómina — valores reales sincronizados del sandbox**
(`GET /dian/<catalogo>`, mismo shape `{"table-name": [{"code","value"}]}` que
los 13 catálogos ya existentes; los 2 que solo estaban insinuados en el
índice `llms.txt` sí existen):
- `employee-types` (16 valores: 01 Dependiente, 02 Servicio doméstico, 04
  Madre comunitaria, 12/19 Aprendices SENA, 18 Funcionarios públicos, 21
  Estudiantes postgrado salud, 22 Profesor particular, 23 Estudiantes riesgos
  laborales, 30 Dependiente entidad pública régimen especial, 31 Cooperados,
  47 Dependiente SGP, 51 Tiempo parcial, 54/56 Pre-pensionados, 58
  Estudiantes prácticas públicas).
- `employee-sub-types` (solo 2: `00` No aplica, `01` Dependiente pensionado
  por vejez activo).
- `contract-types` (5: Término Fijo, Término Indefinido, Obra o Labor,
  Aprendizaje, Prácticas o Pasantías).
- `payroll-periods` (6: Semanal, Decenal, Catorcenal, Quincenal, Mensual,
  Otro).
- `extra-hour-types` (7, **con un campo `percentage` embebido en cada
  entrada** — confirma que el campo `Porcentaje` de cada bloque
  HED/HEN/HRN/etc del payload NO es una elección libre: cada bloque tiene un
  `enum` fijo de un solo valor en el schema (`HED`→`"1"`, `HEN`→`"2"`, etc.)
  que coincide con el `code` de esta tabla. El frontend no necesita selector
  de tipo de hora extra por fila, solo activar la sección correspondiente).
- `inability-types` (3: Común, Profesional, Laboral).
- **Pendiente de confirmar**: si `Pago.Forma`/`Pago.Metodo` de nómina
  reusan `formas_pago`/`metodos_pago` ya sincronizados (se usó `"1"`/`"10"`,
  los mismos códigos que Factura, y la DIAN aceptó sin objeción — indicio
  fuerte de que sí son el mismo catálogo, pero no se probó un código que
  solo exista en uno de los dos para confirmarlo al 100%).

Reproducible con `apps/api/scripts/explore_alegra_nomina.py`.

## Reproducibilidad

`apps/api/scripts/explore_alegra.py` reproduce todo lo anterior contra el sandbox
real (usa el token de `apps/api/.env`). Genera una empresa de prueba nueva cada vez
que corre (NIT aleatorio con DV válido), así que es seguro re-ejecutarlo.

`apps/api/scripts/explore_alegra_support_document.py` y
`apps/api/scripts/explore_alegra_receiver_events.py` reproducen las
investigaciones de Documento Soporte y Eventos del Receptor de la sección de
arriba — ambos seguros de re-ejecutar (el primero nunca pasa de un 400 de
validación de schema hoy; el segundo genera un `number` fijo cada corrida,
pero Alegra no bloqueó reintentos en las pruebas hechas).
