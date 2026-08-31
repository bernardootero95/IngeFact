# 🎨 INGEFACT - DISEÑO DE VISTAS Y FLUJOS

**Fecha:** 28 de Agosto 2024
**Versión:** 1.0

---

## 📋 Tabla de Contenidos

1. [APP ADMIN - Vistas y Flujos](#app-admin---vistas-y-flujos)
2. [APP USER - Vistas y Flujos](#app-user---vistas-y-flujos)
3. [Componentes Compartidos](#componentes-compartidos)
4. [Flujos de Negocio](#flujos-de-negocio)
5. [Estados y Transiciones](#estados-y-transiciones)
6. [Consideraciones de UX/UI](#consideraciones-de-uxui)

---

# APP ADMIN - VISTAS Y FLUJOS

## 🔐 1. Login Admin

### Wireframe
```
┌─────────────────────────────────────┐
│                                     │
│    INGEFACT - Panel Administrativo  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Email:                        │  │
│  │ [___________________________]  │  │
│  │                               │  │
│  │ Contraseña:                   │  │
│  │ [___________________________]  │  │
│  │                               │  │
│  │  [Iniciar Sesión]             │  │
│  │  ¿Olvidó su contraseña?       │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Funcionalidad
- Email/Contraseña
- Validación de credenciales
- Recuperación de contraseña (email)
- Redirect a Dashboard si está autenticado

### Componentes React
```
LoginAdmin
├── FormLogin
│   ├── InputEmail
│   ├── InputPassword
│   ├── ButtonSubmit
│   └── LinkForgotPassword
└── AlertError (si falla autenticación)
```

---

## 📊 2. Dashboard Admin

### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT [Logo]        Dashboard      Usuario ▼  Salir      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Bienvenido, Admin                                           │
│                                                              │
│  ┌─ Estadísticas Generales ─────────────────────────────┐   │
│  │                                                        │   │
│  │  Total Empresas    Empresas Activas   Revenue Total  │   │
│  │       25                    20            $1.2M       │   │
│  │                                                        │   │
│  │  Nuevas Este Mes   Suscripciones      Tasa Retención │   │
│  │        3                   18              98%         │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Actividad Reciente ──────────────────────────────────┐   │
│  │                                                        │   │
│  │  Empresa          Acción            Fecha      Estado │   │
│  │  Tech Solutions   Creada            Hoy        ✅     │   │
│  │  Retail Inc       Plan Actualizado  Ayer       ✅     │   │
│  │  Services Co      Error en Alegra   Hace 2d    ⚠️     │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Accesos Directos ────────────────────────────────────┐   │
│  │                                                        │   │
│  │  [Crear Empresa]  [Gestionar Usuarios]  [Ver Todos]   │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Componentes React
```
DashboardAdmin
├── Header
│   ├── LogoInfgefact
│   ├── Nav (Empresas, Usuarios, Tablas Ref)
│   ├── UserDropdown
│   └── LogoutButton
├── StatisticsCards
│   ├── CardStat (Total Empresas)
│   ├── CardStat (Activas)
│   ├── CardStat (Revenue)
│   ├── CardStat (Nuevas)
│   ├── CardStat (Suscripciones)
│   └── CardStat (Retención)
├── RecentActivity
│   └── ActivityTable
└── QuickLinks
    ├── ButtonCreate
    ├── ButtonManage
    └── ButtonViewAll
```

---

## 🏢 3. Gestión de Empresas

### 3.1 Listar Empresas

#### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                                    Empresas         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Crear Empresa]  Filtrar: [Estado ▼] [Plan ▼] [Buscar..] │
│                                                              │
│  ┌─ Empresas ───────────────────────────────────────────┐   │
│  │                                                       │   │
│  │ Nombre           RUT        Plan      Estado    Acción│   │
│  │                                                       │   │
│  │ Tech Solutions   123456789  Premium   Activa   [•••] │   │
│  │ Retail Inc       987654321  Free      Activa   [•••] │   │
│  │ Services Co      456789123  Pro       Error    [•••] │   │
│  │ Commerce Ltd     789123456  Premium   Activa   [•••] │   │
│  │                                                       │   │
│  │ Mostrando 1-4 de 25  < 1 2 3 4 5 >                   │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Componentes React
```
ListEmpresasPage
├── Header
├── FilterBar
│   ├── InputSearch
│   ├── SelectEstado
│   └── SelectPlan
├── ButtonCreateEmpresa
├── CompaniesTable
│   ├── TableHeader
│   └── TableRows
│       ├── NameCell
│       ├── RutCell
│       ├── PlanCell
│       ├── StatusBadge
│       └── ActionMenu (edit, delete, retry)
└── Pagination
```

### 3.2 Crear Empresa

#### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                                 Crear Empresa      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Formulario: Nueva Empresa                                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Razón Social: *                                   │   │
│  │  [_____________________________________]           │   │
│  │  Ej: Tech Solutions S.A.S                         │   │
│  │                                                     │   │
│  │  RUT: *                                           │   │
│  │  [__________] - [__]                              │   │
│  │  Ej: 900123456 - 2                                │   │
│  │                                                     │   │
│  │  Dígito de Verificación: *                        │   │
│  │  [__]                                             │   │
│  │  (validación automática)                          │   │
│  │                                                     │   │
│  │  Email: *                                         │   │
│  │  [_____________________________________]           │   │
│  │                                                     │   │
│  │  Teléfono:                                        │   │
│  │  [_____________________________________]           │   │
│  │                                                     │   │
│  │  Plan: *                                          │   │
│  │  [Free ▼]  [Pro]  [Premium]                      │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │ ☐ Usar certificado de Alegra (recomendado) │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  [Cancelar]  [Crear Empresa]                      │   │
│  │                                                     │   │
│  │  * Campos obligatorios                            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Estado: En progreso...                                      │
│  [████████░░░░] Creando empresa en Alegra...               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Validaciones en Tiempo Real
```
Razón Social:
  ✓ No vacío
  ✓ Max 200 caracteres

RUT:
  ✓ Formato: XXXXXXXXX-X
  ✓ 8-10 dígitos
  ✓ No duplicado en BD

DV (Dígito Verificación):
  ✓ Válido según algoritmo DIAN
  ✓ Validación automática
  
Email:
  ✓ Formato válido

Plan:
  ✓ Uno seleccionado
```

#### Componentes React
```
CreateEmpresaPage
├── FormCreateEmpresa
│   ├── InputRazonSocial (con validación)
│   ├── InputRut (con máscara)
│   ├── InputDv (auto-validado)
│   ├── InputEmail (validación)
│   ├── InputTelefono
│   ├── SelectPlan
│   ├── CheckboxAlegraCertificate
│   ├── ButtonCancelar
│   └── ButtonSubmit
├── ProgressBar (mientras se crea en Alegra)
└── AlertError/Success
```

### 3.3 Detalle Empresa

#### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                           Tech Solutions > Editar  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ← Volver a Empresas                                         │
│                                                              │
│  ┌─ Información General ─────────────────────────────────┐  │
│  │                                                       │  │
│  │  Razón Social: Tech Solutions S.A.S                  │  │
│  │  RUT: 900123456-2                                    │  │
│  │  Email: admin@techsolutions.com                      │  │
│  │  Teléfono: +57 1 234 5678                           │  │
│  │                                                       │  │
│  │  Estado en DIAN: ✅ Habilitada                        │  │
│  │  Ambiente: 🔒 Sandbox                                │  │
│  │  ID Alegra: 01FCYA9GSSNT2674KGJV2V0NS9             │  │
│  │  Fecha Creación: 2024-08-15                         │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Plan y Suscripción ──────────────────────────────────┐  │
│  │                                                       │  │
│  │  Plan Actual: Premium                               │  │
│  │  Valor: $99,000 / mes                               │  │
│  │  Facturación: Mensual                               │  │
│  │  Próximo Ciclo: 2024-09-15                          │  │
│  │  Estado: Activa ✅                                  │  │
│  │                                                       │  │
│  │  [Cambiar Plan]  [Ver Facturas]                     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Usuarios Tenants ────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Email                  Rol         Activo   Acción │  │
│  │  user1@techsol.com     Admin         ✅     [•••]  │  │
│  │  user2@techsol.com     Editor        ✅     [•••]  │  │
│  │                                                       │  │
│  │  [+ Agregar Usuario]                                │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Actividad Reciente ──────────────────────────────────┐  │
│  │                                                       │  │
│  │  Plan Actualizado a Premium        2024-08-15        │  │
│  │  Empresa Creada                    2024-08-14        │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Editar]  [Desactivar]  [Eliminar]                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Componentes React
```
DetailEmpresaPage
├── BreadcrumbNav
├── GeneralInfo
│   ├── InfoRow (Razón Social)
│   ├── InfoRow (RUT)
│   ├── StatusBadge (DIAN)
│   └── InfoRow (ID Alegra)
├── PlanSection
│   ├── PlanCard
│   ├── ButtonChangePlan
│   └── ButtonViewInvoices
├── UsersSection
│   ├── UsersList
│   └── ButtonAddUser
├── ActivityLog
│   └── ActivityItem[]
└── ActionButtons
    ├── ButtonEdit
    ├── ButtonDeactivate
    └── ButtonDelete
```

### 3.4 Cambiar Plan (Modal)

#### Wireframe
```
┌─────────────────────────────────────────────────────┐
│  Cambiar Plan                              ✕        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Empresa: Tech Solutions                           │
│  Plan Actual: Free                                 │
│                                                     │
│  Seleccionar Nuevo Plan:                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  ☐ Free                                    │  │
│  │     $0 / mes                               │  │
│  │     - Hasta 10 facturas/mes                │  │
│  │     - 1 usuario                            │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  ☑ Pro                                     │  │
│  │     $49,000 / mes                          │  │
│  │     - Facturas ilimitadas                  │  │
│  │     - 5 usuarios                           │  │
│  │     - Soporte prioritario                  │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  ☐ Premium                                 │  │
│  │     $99,000 / mes                          │  │
│  │     - Todo de Pro +                        │  │
│  │     - Reportes avanzados                   │  │
│  │     - 20 usuarios                          │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  Fecha de Cambio: 2024-09-15                      │
│                                                     │
│  [Cancelar]  [Confirmar Cambio]                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 👥 4. Gestión de Usuarios Admin

### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                               Usuarios Administrativos
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Crear Usuario]  Filtrar: [Rol ▼] [Búsqueda..]           │
│                                                              │
│  ┌─ Usuarios ───────────────────────────────────────────┐   │
│  │                                                       │   │
│  │ Nombre        Email               Rol        Activo │   │
│  │ Admin One     admin1@ingefact.com Admin      ✅     │   │
│  │ Admin Two     admin2@ingefact.com Admin      ✅     │   │
│  │ Lector Test   lector@ingefact.com Lector    ✅     │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Componentes React
```
AdminUsersPage
├── FilterBar
├── ButtonCreateUser
├── UsersTable
│   └── UserRow[]
│       ├── NameCell
│       ├── EmailCell
│       ├── RoleCell
│       ├── StatusToggle
│       └── ActionMenu
└── Pagination
```

---

## 📋 5. Tablas de Referencia

### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                         Tablas de Referencia       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Tipos Documento]  [Impuestos]  [UOM]  [Ciudades]          │
│                                                              │
│  Tipos de Documento (Documento DIAN)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Agregar]  [Importar CSV]                         │   │
│  │                                                     │   │
│  │  Código  Descripción              Activo  Acción   │   │
│  │  13      Cédula de Ciudadanía      ✅      [•••]   │   │
│  │  31      NIT                       ✅      [•••]   │   │
│  │  41      Pasaporte                 ✅      [•••]   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# APP USER - VISTAS Y FLUJOS

## 🔐 1. Login Tenant

### Wireframe
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│           INGEFACT - Facturación Electrónica            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  Empresa:                                        │  │
│  │  [Buscar empresa...]                            │  │
│  │                                                  │  │
│  │  Usuario:                                        │  │
│  │  [_____________________________]                 │  │
│  │                                                  │  │
│  │  Contraseña:                                    │  │
│  │  [_____________________________]                 │  │
│  │                                                  │  │
│  │  [Iniciar Sesión]                               │  │
│  │                                                  │  │
│  │  ¿Necesitas ayuda? Contáctanos                  │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 2. Dashboard Tenant

### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT  [Logo]     Dashboard        Empresa ▼   Salir     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Bienvenido, Usuario                Tech Solutions          │
│                                                              │
│  ┌─ Estado Actual ───────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Plan: Premium    Ambiente: Sandbox    Status: ✅    │  │
│  │  Resolución: Vigente (Vence: 2025-01-19)            │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Métricas Rápidas ────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Facturas Este Mes  Últimas 30 días   Total Facturado│  │
│  │         12                  15            $2.5M       │  │
│  │                                                       │  │
│  │  Pendientes Aceptación  Con Error     Tasa Aceptación│  │
│  │           2                   0             100%       │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Últimas Facturas ────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Número   Cliente          Valor       Estado   CUFE │  │
│  │  000015   Retail Inc     $145,000      ✅      Sí    │  │
│  │  000014   Services Co    $85,000       ✅      Sí    │  │
│  │  000013   Commerce Ltd   $200,000      ⏳      -     │  │
│  │                                                       │  │
│  │  [Ver Todas las Facturas]                           │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Accesos Rápidos ────────────────────────────────────┐   │
│  │                                                       │   │
│  │  [Crear Factura]  [Configuración]  [Clientes]  [Items]│  │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Componentes React
```
DashboardTenant
├── Header
│   ├── LogoIngefact
│   ├── CompanySelector
│   ├── UserDropdown
│   └── LogoutButton
├── StatusBar
│   ├── PlanBadge
│   ├── EnvironmentBadge
│   ├── ConnectionStatus
│   └── ResolutionStatus
├── MetricsCards
│   ├── MetricCard (Facturas Este Mes)
│   ├── MetricCard (Últimos 30 Días)
│   ├── MetricCard (Total Facturado)
│   ├── MetricCard (Pendientes)
│   ├── MetricCard (Con Error)
│   └── MetricCard (Tasa Aceptación)
├── LatestInvoices
│   └── InvoicesList
└── QuickLinks
    ├── ButtonCreateInvoice
    ├── ButtonConfig
    ├── ButtonClients
    └── ButtonItems
```

---

## ⚙️ 3. Configuración

### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                                     Configuración   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Datos Empresa]  [Impuestos]  [Resolución]  [Logo]         │
│                                                              │
│  ╔─ Datos Empresa ───────────────────────────────────────╗  │
│  ║                                                       ║  │
│  ║  Razón Social:                                       ║  │
│  ║  [_____________________________________]             ║  │
│  ║                                                       ║  │
│  ║  RUT:                                               ║  │
│  ║  [__________] - [__]                                ║  │
│  ║  (No editable - creado por admin)                   ║  │
│  ║                                                       ║  │
│  ║  Email:                                             ║  │
│  ║  [_____________________________________]             ║  │
│  ║                                                       ║  │
│  ║  Teléfono:                                          ║  │
│  ║  [_____________________________________]             ║  │
│  ║                                                       ║  │
│  ║  Dirección:                                         ║  │
│  ║  [_____________________________________]             ║  │
│  ║                                                       ║  │
│  ║  ☑ Responsable del IVA                              ║  │
│  ║                                                       ║  │
│  ║  [Cancelar]  [Guardar Cambios]                      ║  │
│  ║                                                       ║  │
│  ╚───────────────────────────────────────────────────────╝  │
│                                                              │
│  ┌─ Impuestos Aplicables ────────────────────────────────┐  │
│  │                                                       │  │
│  │  IVA Standard:                                      │  │
│  │  Porcentaje: [19]%                                  │  │
│  │                                                       │  │
│  │  INC (Impuesto Nacional al Consumo):                │  │
│  │  ☐ Aplicable  Porcentaje: [__]%                     │  │
│  │                                                       │  │
│  │  [Guardar Cambios]                                  │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Resolución ──────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Ambiente Actual: Sandbox                           │  │
│  │  Resolución de Prueba Cargada: ✅                   │  │
│  │                                                       │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │                                                       │  │
│  │  Número de Resolución: *                            │  │
│  │  [_____________________________________]             │  │
│  │                                                       │  │
│  │  Año: *                                             │  │
│  │  [_____]                                            │  │
│  │                                                       │  │
│  │  Prefijo: *                                         │  │
│  │  [_____]                                            │  │
│  │                                                       │  │
│  │  Rango Mínimo: *                                    │  │
│  │  [_____________________]                            │  │
│  │                                                       │  │
│  │  Rango Máximo: *                                    │  │
│  │  [_____________________]                            │  │
│  │                                                       │  │
│  │  Fecha Inicio: *                                    │  │
│  │  [2024-09-01]                                       │  │
│  │                                                       │  │
│  │  Fecha Fin: *                                       │  │
│  │  [2025-09-01]   ⚠️ Vence en 337 días               │  │
│  │                                                       │  │
│  │  Technical Key: *                                   │  │
│  │  [_____________________________]                     │  │
│  │                                                       │  │
│  │  [Validar Resolución]  [Guardar]                    │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Logo de Empresa ─────────────────────────────────────┐  │
│  │                                                       │  │
│  │  [Imagen: LogoActual.png]                           │  │
│  │                                                       │  │
│  │  [Cambiar Logo]  [Eliminar]                         │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Componentes React
```
ConfigurationPage
├── TabsNav
│   ├── TabDatosEmpresa
│   ├── TabImpuestos
│   ├── TabResolucion
│   └── TabLogo
├── TabDatosEmpresa
│   ├── FormDatosEmpresa
│   └── CheckboxResponsableIVA
├── TabImpuestos
│   ├── ImpuestoCard[]
│   └── ButtonAddImpuesto
├── TabResolucion
│   ├── FormResolucion
│   ├── ButtonValidar
│   └── WarningVencimiento
└── TabLogo
    ├── ImagePreview
    └── FileUploadDrop
```

---

## 👥 4. Gestión de Clientes (Terceros)

### 4.1 Listar Clientes

#### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                                     Clientes        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Nuevo Cliente]  Filtrar: [Tipo ▼] [Búsqueda..]           │
│                                                              │
│  ┌─ Clientes ───────────────────────────────────────────┐   │
│  │                                                      │   │
│  │ Nombre            Documento  Email          Acción  │   │
│  │ Retail Inc        123456789  info@retail.co [•••]   │   │
│  │ Services Co       987654321  cont@service.co [•••]  │   │
│  │ Commerce Ltd      456789123  ventas@commerce [•••]  │   │
│  │                                                      │   │
│  │ Mostrando 1-3 de 15                                │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Crear/Editar Cliente

#### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                                   Nuevo Cliente     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Tipo de Documento: *                             │   │
│  │  [Cédula de Ciudadanía ▼]                         │   │
│  │                                                     │   │
│  │  Número de Documento: *                           │   │
│  │  [_____________________________]                   │   │
│  │                                                     │   │
│  │  Nombre o Razón Social: *                         │   │
│  │  [_____________________________]                   │   │
│  │                                                     │   │
│  │  Email:                                           │   │
│  │  [_____________________________]                   │   │
│  │                                                     │   │
│  │  Teléfono:                                        │   │
│  │  [_____________________________]                   │   │
│  │                                                     │   │
│  │  Dirección:                                       │   │
│  │  [_____________________________]                   │   │
│  │                                                     │   │
│  │  ☑ Responsable del IVA                            │   │
│  │  (Afecta impuestos en facturas)                   │   │
│  │                                                     │   │
│  │  Notas:                                           │   │
│  │  [_____________________________]                   │   │
│  │  [_____________________________]                   │   │
│  │                                                     │   │
│  │  [Cancelar]  [Guardar Cliente]                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Componentes React
```
ClientFormPage
├── FormCreateEditClient
│   ├── SelectDocumentType
│   ├── InputDocumentNumber (validación)
│   ├── InputName
│   ├── InputEmail
│   ├── InputPhone
│   ├── InputAddress
│   ├── CheckboxResponsableIVA
│   ├── TextAreaNotes
│   ├── ButtonCancel
│   └── ButtonSubmit
└── AlertError/Success
```

---

## 📦 5. Catálogo (Productos/Servicios)

### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                                 Catálogo           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Nuevo Item]  Tipo: [Todos ▼] [Búsqueda..]               │
│                                                              │
│  ┌─ Items ───────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │ Código  Descripción          Tipo        Valor  Acción│ │
│  │ P001    Consultoría Tech    Servicio  $150,000  [•••]│ │
│  │ P002    Licencia Software   Producto  $50,000   [•••]│ │
│  │ P003    Mantenimiento       Servicio  $20,000   [•••]│ │
│  │                                                      │  │
│  │ Mostrando 1-3 de 12                               │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📄 6. Facturación (❤️ Corazón del Sistema)

### 6.1 Listar Facturas

#### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                                   Facturas         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Crear Factura]                                             │
│                                                              │
│  Filtros: [Estado ▼] [Cliente ▼] [Rango Fechas] [Búsqueda] │
│                                                              │
│  ┌─ Facturas ────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │ Número  Cliente        Valor      Fecha    Estado  ✓ │  │
│  │ 000015  Retail Inc   $145,000   2024-08-28 ✅  CUFE │  │
│  │ 000014  Services Co  $85,000    2024-08-27 ✅  CUFE │  │
│  │ 000013  Commerce Ltd $200,000   2024-08-26 ⏳  -    │  │
│  │ 000012  Retail Inc   $50,000    2024-08-25 ❌ Error │  │
│  │                                                       │  │
│  │ Mostrando 1-4 de 28                                 │  │
│  │                                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Resumen:                                                    │
│  Total Facturado: $480,000  |  Aceptadas: 2  |  Pendientes: 1
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Estado Badge Colores
```
✅ ACEPTADA  - Verde (con CUFE)
⏳ ENVIADA   - Azul (esperando DIAN)
❌ RECHAZADA - Rojo (con razón)
📝 BORRADOR  - Gris (no enviada)
🚫 ANULADA   - Tachado
```

### 6.2 Crear Factura (🌟 WIZARD Multi-Step)

#### Step 1: Seleccionar Cliente

```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                          Crear Factura (1/3)       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Paso 1: Cliente] → [Paso 2: Líneas] → [Paso 3: Revisar]  │
│                                                              │
│  Cliente: *                                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Buscar cliente...                                   [🔍] │
│  │                                                        │ │
│  │ ○ Retail Inc          (CC 123456789)                 │ │
│  │ ○ Services Co         (NIT 987654321)                │ │
│  │ ○ Commerce Ltd        (NIT 456789123)                │ │
│  │ ○ + Crear Nuevo Cliente                             │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Fecha: [2024-08-28]                                        │
│  (Hoy automáticamente)                                      │
│                                                              │
│  Información del Cliente (Auto-cargado):                    │
│  Responsable IVA: ✅                                        │
│  Email: info@retail.co                                      │
│  Teléfono: +57 1 234 5678                                  │
│                                                              │
│  [Cancelar]  [Siguiente →]                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Step 2: Agregar Líneas

```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                          Crear Factura (2/3)       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Paso 1: Cliente] → [Paso 2: Líneas] → [Paso 3: Revisar]  │
│                                                              │
│  Cliente: Retail Inc                                        │
│  Fecha: 2024-08-28                                          │
│                                                              │
│  ┌─ Líneas de Factura ───────────────────────────────────┐  │
│  │                                                       │  │
│  │  Item              Cantidad  Precio Unit  Total   ❌  │  │
│  │                                                       │  │
│  │  [Seleccionar] ▼      [1]     $150,000    $150k   [x] │  │
│  │  Consultoría Tech                                    │  │
│  │  Impuesto: IVA 19% = $28,500                         │  │
│  │                                                       │  │
│  │  [Seleccionar] ▼      [2]     $50,000     $100k   [x] │  │
│  │  Licencia Software                                   │  │
│  │  Impuesto: IVA 19% = $19,000                         │  │
│  │                                                       │  │
│  │  [+ Agregar Línea]                                  │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Resumen ─────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Subtotal:           $250,000                        │  │
│  │  Total IVA (19%):    $47,500                         │  │
│  │  ─────────────────────────────                       │  │
│  │  TOTAL:              $297,500                        │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [← Atrás]  [Siguiente →]                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Step 3: Revisar y Enviar

```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                          Crear Factura (3/3)       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Paso 1: Cliente] → [Paso 2: Líneas] → [Paso 3: Revisar]  │
│                                                              │
│  ╔─ Resumen Final ───────────────────────────────────────╗  │
│  ║                                                       ║  │
│  ║  FACTURA ELECTRÓNICA                                 ║  │
│  ║  ────────────────────────                            ║  │
│  ║  Empresa: Tech Solutions                             ║  │
│  ║  RUT: 900123456-2                                    ║  │
│  ║                                                       ║  │
│  ║  Factura Número: 000016 (auto-generado)              ║  │
│  ║  Fecha: 2024-08-28                                   ║  │
│  ║                                                       ║  │
│  ║  Cliente: Retail Inc                                 ║  │
│  ║  Documento: 123456789                                ║  ║
│  ║  Email: info@retail.co                               ║  │
│  ║                                                       ║  │
│  ║  ──────────────────────────────────────────          ║  │
│  ║  ITEMS:                                              ║  │
│  ║                                                       ║  │
│  ║  1. Consultoría Tech                  $150,000       ║  │
│  ║     IVA (19%)                         $28,500        ║  │
│  ║                                                       ║  │
│  ║  2. Licencia Software                 $100,000       ║  │
│  ║     IVA (19%)                         $19,000        ║  │
│  ║                                                       ║  │
│  ║  ──────────────────────────────────────────          ║  │
│  ║  Subtotal:                            $250,000       ║  │
│  ║  Total IVA (19%):                     $47,500        ║  │
│  ║  TOTAL:                               $297,500       ║  │
│  ║  ──────────────────────────────────────────          ║  │
│  ║                                                       ║  │
│  ╚───────────────────────────────────────────────────────╝  │
│                                                              │
│  ┌─ Validaciones ────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  ✅ Cliente con documento completado                 │  │
│  │  ✅ Resolución vigente                               │  │
│  │  ✅ Impuestos correctos para cliente                │  │
│  │  ✅ Totales validados                               │  │
│  │  ✅ Conectividad a Alegra: OK                        │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [← Atrás]  [Guardar Borrador]  [Enviar a DIAN]            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Step 4: Confirmación (Post-Envío)

```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                          Factura Enviada          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Estado de la Factura ────────────────────────────────┐  │
│  │                                                       │  │
│  │  ⏳ Estado: ENVIADA A DIAN                            │  │
│  │                                                       │  │
│  │  Número: 000016                                      │  │
│  │  Fecha Envío: 2024-08-28 14:32:15                   │  │
│  │  Cliente: Retail Inc                                │  │
│  │  Total: $297,500                                    │  │
│  │                                                       │  │
│  │  Estado DIAN: Esperando respuesta...                │  │
│  │  [████████░░░░░░░] 60%                              │  │
│  │                                                       │  │
│  │  ⏱️ Por favor espera. DIAN responde en 1-10 minutos │  │
│  │  Recibirás notificación cuando esté procesada.      │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Ir a Facturas]  [Crear Otra Factura]                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Componentes React
```
CreateInvoiceWizard
├── WizardStepper
│   ├── StepLabel (1, 2, 3)
│   └── ProgressBar
├── Step1ClientSelection
│   ├── ClientSearchCombo
│   ├── ClientInfo
│   └── DatePicker
├── Step2AddLines
│   ├── InvoiceLinesList
│   │   └── InvoiceLine[]
│   │       ├── ItemCombo
│   │       ├── InputQuantity
│   │       ├── DisplayPrice
│   │       ├── DisplayTax
│   │       └── ButtonRemove
│   ├── ButtonAddLine
│   └── InvoiceSummary
│       ├── Subtotal
│       ├── TaxSummary
│       └── Total
├── Step3Review
│   ├── InvoicePreview
│   ├── ValidationChecklist
│   └── ActionButtons
└── Step4Confirmation
    ├── SuccessMessage
    ├── StatusTracker
    └── NextStepButtons
```

### 6.3 Detalle Factura

```
┌──────────────────────────────────────────────────────────────┐
│  INGEFACT                         Factura 000015             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ← Volver a Facturas                                        │
│                                                              │
│  ┌─ Estado y Acciones ───────────────────────────────────┐  │
│  │                                                       │  │
│  │  ✅ ACEPTADA POR DIAN                                │  │
│  │                                                       │  │
│  │  CUFE: 41202408280005235627800110910000157081234567  │  │
│  │                                                       │  │
│  │  [Descargar PDF]  [Descargar XML]  [Imprimir]       │  │
│  │  [Crear Nota Crédito]  [Crear Nota Débito]         │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Información General ──────────────────────────────────┐  │
│  │                                                       │  │
│  │  Número: 000015                                      │  │
│  │  Fecha: 2024-08-28                                  │  │
│  │  Vencimiento: 2024-09-27 (30 días)                 │  │
│  │                                                       │  │
│  │  Cliente: Retail Inc                                │  │
│  │  NIT: 123456789                                     │  │
│  │  Email: info@retail.co                              │  │
│  │                                                       │  │
│  │  Empresa: Tech Solutions                            │  │
│  │  RUT: 900123456-2                                   │  │
│  │  Email: admin@techsolutions.com                     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Líneas ──────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │ Descripción           Cantidad  Precio  Impuesto Total│  │
│  │ Consultoría Tech           1   $150k    $28.5k  $178k│  │
│  │ Licencia Software          2    $50k    $19k    $119k│  │
│  │                                                       │  │
│  │ Subtotal:                                  $250,000  │  │
│  │ Total IVA (19%):                           $47,500   │  │
│  │ TOTAL:                                     $297,500  │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Historial ───────────────────────────────────────────┐  │
│  │                                                       │  │
│  │ 2024-08-28 14:32  Factura Enviada a DIAN            │  │
│  │ 2024-08-28 14:35  Factura Aceptada por DIAN         │  │
│  │ 2024-08-28 14:35  CUFE Generado                     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 🔄 FLUJOS DE NEGOCIO

## Flujo 1: Onboarding Completo (Admin → User)

```
INICIO
  ↓
[ADMIN] Login Admin
  ↓
[ADMIN] Dashboard Admin
  ↓
[ADMIN] Crear Empresa
  ├─ Valida datos locales
  ├─ Llama API Alegra (createcompany)
  ├─ Guarda en BD + credenciales
  └─ En SANDBOX: createtestset automático
  ↓
[ADMIN] Activa Plan (Free/Pro/Premium)
  ↓
[ADMIN] Genera usuario/contraseña para Tenant
  ↓
[ADMIN] Envía credenciales a Tenant (email/manual)
  ↓
[USER] Login Tenant (empresa + usuario + contraseña)
  ↓
[USER] Dashboard (avisa: "Complete configuración")
  ↓
[USER] Configuración
  ├─ Datos empresa
  ├─ Impuestos
  ├─ Resolución (validar en Alegra)
  └─ Logo
  ↓
[USER] Crear Cliente (Tercero)
  ↓
[USER] Crear Producto/Servicio (Catálogo)
  ↓
[USER] Crear Factura
  ├─ Step 1: Seleccionar cliente
  ├─ Step 2: Agregar líneas
  ├─ Step 3: Revisar
  └─ Step 4: Enviar a DIAN
  ↓
[BACKEND] Valida en DIAN, envía a Alegra
  ↓
[ALEGRA] Envía a DIAN
  ↓
[DIAN] Responde (CUFE o error)
  ↓
[WEBHOOK] Actualiza estado factura
  ↓
[USER] Ve factura aceptada con CUFE
  ↓
FIN
```

## Flujo 2: Facturación (Happy Path)

```
[USER] Abre "Crear Factura"
  ↓
[FORM] Step 1: Busca Cliente
  └─ Si no existe: permite crear nuevo
  ↓
[FORM] Step 2: Agrega Líneas
  └─ Búsqueda rápida de items
  └─ Cálculos automáticos de impuestos
  ↓
[FORM] Step 3: Revisa
  ├─ Valida todos los datos
  ├─ Checa conexión Alegra
  └─ Checa resolución vigente
  ↓
[USER] Envía a DIAN
  ↓
[BACKEND] POST /invoices a Alegra
  ├─ Status: ENVIADA
  ├─ Aguarda respuesta
  └─ Timeout? → Queue para reintentar
  ↓
[WEBHOOK] Respuesta de Alegra
  ├─ Si ACEPTADA: Status = ACEPTADA, guardar CUFE
  └─ Si RECHAZADA: Status = RECHAZADA, guardar razón
  ↓
[USER] Ve resultado
  ├─ Si ✅: Muestra CUFE, permite descargar
  └─ Si ❌: Muestra razón, opción de re-enviar
```

---

# 📊 COMPONENTES COMPARTIDOS

```
Todos los Componentes Reutilizables:

├── UI Primitivos
│   ├── Button (variants: primary, secondary, danger)
│   ├── Input (con validación)
│   ├── Select / Combobox
│   ├── Checkbox
│   ├── Radio
│   ├── Switch
│   ├── DatePicker
│   ├── TimePicker
│   └── Textarea
│
├── Layout
│   ├── Header
│   ├── Sidebar
│   ├── Container
│   ├── Card
│   └── Modal/Drawer
│
├── Feedback
│   ├── Alert (success, error, warning, info)
│   ├── Toast (notifications)
│   ├── Loading Spinner
│   ├── Skeleton (placeholder)
│   └── Progress Bar
│
├── Data Display
│   ├── Table (con sorting, pagination)
│   ├── Badge
│   ├── Tag
│   ├── Avatar
│   └── StatusIcon
│
├── Navigation
│   ├── Breadcrumb
│   ├── Tabs
│   ├── Pagination
│   ├── Stepper
│   └── Menu
│
└── Business
    ├── InvoiceSummary
    ├── ClientCard
    ├── ItemRow
    ├── StatusBadge
    ├── TaxCalculation
    └── MetricCard
```

---

# 🎨 CONSIDERACIONES DE UX/UI

## Diseño General
- **Paleta:** Azul principal (Ingefact), grises neutrales, rojos para errores, verdes para éxito
- **Typography:** Headings claros, body readable
- **Spacing:** Consistente (8px grid)
- **Icons:** Lucide React o similar

## Validaciones
✅ Todas en tiempo real (no esperas a submit)
✅ Mensajes claros en inglés/español
✅ Hints debajo de campos

## Estados de Carga
- Spinner para operaciones
- Skeleton para listas
- Disable botón mientras se envía
- Progress bar para operaciones largas

## Responsive
- Mobile-first
- Breakpoints: xs (320), sm (640), md (768), lg (1024), xl (1280)
- Menú hamburguesa en mobile
- Tablas horizontales scrollables

## Accesibilidad
- Colores no solo para indicar estado (+ icons)
- Contraste suficiente (WCAG AA)
- Labels en todos los inputs
- Keyboard navigation

---

**Próximo paso:** Comenzar con Sprint 0 - Setup + Investigación Alegra
