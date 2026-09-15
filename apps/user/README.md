# IngeFact User

Panel del cliente final (tenant) de IngeFact — cada empresa gestiona sus propios
clientes, catálogo, facturas, notas crédito/débito y configuración (Resolución
DIAN, impuestos, datos de empresa). React 19 + Vite, habla con `apps/api`
(FastAPI) vía `packages/core-api`.

## Levantar en local

Desde la raíz del repo: `npm install` (una sola vez) y luego
`npm run dev --workspace=apps/user`. Necesita `apps/api` corriendo (ver
`apps/api/README.md`) — `authStore.js` (fábrica `createAuthStore` de
`packages/core-api`) configura la URL del backend desde `VITE_API_URL`.

## Tests y lint

`npm run test --workspace=apps/user`, `npm run lint --workspace=apps/user`.

## Convenciones del repo (leer antes de agregar una pantalla nueva)

- **Sin modales** — todo create/edit es una pantalla completa en su propia ruta
  (`<Entidad>FormPage.jsx`). Ver `src/modules/products/pages/ProductFormPage.jsx`
  o `src/modules/customers/pages/CustomerFormPage.jsx` como referencia completa
  del patrón (validación inmediata, `returnTo` para flujos anidados, mismo
  componente para crear/editar).
- **Patrón FormPage**: archivo `<Entidad>FormPage.jsx` + hermano
  `<Entidad>FormPage.validation.js` (función pura `validateField`, sin JSX, para
  poder testearlo con Vitest sin montar el componente).
- **Sidebar** (`src/components/Sidebar.jsx`): items agrupables con `children`
  (mismo patrón que "Documentos"/"Configuración") para submenús relacionados.
- **`packages/ui`** para componentes compartidos con `apps/admin`
  (`SidebarShell`, `SearchableSelect`, `ToastAlert`). **`packages/core-api`**
  para todo el acceso a datos.
- El `content` de `tailwind.config.js` debe incluir
  `../../packages/ui/src/**/*.{js,jsx}` — si no, las clases usadas solo en
  componentes compartidos no se generan.
