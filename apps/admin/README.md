# IngeFact Admin

Back-office interno de IngeFact — usado por el staff para aprovisionar tenants,
usuarios internos, planes y catálogos DIAN. React 19 + Vite, habla con `apps/api`
(FastAPI) vía `packages/core-api`.

## Levantar en local

Desde la raíz del repo: `npm install` (una sola vez, workspaces npm) y luego
`npm run dev --workspace=apps/admin`. Necesita `apps/api` corriendo (ver
`apps/api/README.md`) — `authStore.js` configura `core-api` con la URL del
backend desde `VITE_API_URL` (ver `.env.development`/`.env.production`).

## Tests y lint

`npm run test --workspace=apps/admin`, `npm run lint --workspace=apps/admin`.

## Convenciones del repo (leer antes de agregar una pantalla nueva)

- **Sin modales** — todo create/edit es una pantalla completa en su propia ruta
  (`<Entidad>FormPage.jsx`), nunca un diálogo overlay. Ver
  `src/modules/companies/pages/CompanyFormPage.jsx` como referencia.
- **Patrón FormPage**: archivo `<Entidad>FormPage.jsx` + hermano
  `<Entidad>FormPage.validation.js` (función pura `validateField`, sin JSX —
  necesario para poder testearlo con Vitest sin montar el componente). Mismo
  componente sirve para crear y editar (`useParams().id`).
- **`packages/ui`** para componentes compartidos entre `apps/admin` y
  `apps/user` (`SidebarShell`, `SearchableSelect`, `ToastAlert`, etc.) —
  extraer ahí en vez de duplicar. **`packages/core-api`** para todo el acceso a
  datos (`apiRequest`/`publicRequest` en `apiClient.js`, servicios por entidad
  en `src/services/`).
- **Auth**: JWT propio (no Supabase) — `authStore.js` (fábrica compartida
  `createAuthStore` en `core-api`), access token en memoria, refresh token
  rotado de un solo uso en `localStorage`.
- El `content` de `tailwind.config.js` debe incluir
  `../../packages/ui/src/**/*.{js,jsx}` — si no, las clases usadas solo en
  componentes compartidos no se generan (bug real ya visto).
