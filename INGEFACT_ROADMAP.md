# 📋 INGEFACT - ROADMAP COMPLETO

**Fecha de Creación:** 28 de Agosto 2024
**Versión:** 1.1 — replanteada 28 de Agosto 2026
**Estado:** Sprint 0 en ejecución

## 🔄 Nota de replanteo (28 Ago 2026)

Este roadmap se escribió asumiendo que todo se construye desde cero. En la práctica, antes de este replanteo ya existía una implementación funcional sobre **Supabase** (Postgres + Auth + Edge Functions + RLS multi-tenant) con varias pantallas de `apps/admin` y `apps/user` haciendo CRUD real. Se decidió reemplazar el backend por **FastAPI + PostgreSQL propio** (Sprint 0 en adelante), pero **no se descarta el frontend ya construido** — `apps/admin` y `apps/user` se mantienen y se rewirean para hablar con el nuevo backend en vez de Supabase. `supabase/` queda intacta solo como referencia del modelo de datos ya pensado.

Esto cambia el alcance real de varios sprints (ver nota de estado al inicio de cada uno):

- **Sprint 2 y 3** (Empresas, Usuarios admin, Tablas de Referencia): la UI de estas 3 pantallas **ya existe y funciona** en `apps/admin` (contra Supabase). El trabajo pendiente es construir los endpoints FastAPI equivalentes y cambiar la capa de datos (`@ingefact/core-api`) de llamadas Supabase a llamadas HTTP al nuevo backend — no es UI nueva. El Dashboard admin (KPIs) sí es trabajo nuevo, sigue como stub hardcodeado.
- **Sprint 4** (User Auth + Dashboard): el login ya existe (sobre Supabase Auth), hay que reconstruirlo con JWT propio (sale de Sprint 1). El Dashboard sigue siendo stub, es trabajo nuevo.
- **Sprint 5** (Configuración): la sub-pantalla "Impuestos" ya existe y funciona (solo falta backend+rewire). "Datos de Empresa" y "Resolución DIAN" **no existen todavía** — son trabajo nuevo real, con la pieza importante del consecutivo interno con control de concurrencia.
- **Sprint 6 y 7** (Clientes, Catálogo): ya existen y funcionan en `apps/user` (contra Supabase). Pendiente: backend FastAPI + rewire, y de paso cerrar un gap real encontrado (los botones "Editar" de Clientes/Productos/Impuestos están en el UI pero sin `onClick` wireado).
- **Sprint 8 (Facturación) y Sprint 9 (Notas crédito/débito)**: sin cambios — no existe nada construido todavía, siguen siendo el trabajo más grande y crítico del roadmap.
- El link "Facturas" del Sidebar de `apps/user` ya existe visualmente pero apunta a una ruta que no está registrada (redirige al Dashboard) — se resuelve naturalmente al construir Sprint 8.

---

## 🎯 VISIÓN DEL PROYECTO

**Ingefact** es un SaaS de facturación electrónica en Colombia accesible, rápido y práctico para dar cumplimiento a la DIAN.

### Objetivos de Negocio
- MVP en 5 meses (~20 semanas)
- 50 clientes en 6 meses
- 200 clientes en 1 año
- Escalabilidad multi-tenant
- Integraciones futuras con otros sistemas

### Stack Tecnológico
- **Backend:** FastAPI + Python
- **Base de Datos:** PostgreSQL
- **Frontend Admin:** React/TypeScript (apps/admin)
- **Frontend User:** React/TypeScript (apps/user)
- **Proveedor Electrónico:** Alegra/Alanube
- **Arquitectura:** Clean Architecture + SOLID

---

## 🏢 ESTRUCTURA DEL PROYECTO

```
ingefact/
├── apps/
│   ├── admin/                    # App administrativa (crear empresas, planes, usuarios)
│   │   ├── src/
│   │   └── package.json
│   ├── user/                     # App para tenants (facturación, config, terceros)
│   │   ├── src/
│   │   └── package.json
│   ├── api/                      # Backend FastAPI
│   │   ├── src/
│   │   │   ├── core/            # Config, security, dependencies
│   │   │   ├── domain/          # Models, schemas (Pydantic)
│   │   │   ├── application/     # Services, business logic
│   │   │   ├── infrastructure/  # Database, repositories
│   │   │   ├── presentation/    # Routes, controllers
│   │   │   └── main.py
│   │   ├── requirements.txt
│   │   └── .env.example
│   └── landing/                  # Landing page (Next.js)
│       ├── src/
│       └── package.json
├── packages/
│   └── shared/                   # Tipos compartidos (TS)
│       ├── types/
│       └── utils/
├── docker-compose.yml
└── package.json (root monorepo)
```

---

## 🔌 INTEGRACIÓN ALEGRA - PUNTOS CLAVE

### Autenticación
- **Método:** Bearer Token (Header Authorization)
- **Alcance:** Un token para tu empresa "principal"
- **Empresas creadas:** Son "asociadas" al token principal

### Flujo Crítico
```
1. Tu Admin crea empresa (nombre, RUT, DV)
   ↓
2. Backend llama: POST /companies (Alegra)
   Alegra retorna: company_id
   ↓
3. En SANDBOX: Llama createtestset (Government ID fijo)
   En PRODUCCIÓN: Empresa se habilita en DIAN primero
   ↓
4. Guarda credenciales Alegra (ENCRIPTADAS en BD)
   ↓
5. Tenant logea y puede facturar inmediatamente
   ↓
6. Cuando factura: POST /invoices (Alegra)
   Alegra genera XML, envía DIAN
   Retorna: invoice_id + estado inicial
   ↓
7. Webhook notifica cuando DIAN responde (CUFE o error)
   Tu API actualiza estado factura
```

### Webhooks Configurados
```json
{
  "webhooks": {
    "general": {
      "governmentStatusChanged": {
        "url": "https://tuapi.com/webhooks/alegra/general",
        "status": "active"
      }
    },
    "invoices": {
      "emissionFinished": {
        "url": "https://tuapi.com/webhooks/alegra/invoices",
        "status": "active"
      }
    }
  }
}
```

### Documentos Soportados (MVP)
- ✅ Facturas Electrónicas (FE)
- ✅ Notas Débito (ND)
- ✅ Notas Crédito (NC)
- ⏸️ Nóminas (futuro)
- ⏸️ Documentos Soporte (futuro)

### Errores Comunes a Validar
- RUT con formato incorrecto
- Dígito de verificación (DV) inválido
- Razón social no proporcionada
- Resolución no existe o está vencida
- Cliente sin documento identificatorio
- Impuesto no válido para tipo de cliente
- Consecutivo fuera de rango de resolución

---

## 👥 MÓDULOS POR APP

### APP ADMIN (Gestión Interna)
```
📊 Dashboard
   - Estadísticas: empresas, facturación, ingresos
   - Control general del sistema

🏢 Empresas
   - Crear empresa (auto-crea en Alegra)
   - Activar/desactivar empresas
   - Ver estado en Alegra
   - Gestionar planes

👥 Usuarios
   - CRUD usuarios admin
   - Roles y permisos
   - Resetear contraseñas

📋 Tablas de Referencia
   - Tipos de documento (DIAN)
   - Códigos de impuestos
   - Unidades de medida
   - Ciudades/departamentos
```

### APP USER (Para Tenants)
```
⚙️ Configuración
   - Datos empresa (RUT, razón social)
   - Impuestos aplicables
   - Resolución (número, rango, fechas)
   - Logo empresa

👥 Terceros
   - Gestión de clientes (MVP)
   - Búsqueda por documento
   - Datos de contacto

📦 Catálogo
   - Productos/servicios
   - Precios unitarios
   - Búsqueda rápida

📄 Documentos
   - Crear facturas (interfaz rápida)
   - Listar facturas
   - Ver estado (borrador, enviada, aceptada, rechazada)
   - Ver CUFE (si aceptada)
   - Notas débito/crédito
   - Re-enviar si falla
   - Anular documento

📊 Dashboard
   - Métricas: # facturas mes, últimas transacciones
   - Accesos directos a modelos principales
   - Estado resolución
```

---

## 📅 ROADMAP DETALLADO DE SPRINTS

### **SPRINT 0: Setup + Investigación Alegra (1.5 semanas)**

**Objetivo:** Backend corriendo + Alegra completamente entendido

#### Tareas

**PARTE A: Infraestructura (5-7 horas)**
- [ ] Crear estructura FastAPI base
- [ ] Configurar PostgreSQL
- [ ] Setup Docker (docker-compose.yml)
- [ ] Variables de entorno (.env.example)
- [ ] Monorepo setup (pyproject.toml, requirements.txt)
- [ ] Logging configurado
- [ ] Primer commit: "chore: project initialization"

**PARTE B: Investigación Alegra (12-18 horas) ⭐ CRÍTICO**
- [ ] Estudiar endpoints Alegra:
  - `POST /companies` → crear empresa
  - `POST /companies/{id}/test-sets` → habilitar en sandbox
  - `POST /invoices` → crear factura
  - `GET /resolutions` → consultar rangos de numeración
- [ ] Probar en Postman:
  - Crear empresa de prueba
  - Crear test set (sandbox)
  - Intentar crear factura
  - Analizar respuestas y errores
- [ ] Documentar:
  - JSON requerido para cada endpoint
  - Campos obligatorios vs opcionales
  - Estructura de errores Alegra
  - Estados de factura en Alegra
- [ ] Crear Postman collection con ejemplos
- [ ] Entender completamente:
  - Qué es "dv" (dígito de verificación)
  - Conceptos de "empresa principal" vs "asociada"
  - Webhooks y cómo funcionan
  - Diferencias sandbox vs producción

**PARTE C: Esquema BD Base (3-5 horas)**
- [ ] Modelo Empresa (ID Alegra, RUT, razón social, estado)
- [ ] Modelo AlegraCredentials (encriptadas)
- [ ] Modelo CompanyStatus (trackear estado en Alegra)
- [ ] Tabla de usuarios admin
- [ ] Tabla de planes
- [ ] Migrations setup (Alembic)

#### Criterios de Aceptación
- ✅ Backend corriendo en localhost:8000
- ✅ PostgreSQL conectando correctamente
- ✅ Postman collection con 10+ ejemplos Alegra
- ✅ Documentación de flujo Alegra guardada
- ✅ Esquema BD modelado
- ✅ Primer endpoint GET / respondiendo

#### Commits Esperados
```
chore: project initialization - FastAPI + PostgreSQL
feat: alegra api investigation and postman collection
feat: database schema initial models
```

---

### **SPRINT 1: Autenticación + Integración Core Alegra (3 semanas)**

**Objetivo:** Crear empresa en admin → se crea automáticamente en Alegra

#### Tareas

**PARTE A: Sistema JWT Auth (12-15 horas)**
- [ ] Implementar JWT (PyJWT)
- [ ] Access tokens (15 min expiry)
- [ ] Refresh tokens (7 días)
- [ ] Password hashing (bcrypt)
- [ ] Endpoints POST /auth/login, POST /auth/refresh, POST /auth/logout
- [ ] Middleware de autenticación
- [ ] Tests unitarios para auth
- [ ] Manejo de contraseña olvidada (básico)

**PARTE B: Servicio CreateEmpresaAlegra (25-35 horas) ⭐⭐⭐**

*Paso 1: Validaciones Locales (5-8 horas)*
- [ ] Validar formato RUT (8-10 dígitos)
- [ ] Validar DV (dígito de verificación correcto)
- [ ] Validar razón social (no vacío, max 200 chars)
- [ ] Validar email (formato válido)
- [ ] Validar RUT no duplicado en BD
- [ ] Pydantic schema con validaciones automáticas

*Paso 2: Llamar Alegra createcompany (8-12 horas)*
```python
# Servicio AlegraCompanyService
class CreateCompanyRequest:
    name: str
    identification: str (RUT)
    dv: str
    useAlegraCertificate: bool = True
    webhooks: dict

# Si OK: retorna company_id
# Si falla: mapear error Alegra a mensaje claro
```

Errores a manejar:
- RUT ya existe en Alegra
- Formato de datos incorrecto
- Timeout/unavailable
- Otros errores API

*Paso 3: En SANDBOX - Crear Test Set (5-8 horas)*
- [ ] Detectar si es sandbox vs producción (ENV var)
- [ ] Si sandbox: llamar createtestset automáticamente
- [ ] Government ID fixture: "a70562e0-631e-4ceb-aa65-36887b57dc17"
- [ ] Si falla: loguear pero no bloquear

*Paso 4: Guardar Credenciales Encriptadas (5-8 horas)*
- [ ] Implementar encriptación (cryptography library)
- [ ] Clave maestra desde ENV
- [ ] Tabla AlegraCredentials
- [ ] NUNCA loguear credenciales planas
- [ ] NUNCA retornarlas en respuestas

*Paso 5: Retry Logic (3-5 horas)*
- [ ] Backoff exponencial (1s, 2s, 4s, 8s, 16s)
- [ ] Max 5 reintentos
- [ ] Queue para reintentos manuales
- [ ] Log de cada intento

**PARTE C: Webhook Receiver (8-12 horas)**
- [ ] Endpoint POST /api/v1/webhooks/alegra/general
- [ ] Endpoint POST /api/v1/webhooks/alegra/invoices
- [ ] Validar firma Alegra (si aplica)
- [ ] Parsear eventos:
  - `general.governmentStatusChanged` → actualizar estado empresa
  - `invoices.emissionFinished` → actualizar factura (CUFE, estado)
- [ ] Manejo de errores
- [ ] Logging detallado
- [ ] Idempotencia (mismo evento no procesar 2x)

**PARTE D: Mapeo de Errores Alegra (5-8 horas)**
```python
ERROR_MAP = {
    "DUPLICATE_RUT": "RUT ya existe",
    "INVALID_DV": "Dígito de verificación incorrecto",
    "MISSING_FIELD": "Campo obligatorio faltante: {field}",
    "RESOLUTION_NOT_FOUND": "Resolución no encontrada",
    "TIMEOUT": "Alegra no responde, reintentando...",
    ...
}
```

#### Criterios de Aceptación
- ✅ Login admin funciona
- ✅ JWT genera y refresca correctamente
- ✅ Crear empresa en admin → se crea en Alegra (sandbox)
- ✅ Credenciales Alegra guardadas y encriptadas
- ✅ Test set creado automáticamente (sandbox)
- ✅ Webhooks reciben notificaciones
- ✅ Errores Alegra mapeados a mensajes claros
- ✅ Retry logic funciona
- ✅ Tests unitarios e integración pasando

#### Commits Esperados
```
feat: JWT authentication system
feat: alegra company creation service with validation
feat: webhook receiver for alegra events
feat: error mapping and retry logic
test: auth and alegra service tests
```

---

### **SPRINT 2: Admin - Gestión Empresas + Planes (2 semanas)**

> ⚠️ **Replanteado:** la UI de Empresas ya existe y funciona en `apps/admin` (contra Supabase: list/create/edit, plan como campo del modal, botón "Sincronizar Alegra"). Alcance real restante: construir los endpoints FastAPI equivalentes + rewire de `@ingefact/core-api`. El Dashboard con KPIs reales sigue siendo trabajo nuevo (hoy hardcodeado en 0).

**Objetivo:** Admin puede ver, crear, gestionar empresas y activar planes

#### Tareas

- [ ] Endpoint GET /api/v1/admin/empresas (listado con filtros)
- [ ] Endpoint GET /api/v1/admin/empresas/{id} (detalle)
- [ ] Endpoint POST /api/v1/admin/empresas (crear - usa Sprint 1)
- [ ] Endpoint PATCH /api/v1/admin/empresas/{id}/plan (cambiar plan)
- [ ] Endpoint POST /api/v1/admin/empresas/{id}/retry-creation (reintentar si falla)
- [ ] Dashboard admin:
  - Total empresas
  - Empresas activas vs inactivas
  - Revenue proyectado
  - Últimas empresas creadas
  - Empresas con error en Alegra
- [ ] Filtros: por estado, por plan, por fecha

#### Criterios de Aceptación
- ✅ Listar empresas funciona
- ✅ Crear empresa desde admin funciona
- ✅ Cambiar plan funciona
- ✅ Dashboard muestra métricas correctas
- ✅ Admin ve status de Alegra

---

### **SPRINT 3: Admin - Usuarios + Tablas Referencia (1.5 semanas)**

> ⚠️ **Replanteado:** ambas pantallas ya existen y funcionan en `apps/admin` (CRUD usuarios admin, 13 tablas DIAN con sync desde Alegra). Alcance real restante: endpoints FastAPI equivalentes + rewire de `@ingefact/core-api`, no UI nueva.

**Objetivo:** Gestionar usuarios admin y cargar tablas DIAN

#### Tareas

- [ ] CRUD usuarios admin (crear, editar, desactivar)
- [ ] Roles: admin, lector
- [ ] Permisos básicos
- [ ] Reset de contraseña
- [ ] Tablas de referencia:
  - Tipos de documento (31=NIT, 13=CC, etc)
  - Códigos de impuesto (01=IVA, etc)
  - Unidades de medida (94=Unidad, etc)
  - Ciudades/departamentos (05001=Bogotá, etc)
- [ ] Endpoint público GET /api/v1/public/reference-tables/{type}
- [ ] Load inicial de tablas (SQL script o migraciones)

#### Criterios de Aceptación
- ✅ CRUD usuarios funciona
- ✅ Tablas DIAN cargadas
- ✅ User-app puede consultar tablas

---

### **SPRINT 4: User App - Auth + Dashboard (1.5 semanas)**

> ⚠️ **Replanteado:** login ya existe en `apps/user` (sobre Supabase Auth) — se reconstruye con JWT propio (sale de Sprint 1) + rewire. El Dashboard es stub (KPIs hardcodeados, comentario "luego conectaremos la cuota") — sigue siendo trabajo nuevo real.

**Objetivo:** Tenant logea y ve dashboard inicial

#### Tareas

- [ ] Auth para tenants (usa empresa_id + usuario/pass)
- [ ] Dashboard inicial:
  - Métricas: # facturas este mes
  - Últimas facturas emitidas
  - Estado de resolución
  - Accesos directos a módulos
- [ ] Verificar conexión a Alegra (empresa existe allá)
- [ ] Mostrar si empresa está en prueba (sandbox) o producción
- [ ] Menú navegación (elementos deshabilitados si falta config)

#### Criterios de Aceptación
- ✅ Tenant logea
- ✅ Dashboard carga
- ✅ Métricas se calculan correctamente
- ✅ Navegación funciona

---

### **SPRINT 5: User App - Configuración (1.5 semanas)**

> ⚠️ **Replanteado:** "Impuestos" ya existe y funciona (solo backend+rewire). "Datos de Empresa" y "Resolución DIAN" **no existen** — son trabajo nuevo completo (UI + backend), incluyendo el consecutivo interno con control de concurrencia descrito abajo.

**Objetivo:** Tenant configura empresa y resolución

#### Tareas

- [ ] Pantalla de configuración:
  - Datos empresa (RUT, razón social, email, teléfono, dirección)
  - Impuestos aplicables (IVA porcentaje, otros)
  - Logo empresa (upload)
  - Responsable IVA sí/no
- [ ] Gestión de resolución:
  - En SANDBOX: mostrar resolución de prueba (preconfigurada)
  - En PRODUCCIÓN: formulario para cargar resolución:
    - Número de resolución
    - Año
    - Prefijo
    - Rango mínimo
    - Rango máximo
    - Fecha inicio
    - Fecha fin
    - Technical key
- [ ] Validar resolución ante Alegra (GET /resolutions)
- [ ] Verificar resolución vigente (fecha fin > hoy)
- [ ] Indicar cuándo está a punto de vencer

#### Criterios de Aceptación
- ✅ Config empresa se guarda
- ✅ Resolución validada
- ✅ Indicadores de estado resolución

---

### **SPRINT 6: User App - Terceros/Clientes (1.5 semanas)**

> ⚠️ **Replanteado:** ya existe y funciona en `apps/user` (list/create). Alcance real restante: endpoints FastAPI + rewire, y wirear el botón "Editar" (hoy sin `onClick`).

**Objetivo:** Gestión de clientes (MVP)

#### Tareas

- [ ] Modelo Tercero (cliente, proveedor, empleado - pero MVP solo cliente)
- [ ] Endpoint POST /api/v1/terceros (crear cliente)
- [ ] Endpoint GET /api/v1/terceros (listado + búsqueda)
- [ ] Endpoint PATCH /api/v1/terceros/{id}
- [ ] Endpoint DELETE /api/v1/terceros/{id}
- [ ] Validaciones:
  - Tipo de documento válido (según tabla referencia)
  - Documento único por tenant
  - Nombre requerido
  - Email válido (opcional pero validar formato)
  - Teléfono (opcional)
  - Dirección (opcional)
- [ ] Búsqueda rápida (por nombre o documento)
- [ ] Indicador "Responsable IVA" por cliente

#### Criterios de Aceptación
- ✅ CRUD clientes funciona
- ✅ Búsqueda es rápida
- ✅ Validaciones funcionan

---

### **SPRINT 7: User App - Catálogo (1 semana)**

> ⚠️ **Replanteado:** ya existe y funciona en `apps/user` (list/create). Alcance real restante: endpoints FastAPI + rewire, y wirear el botón "Editar" (hoy sin `onClick`).

**Objetivo:** Gestión de productos/servicios

#### Tareas

- [ ] Modelo Item (producto/servicio)
- [ ] Endpoint POST /api/v1/items
- [ ] Endpoint GET /api/v1/items (listado + búsqueda)
- [ ] Endpoint PATCH /api/v1/items/{id}
- [ ] Endpoint DELETE /api/v1/items/{id}
- [ ] Campos:
  - Código (opcional)
  - Descripción (requerida)
  - Precio unitario (requerido)
  - Tipo (producto/servicio)
  - Impuesto aplicable (default IVA)
- [ ] Búsqueda por descripción

#### Criterios de Aceptación
- ✅ CRUD items funciona
- ✅ Búsqueda rápida

---

### **SPRINT 8: Facturación Core + Alegra Integration (4 semanas)** ⭐⭐⭐

**Objetivo:** Crear y enviar facturas a DIAN en tiempo real

#### Tareas

**PARTE A: Modelo de Factura (8-10 horas)**
- [ ] Modelo Factura:
  - ID único (UUID)
  - Empresa (FK)
  - Cliente (FK)
  - Fecha
  - Número consecutivo (auto-increment)
  - Estados: BORRADOR, ENVIADA, ACEPTADA, RECHAZADA, ANULADA
  - Subtotal
  - Total impuestos
  - Total
  - CUFE (si aceptada)
  - Razón rechazo (si rechazada)
  - Timestamps (created, updated)
  - Referencia Alegra ID
- [ ] Modelo LíneaFactura:
  - Factura (FK)
  - Item (FK)
  - Cantidad
  - Precio unitario
  - Subtotal
  - Impuestos (lista)
  - Total línea

**PARTE B: Validaciones DIAN (10-15 horas)**

Antes de enviar a Alegra, validar:

```
✅ Cliente:
   - Existe
   - Tiene documento
   - Documento válido formato
   
✅ Items:
   - Existen
   - Tienen precio > 0
   
✅ Resolución:
   - Existe
   - No está vencida (endDate > hoy)
   - Próximo consecutivo está dentro del rango
   
✅ Impuestos:
   - Si cliente NO responsable IVA → no puede llevar IVA
   - Si cliente SÍ responsable IVA → puede llevar IVA
   - Porcentajes válidos según tabla DIAN
   
✅ Totales:
   - Subtotal = sum(líneas.subtotal)
   - Total impuestos = sum(líneas.impuestos)
   - Total = subtotal + impuestos
   - Cálculos correctos (redondeo a 2 decimales)
   
✅ Otros:
   - Consecutivo no duplicado
   - Consecutivo < maxNumber
   - Fecha es hoy o anterior
```

**PARTE C: Envío a Alegra (20-25 horas) ⭐ MÁS IMPORTANTE**

Flujo detallado:

1. Endpoint POST /api/v1/documentos/facturas/enviar
   ```python
   {
     "factura_id": "uuid",
     "cliente_id": "uuid"
   }
   ```

2. Validar factura (ver PARTE B)
   - Si falla: retornar error específico

3. Construir payload Alegra:
   ```python
   payload = {
     "resolution": {
       "resolutionNumber": "18760000001",
       "prefix": "SETP",
       "minNumber": 990000000,
       "maxNumber": 995000000,
       "startDate": "2019-01-19",
       "endDate": "2030-01-19",
       "technicalKey": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c"
     },
     "company": {
       "id": "<ID_ALEGRA>",
       "organizationType": 1,
       "identificationType": "31",
       "identificationNumber": "<RUT>",
       "dv": "<DV>",
       "name": "<RAZÓN_SOCIAL>",
       "regimeCode": "R-99-PN",
       "email": "<EMAIL>",
       "address": {...}
     },
     "invoice": {
       "date": "2024-01-15",
       "number": "000001",
       "currency": "COP",
       "customer": {
         "identificationType": "13",
         "identificationNumber": "<DOC_CLIENTE>",
         "name": "<NOMBRE>",
         "email": "<EMAIL>",
         "address": {...}
       },
       "items": [
         {
           "description": "Producto X",
           "quantity": 1,
           "price": 100000,
           "taxes": [
             {
               "type": "01",
               "percentage": 19,
               "amount": 19000
             }
           ]
         }
       ],
       "totalTaxes": 19000,
       "totalAmount": 119000
     }
   }
   ```

4. POST /invoices a Alegra
   - Usar credenciales Alegra (desencriptadas)
   - Bearer token en header
   - Capturar response: `invoice_id`, `status`

5. Guardar estado local:
   - Factura.status = "ENVIADA"
   - Factura.alegra_invoice_id = <response.invoice_id>
   - Factura.updated_at = now()

6. Respuesta al usuario:
   ```json
   {
     "status": "ENVIADA",
     "message": "Factura enviada a DIAN, esperando respuesta...",
     "factura_id": "uuid"
   }
   ```

7. Webhook espera respuesta de Alegra:
   ```
   Evento: invoices.emissionFinished
   {
     "company_id": "<ID>",
     "invoice_id": "<ID>",
     "status": "ACEPTADA" | "RECHAZADA",
     "cufe": "<CUFE>" (si aceptada),
     "reason": "<razón>" (si rechazada)
   }
   ```

8. Webhook procesa:
   ```python
   factura = Factura.get(alegra_invoice_id=event.invoice_id)
   if event.status == "ACEPTADA":
     factura.status = "ACEPTADA"
     factura.cufe = event.cufe
   else:
     factura.status = "RECHAZADA"
     factura.razon_rechazo = event.reason
   factura.save()
   ```

**PARTE D: UI - Crear Factura Rápidamente (12-15 horas)**

Interfaz intuitiva:
```
Crear Factura
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cliente: [Buscar/Seleccionar] ← búsqueda rápida
Fecha: [Hoy]

Líneas:
  Descripción    Cantidad    Precio Unit    Total    Impuesto
  [Item Search]    [1]         [valor]       [auto]   [IVA 19%]
  [+ Agregar]

Resumen:
  Subtotal:  $100,000
  IVA (19%):  $19,000
  TOTAL:     $119,000

[Guardar Borrador] [Enviar a DIAN]
```

Validaciones en tiempo real:
- ❌ Cliente requerido
- ❌ Al menos 1 línea
- ❌ Totales incorrectos (alerta)
- ✅ Todo OK → botón "Enviar" activo

**PARTE E: Transiciones de Estado (5-8 horas)**
```
BORRADOR ─→ puede editar/eliminar
   ↓ (enviar)
ENVIADA ─→ esperando DIAN (no editar)
   ↓ (webhook responde)
   ├─→ ACEPTADA ✅ (mostrar CUFE)
   └─→ RECHAZADA ❌ (mostrar razón, opción re-enviar)

ACEPTADA ─→ puede anular
   ↓ (crear nota crédito)
   └─→ PARCIALMENTE_ANULADA (si nota crédito)
```

**PARTE F: Retries & Error Handling (5-8 horas)**
- [ ] Si timeout enviando a Alegra:
  - Guardar en queue
  - Reintentar cada 5 min (max 12 veces = 1 hora)
  - Notificar usuario si persiste
  
- [ ] Manejo de errores específicos:
  - "RESOLUTION_OUT_OF_RANGE" → usuario debe actualizar resolución
  - "CUSTOMER_NOT_FOUND" → usuario debe crear cliente primero
  - "INVALID_TAX" → usuario debe revisar configuración impuestos
  - "TEMPORARY_ERROR" → reintentar automático

- [ ] Logging completo:
  - Qué se envió a Alegra
  - Respuesta de Alegra
  - Errores y timestamps
  - ID de correlación (para debugging)

**PARTE G: Listar Facturas (5-8 horas)**
- [ ] GET /api/v1/documentos/facturas (listado)
  - Paginación
  - Filtros: por estado, por cliente, por fecha, por rango
  - Búsqueda: por número o cliente
  - Ordenar: por fecha, por número
  
- [ ] GET /api/v1/documentos/facturas/{id} (detalle)
  - Datos completos
  - Líneas
  - Estado
  - CUFE (si aceptada)
  - Razón rechazo (si rechazada)

#### Criterios de Aceptación
- ✅ Crear factura en <2 segundos
- ✅ Validaciones DIAN funcionan correctamente
- ✅ Envío a Alegra funciona
- ✅ Webhook recibe y procesa respuesta
- ✅ Estado factura se actualiza correctamente
- ✅ Errores mapeados a mensajes claros
- ✅ UI es intuitiva y rápida
- ✅ Totales calculan correctamente
- ✅ Impuestos se aplican según cliente
- ✅ Tests E2E: login → crear cliente → crear factura → enviar → recibir CUFE

#### Commits Esperados
```
feat: invoice model and database schema
feat: invoice validation and business rules
feat: alegra invoice creation service
feat: invoice webhook receiver
feat: invoice creation UI
feat: invoice listing and filtering
test: invoice creation and validation tests
test: alegra integration end-to-end
```

---

### **SPRINT 9: Notas Débito/Crédito (1.5 semanas)**

**Objetivo:** Crear ajustes a facturas ya emitidas

#### Tareas

- [ ] Modelo Nota:
  - Tipo: DÉBITO | CRÉDITO
  - Factura original (FK)
  - Referencia a factura
  - Motivo del ajuste
  - Líneas de ajuste (parcial o total)
  - Misma lógica de envío a Alegra

- [ ] Validaciones:
  - Factura original debe estar ACEPTADA
  - No puede haber nota si factura es RECHAZADA
  - Monto de nota no puede superar factura original

- [ ] Envío a Alegra:
  - POST /credit-notes o /debit-notes
  - Webhook para respuesta

- [ ] UI:
  - Desde vista de factura: botón "Crear Nota"
  - Seleccionar líneas a ajustar
  - Indicar motivo
  - Enviar a DIAN

#### Criterios de Aceptación
- ✅ Crear nota débito/crédito funciona
- ✅ Validaciones correctas
- ✅ Envío a Alegra funciona
- ✅ Estados se actualizan con webhook

---

### **SPRINT 10: Testing + Polish (2 semanas)**

**Objetivo:** Sistema robusto y listo para producción

#### Tareas

- [ ] Tests E2E:
  - Flow completo: admin login → crear empresa → tenant login → crear cliente → crear factura → enviar DIAN
  - Validación de datos en Alegra
  - Recepción de webhook
  - Actualización de estado

- [ ] Tests de Validación DIAN:
  - Cliente sin documento → error
  - Resolución vencida → error
  - Consecutivo fuera de rango → error
  - Impuesto no válido para cliente → error
  - Totales incorrectos → error

- [ ] Performance:
  - Facturación < 1 segundo
  - Búsqueda de clientes < 500ms
  - Listar facturas con 1000+ registros (paginación)

- [ ] Error Scenarios:
  - Alegra timeout → manejo correcto
  - Webhook falla → manejo correcto
  - DIAN rechaza → mensaje claro
  - Conexión BD perdida → error graceful

- [ ] UI/UX Polish:
  - Formularios validación en tiempo real
  - Loading states claros
  - Mensajes de error descriptivos
  - Confirmaciones de acciones peligrosas
  - Responsive design (mobile)

- [ ] Security:
  - Credenciales nunca loguean
  - Multi-tenancy isolation verificado
  - SQL injection imposible
  - XSS imposible
  - CSRF tokens en formas

- [ ] Documentation:
  - API docs (Swagger/OpenAPI automático de FastAPI)
  - Guía de usuario (tenant)
  - Guía de admin
  - Troubleshooting

#### Criterios de Aceptación
- ✅ Todos los tests pasan
- ✅ Performance cumple objetivos
- ✅ Cero errores en logs
- ✅ UI es pulida y profesional
- ✅ Documentación completa

---

### **SPRINT 11 (Paralelo): Landing Page (2 semanas)**

**Objetivo:** Página de promoción profesional

#### Tareas

- [ ] Stack: Next.js + TypeScript
- [ ] Páginas:
  - Inicio (hero, features, CTA)
  - Características
  - Precios
  - Instructivos/documentación
  - Contacto (WhatsApp link, email)

- [ ] Contenido:
  - Features principales (facturación rápida, cumplimiento DIAN, etc)
  - Planes (Free, Pro, Enterprise)
  - Precios
  - Testimonios (cuando haya)
  - FAQ

- [ ] Integración:
  - Botón "Registrarse" → redirige a admin app
  - WhatsApp link funcional
  - Email contact

#### Criterios de Aceptación
- ✅ Landing carga rápido (Lighthouse > 90)
- ✅ Mobile responsive
- ✅ SEO básico (meta tags, sitemap)
- ✅ Conversión clara (botón signup visible)

---

## 📊 TIMELINE TOTAL

```
Sprint 0:     1.5 semanas   → Semana 1-2    (Setup + Alegra research)
Sprint 1:     3 semanas     → Semana 2-5    (Auth + Create Company Alegra)
Sprint 2:     2 semanas     → Semana 5-7    (Admin Empresas)
Sprint 3:     1.5 semanas   → Semana 8      (Admin Usuarios + Tablas Ref)
Sprint 4:     1.5 semanas   → Semana 8-9    (User Auth + Dashboard)
Sprint 5:     1.5 semanas   → Semana 10     (User Configuración)
Sprint 6:     1.5 semanas   → Semana 11     (User Terceros)
Sprint 7:     1 semana      → Semana 12     (User Catálogo)
Sprint 8:     4 semanas     → Semana 13-17  (Facturación ⭐ CRÍTICO)
Sprint 9:     1.5 semanas   → Semana 18     (Notas Débito/Crédito)
Sprint 10:    2 semanas     → Semana 19-20  (Testing + Polish)
Landing:      2 semanas     → Paralelo (14-17)

✅ MVP LISTO EN: 20 SEMANAS (~5 MESES)
```

### Hitos Clave
- **Semana 5:** Auth y creación de empresa Alegra funcionando
- **Semana 12:** Módulos admin y user básicos listos
- **Semana 17:** ⭐ Facturación funcionando con Alegra
- **Semana 20:** MVP completo y testeable

---

## 🚨 PUNTOS CRÍTICOS A VIGILAR

### 1. DIAN Compliance ⭐⭐⭐
```
✅ Validar TODOS los campos según DIAN
✅ Estructura XML correcta (delegado a Alegra, pero validar payload)
✅ Impuestos según tipo cliente
✅ Consecutivos dentro de rango resolución
✅ Documentación SIEMPRE disponible
```

### 2. Integración Alegra 🔌
```
✅ Token guardado seguramente (encriptado)
✅ Credenciales NUNCA en logs
✅ Webhooks confiables (retry, idempotencia)
✅ Sandbox vs Producción diferenciados
✅ Manejo de errores Alegra específico
✅ Documentación de endpoints siempre a mano
```

### 3. Multi-Tenancy 👥
```
✅ Datos de empresa X NO accesibles desde empresa Y
✅ Consultas siempre filtran por tenant_id
✅ Tests de seguridad multi-tenant
```

### 4. Performance ⚡
```
✅ Facturación < 1 segundo
✅ Búsquedas optimizadas (índices en BD)
✅ Paginación en listados grandes
✅ Caching si aplica (tablas referencia)
```

### 5. Error Handling 🛡️
```
✅ Usuario ve mensajes claros
✅ Admin puede debuggear (logs detallados)
✅ Retry automático donde tenga sentido
✅ Fallback graceful en timeouts
```

---

## 📝 CONVENCIONES DE CÓDIGO

### Commits
```
feat: descripción breve
fix: corrección de bug
chore: setup, configuración
test: tests
docs: documentación
refactor: mejora de código
```

Ejemplo:
```
feat: alegra company creation service with validation
test: add unit tests for alegra company creation
docs: add alegra integration guide
```

### Estructura de Branch
```
main                    (producción)
├── develop            (staging)
│   ├── feat/alegra-integration
│   ├── feat/invoice-creation
│   └── fix/validation-bug
```

### Logging Niveles
```
DEBUG: detalles de negocio
INFO: eventos importantes (empresa creada, factura enviada)
WARNING: anomalías (retry #3, resolución a punto de vencer)
ERROR: errores recuperables
CRITICAL: errores no recuperables
```

### Seguridad
```
❌ NUNCA loguear: passwords, tokens, credenciales
✅ Encriptar: credenciales Alegra, datos sensibles
✅ Validar: TODOS los inputs
✅ Autorizar: verificar tenant_id en cada query
```

---

## 🎓 RECURSOS

### Dokumentación Oficial
- Alegra API: https://e-provider-docs.alegra.com/
- FastAPI: https://fastapi.tiangolo.com/
- PostgreSQL: https://www.postgresql.org/docs/
- React: https://react.dev/

### Procesos DIAN
- Habilitación Factura: https://e-provider-docs.alegra.com/docs/proceso-de-habilitación-en-la-dian
- Test Sets: https://e-provider-docs.alegra.com/docs/guía-creación-de-una-compañía-asociada

---

## ✅ CHECKLIST ANTES DE EMPEZAR SPRINT 0

- [ ] Acceso a Alegra sandbox confirmado
- [ ] Acceso a Alegra producción confirmado
- [ ] Token Alegra obtenido
- [ ] Ambiente local setup (Python 3.9+, PostgreSQL, Docker)
- [ ] Editor (VSCode + extensions Python, PostgreSQL)
- [ ] Postman o similar para testing API
- [ ] Git configurado
- [ ] Este documento guardado en proyecto

---

## 📞 CONTACTOS Y REFERENCIAS

**Alegra Support:**
- Email: support@alegra.com (desde documentación)
- Docs: https://e-provider-docs.alegra.com/

**DIAN:**
- Portal: https://www.dian.gov.co/
- Documentación factura electrónica: https://www.dian.gov.co/impuestos/factura-electronica

---

**Documento creado:** Agosto 28, 2024
**Próxima revisión:** Después de Sprint 0
**Estado:** 🟢 LISTO PARA COMENZAR

---
