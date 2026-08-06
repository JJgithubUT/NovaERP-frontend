# NovaERP — Frontend

Cliente de NovaERP: Angular 22 (standalone + signals, zoneless), Tailwind 4, PWA offline-first.

Consume la API descrita en [`docs/v1.0_Sprint-1_Fase-1_15-7-2026/openapi.yaml`](docs/v1.0_Sprint-1_Fase-1_15-7-2026/openapi.yaml).
**Ese archivo es la fuente de verdad del contrato.** Si algo aquí lo contradice, gana el YAML.

El diseño sale de los mockups de `templatesejemplos/`, traducidos a tokens de
Tailwind 4 en [`src/styles.css`](src/styles.css). Antes de construir una
pantalla, lee **[docs/design-system.md](docs/design-system.md)**: explica qué
mockup corresponde a cada pantalla y qué tres cosas de las plantillas **no** hay
que copiar (entre ellas un botón que resulta ilegible en modo oscuro).

## Arranque

```bash
npm install
npm start            # dev server en http://localhost:4200 (espera al backend en 127.0.0.1:8000)
```

| Comando             | Qué hace                                                              |
| ------------------- | --------------------------------------------------------------------- |
| `npm start`         | Dev server. Sin Service Worker (estorba al HMR).                      |
| `npm run build`     | Build de producción **+ Service Worker**. Es el que debe ir a deploy. |
| `npm run build:app` | Solo la app, sin SW. Para depurar el build de Angular aislado.        |
| `npm test`          | Tests unitarios (Vitest).                                             |
| `npm run typecheck` | Typecheck de los tres proyectos: app, specs y SW.                     |
| `npm run format`    | Prettier sobre `src/`.                                                |

> `npm run build:app` genera un `dist/` **sin `sw.js`**. Si lo despliegas así, los
> navegadores que ya tengan el SW instalado seguirán sirviendo la versión vieja
> desde caché. Para producción usa siempre `npm run build`.

## Las cuatro capas

```
src/app/
├── api/models/     Contrato con el backend. Espejo tipado del openapi.yaml.
├── core/           Lo transversal. Un solo sitio para cada responsabilidad.
│   ├── auth/       Sesión: store de signals, JWT, guards, arranque.
│   ├── config/     Tokens de configuración inyectables.
│   ├── errors/     Flujo 5: el ApiError único y su traductor.
│   ├── http/       Los cuatro interceptores.
│   ├── offline/    Flujo 4: IndexedDB (Dexie), outbox, estado de red.
│   ├── pwa/        Registro del SW y aviso de actualización.
│   ├── query/      Estado de servidor: QueryClient y claves de caché.
│   └── theme/      Claro/oscuro + el test de contraste de los tokens.
├── features/       Una carpeta por módulo de negocio. Lazy, aisladas.
├── layout/         El App Shell: sidebar dinámico, banners.
└── shared/         Reutilizable y sin estado: UI tonta y utilidades.

src/styles.css      Los tokens del sistema de diseño (Tailwind 4, CSS-first).
src/sw/             El Service Worker. Build propio, tipos propios.
public/fonts/       Inter, JetBrains Mono e iconos, auto-hospedados.
```

La regla de dependencias: `features` → `core`/`shared`/`api`. Nunca al revés,
y nunca entre `features`. Si dos features necesitan lo mismo, sube a `shared`.

### A. Presentación (`features/`, `layout/`, `shared/ui/`)

Componentes `OnPush` y standalone. Los de catálogo son puros: reciben datos y
emiten eventos, sin saber que existe una red.

Los guards cortan **antes** de renderizar, con `canMatch` y no `canActivate`:
así el chunk de un módulo que el usuario no puede ver ni se descarga.

Los estilos salen de los tokens de `src/styles.css` — nada de hexes en el
markup. Ver [docs/design-system.md](docs/design-system.md).

### B. Estado (`core/query/`, `core/auth/`)

|                  | Herramienta           | Qué guarda                                             |
| ---------------- | --------------------- | ------------------------------------------------------ |
| **Server state** | TanStack Query        | Respuestas de la API, con su ciclo de vida (stale/gc). |
| **Client state** | `AuthStore` (signals) | Token, usuario, tenant activo, permisos, módulos.      |

El documento de arquitectura pide React Query + Zustand; aquí son TanStack
Angular Query y un servicio raíz con signals. Misma mecánica, sin dependencias
que no encajan en Angular.

Toda clave de caché empieza por el `tenantSlug` (ver `core/query/query-keys.ts`).
Cambiar de tenant invalida todo por construcción, no por acordarse de limpiar.

### C. Resiliencia / PWA (`core/offline/`, `src/sw/`)

- **Service Worker propio con Workbox**, no `@angular/pwa`. La razón es el
  Flujo 4: `ngsw` no expone Background Sync, así que la cola solo se drenaría
  con la pestaña abierta.
- **IndexedDB (Dexie)** con dos usos: espejo de catálogos para leer sin red, y
  el **outbox** de escrituras pendientes.
- El SW **no cachea `/api/`**. Los datos ya tienen caché en TanStack Query y en
  IndexedDB; una tercera capa daría pantallas con datos de tres edades distintas.

El drenado del outbox (`core/offline/outbox-drain.ts`) es una función pura que
ejecutan **dos** entornos: el `SyncQueueService` con la pestaña abierta y el SW
desde el evento `sync` cuando está cerrada. Está compartida a propósito: si cada
uno tuviera su copia, divergirían justo en el orden y la deduplicación de
escrituras.

### D. Red (`core/http/`)

`HttpClient` con interceptores funcionales (no Axios: en Angular quedaría fuera
de DI y perdería `HttpTestingController`).

**El orden de `withInterceptors` en `app.config.ts` es carga útil, no estética.**
Las peticiones los atraviesan en orden; las respuestas, al revés:

```
        ida  →  authInterceptor        inyecta Authorization: Bearer <JWT>
                sessionInterceptor
                offlineQueueInterceptor
                errorInterceptor
      vuelta  ←  errorInterceptor        traduce {mensaje}|{detail} → ApiError
                 offlineQueueInterceptor si fue fallo de red, encola
                 sessionInterceptor      si fue 401, logout global
```

`errorInterceptor` va al final para ser el primero de vuelta: los demás reciben
el `ApiError` ya normalizado en vez de un `HttpErrorResponse` crudo.

## Los cinco flujos, y dónde vive cada uno

| Flujo                      | Dónde                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| 1 · Shell instantáneo      | `src/sw/sw.ts`, `layout/shell/`, `core/auth/session.initializer.ts` |
| 2 · Aislamiento de tenant  | `core/auth/guards/tenant.guard.ts` + rutas bajo `/:tenant`          |
| 3 · Mutaciones optimistas  | `core/query/` (configurado; falta aplicarlo en cada feature)        |
| 4 · Cola de sincronización | `core/offline/`, `core/http/offline-queue.interceptor.ts`           |
| 5 · Errores normalizados   | `core/errors/`                                                      |

## Trampas del backend que este código ya contempla

Están documentadas en el `openapi.yaml` y aquí se traducen a código. Al escribir
una feature nueva, revísalas:

1. **Dos dialectos de error.** `/api/auth/login/` responde `{ mensaje }`; todo lo
   demás, `{ detail, campo? }`. Ya lo resuelve `normalize-error.ts` — no vuelvas
   a leer `error.error.detail` en un componente.
2. **Los decimales son strings.** `precio_venta`, `costo_referencia`,
   `stock_minimo`, `limite_credito`. **Nunca `parseFloat`**: usa
   `shared/utils/decimal.util.ts`. Es a propósito, para no perder precisión.
3. **404, nunca 403, entre tenants.** El backend no confirma si un recurso existe
   en otro tenant. El frontend hace lo mismo: `tenant.guard.ts` manda a `/404`.
4. **La baja es lógica.** `DELETE` pone `activo: false` y devuelve
   `{ id, activo: false }`. La fila no desaparece.
5. **Dar de baja un cliente puede fallar con 422** si tiene saldo en CxC. El
   saldo llega en `ApiError.extra['saldo_pendiente']` y hay que mostrarlo.
6. **`rfc_o_id_fiscal` es obligatorio en Proveedor** y opcional en Cliente.
7. **El token dura 8h y no hay refresh.** Un 401 es terminal: logout, sin
   reintentos. Ojo en el outbox: un dispositivo offline más de 8h verá sus
   escrituras rechazadas con 401 y quedarán en estado `fallido`.
8. **`permisos` puede venir vacío** aunque el usuario tenga roles, si
   `rol_permiso` no está poblado. Por eso las rutas usan `moduloGuard` y no
   `permisoGuard` todavía.

## Estado actual: esqueleto

La infraestructura y el sistema de diseño están completos y verificados. **Las
pantallas no**: son placeholders. Lo que falta para el Sprint 1:

- [ ] Formulario de login (la lógica ya está en `AuthService.login()`; el mockup
      es `novaerp_acceso_al_sistema_dark_mode`).
- [ ] Las cuatro tablas de catálogo: productos, almacenes, clientes, proveedores.
      Patrón de tabla en `novaerp_advanced_datagrid_architecture`.
- [ ] Capa de datos por catálogo: queries + mutaciones optimistas (Flujo 3),
      escribiendo a `CatalogCacheService` para el modo offline.
- [ ] UI para revisar y reintentar los items `fallido` del outbox.
- [ ] Precarga de catálogos al entrar (hoy `CatalogCacheService` existe pero
      nadie lo llama).
- [ ] Búsqueda global del topbar: hoy es un hueco. El backend solo expone
      `search` por catálogo, no uno transversal.

## Decisiones que conviene no deshacer sin leer esto

- **El token vive en `localStorage`**, no en memoria. Es lo que permite que la
  PWA sobreviva a un reload y a un arranque en frío sin red. A cambio, un XSS
  puede leerlo: es el trade-off estándar de una SPA con Bearer tokens, acotado
  por la expiración de 8h. Si algún día el backend emite cookie httpOnly +
  refresh, `AuthStore` es el único archivo a cambiar.
- **Las rutas van bajo `/:tenant`.** Hace el tenant explícito en cada URL y le da
  al guard algo concreto que validar.
- **`strict` y `noUncheckedIndexedAccess` están activados.** El proyecto venía
  sin ellos. En un ERP donde los decimales son strings y las páginas pueden venir
  vacías, es la diferencia entre un error de compilación y un `NaN` en una factura.
- **El SW se excluye de `tsconfig.app.json`** y tiene el suyo (`tsconfig.sw.json`)
  con `lib: WebWorker`. Sin eso, `self` se resolvería al de `Window` y los tipos
  mentirían en ambos lados.
