# Spec — Admin (operador de plataforma) · rediseño "Back to 100%"

**Fecha:** 2026-06-16
**Origen:** Octava y última superficie del rediseño, tras Home · Header · Catálogo · PDP · Carrito+Checkout · Auth · Cuenta. Las 7 superficies cara-al-comprador ya están mergeadas. Admin (`app/admin`) sigue con su shell de sidebar viejo (wrapper `bg-gray-50`, sidebar `bg-white` + `border-gray-200`, links gris, badge morado) y primitivos viejos — **deuda real = `Card` (rounded-xl), `Button` (`--color-primary`), `Badge`, y el shell** (`Input.tsx` ya es Back-to-100%: rounded-button + bg-surface, NO es deuda). **Sin librería de componentes admin**: cada página arma sus tablas/forms/headers a mano. (Verificado por CC contra el código: 16 pantallas / 2232 líneas, sin `components/admin/`, gate `isPlatformAdmin` sólido.)
**Negocio:** B2B mayorista Pi-Power. Admin es la herramienta del **operador de plataforma** (gate `isPlatformAdmin` → redirect). El comprador nunca la ve. Es densa y orientada a la operación: catálogo, clientes, precios, órdenes, cotizaciones, facturas, aprobaciones, búsqueda, settings.

**Decomposición:** "Cuenta/Admin" se separó en dos specs. **Cuenta** ya está mergeada (`docs/superpowers/specs/2026-06-16-account-design.md`). **Este spec = Admin**, con tratamiento **full Back-to-100%** (decisión de Herney 2026-06-16: full, no pasada ligera ni diferir).

## Objetivo

Restilar las 16 pantallas de admin al sistema "Back to 100%", construyendo primero un **set de componentes admin compartidos** (la palanca que vuelve mecánico el restyle de las 12 pantallas con tabla), cerrar los **pocos residuos de i18n** (admin ya está ~95% keyed — ver Riesgos), y entregarlo **en fases** (cada fase su branch/PR/review en localhost). Restyle preserva toda la lógica; **cero funcionalidad nueva**.

## Decisiones de diseño (cerradas con Herney en Cowork)

1. **Estructura = B (un spec, fases en PRs).** Sobre A (un PR gigante de 16 pantallas, irrevisable en localhost) y C (specs separados por cluster, más overhead). Un spec define la fundación + el orden de rollout; CLI entrega por fases.
2. **Profundidad = full Back-to-100%.**
3. **Sidebar = slate oscuro (`neutral-900`)** con item activo en lima (`aria-current`), contenido en superficie clara con tablas instrument-grade. Ancla la identidad de marca en el chrome y separa la navegación del contenido de trabajo (patrón premium de back-office). Se mantiene el patrón sidebar (correcto para 16 secciones).
4. **Set de componentes admin compartidos** en `components/admin/` = la arquitectura central. Una vez construido, aplicar a las 16 pantallas es mecánico.
5. **i18n** se cierra por pantalla, dentro de su fase (no un barrido aparte).

## Arquitectura

### Fundación — shell restilado (sidebar slate)

`admin/layout.tsx`: sidebar `neutral-900` (slate), logo Pi·Power, label "Admin" mono, nav con item activo en lima (`aria-current="page"`), badge "platform admin" restilado (hoy `bg-purple-100` → tokens de marca), `LocaleSwitch` + email del usuario al pie. Contenido en superficie clara (`surface`/muted). Mobile: el sidebar colapsa a un drawer (Vaul, `direction="left"`, **reusa el patrón de `MobileNav`** ya construido en el header) con trigger en una barra superior compacta; foco atrapado + retorno. La lógica del layout (gate `isPlatformAdmin`, `maintainCurrentSession`, `getLocale`) intacta.

### Fundación — set de componentes admin compartidos (`components/admin/`)

La palanca. Cada uno con un propósito y API por su `index`/export, consumidos por las páginas:
- **`AdminPageHeader`** — título + subtítulo/conteo + slot de acción primaria (CTA lima).
- **`DataTable`** — tabla instrument-grade: headers mono uppercase, números tabulares, celdas de status (punto + texto), columna de acciones de fila, empty state, header `<th scope="col">`. Las 12 pantallas con tabla la consumen.
- **`FilterBar`** — search + selects para las listas.
- **`StatusBadge`** — badge de estado unificado que cubre el **enum completo de cada dominio** (orden, cotización, factura, aprobación, y `PaymentStatus` = PENDING/AUTHORIZED/CAPTURED/REFUND_PENDING/REFUNDED — **no solo los 2** (CAPTURED/PENDING) que muestra `PaymentBadge` hoy) → tono por estado. Se apoya en `ui/Badge.tsx` (ya tiene tonos success/warning/danger/info): mapea enum→tono y lo envuelve. **Consolida** `OrderStatusBadge`/`PaymentBadge`/`Badge`. **Cross-surface (importante):** `OrderStatusBadge`/`PaymentBadge` los consume el área de **Cuenta** (orders list/detail, recién mergeada) → en Fase 0 quedan como **wrappers finos sobre `StatusBadge`** (**opción (a)**: cero cambio en Cuenta, aísla el blast radius). Migrar los call-sites de Cuenta a `StatusBadge` directo es FU opcional.
- **`MetricCard`** — widgets numéricos del dashboard.
- **Variantes de botón admin** — lima primario / secundario / destructivo (sobre el `Button` existente o nuevo).
- **Forms:** reusar `AuthField` (de auth) para inputs con label+error; los forms admin más densos pueden envolverlo.

TDD donde hay lógica (render/empty/orden de `DataTable`, mapeo estado→tono de `StatusBadge`); el resto presentacional.

### Rollout en fases (cada una su branch/PR/review en localhost)

- **Fase 0 — Fundación:** shell slate + componentes compartidos + **harness prod-e2e de admin** (ver Testing), con el **Dashboard** (`/admin`, 106 líneas) restilado como primer consumidor (valida shell + `MetricCard`; algo visible para revisar). Verifica/cierra los labels de widgets del dashboard si quedan hardcodeados.
- **Fase 1 — Catálogo:** `products` (344 líneas, la más grande), `products/[id]`, `categories`.
- **Fase 2 — Comercio:** `orders` + `orders/[id]` (transiciones de estado), `quotes` + `quotes/[id]`, `invoices`, `approvals`.
- **Fase 3 — Clientes:** `customers` + `customers/[id]` (297 líneas), `customers/[id]/credit` (206), `customers/[id]/prices`.
- **Fase 4 — Plataforma:** `search`, `settings`.

Cada fase: aplica los componentes compartidos, cierra i18n de sus pantallas, a11y, tests, gate completo en verde, review de Herney en localhost, merge.

## Preservado (CRÍTICO — restyle no toca lógica)

Admin concentra mutaciones; el restyle es **solo presentación**. No se tocan: transiciones de estado de orden + cancel-restaura-stock; `markPaid` de facturas; CRUD de productos (create/toggleActive/togglePrivate) + reenqueue de reindex; tiers de precio por producto y por cliente; `creditLimit`/`paymentTerms`/`approvalThreshold` + catalog access (grant/revoke); decisiones de aprobaciones (historial read-only); reindex/retry de búsqueda; entrada a impersonation; settings. Los tests de módulos (Vitest, ya TDD) guardan estas rutas.

## A11y (WCAG 2.1 AA)

Sidebar con `aria-current="page"` + navegable por teclado; drawer mobile con foco atrapado + retorno. `DataTable` con `<th scope>` y semántica de tabla correcta. Forms con `<label>` reales. Acciones destructivas (delete de producto/categoría, cancel de orden) con confirmación accesible + manejo de foco. Estado comunicado por **texto + color** (punto + label), nunca solo color. Contraste: lima sobre slate y `lime-deep #4d8000` sobre blanco verificados AA. Touch targets ≥44px. Cero motion nuevo salvo el deslizamiento del drawer (respeta `prefers-reduced-motion`).

## Testing

**Unit:** componentes compartidos — `DataTable` (render de filas/columnas, empty state, celdas de acción), `StatusBadge` (mapeo estado→tono completo para los 5 dominios de estado), `FilterBar`, `MetricCard`.
**e2e (prod build, regla TST-6):** hoy **no hay prod-e2e de admin** (solo `admin-auth.spec` dev, 3 tests del gate). **Fase 0 construye el harness prod** (sesión `isPlatformAdmin` seedeada, clonando el patrón de `account.spec`); luego cada fase agrega los flujos admin críticos de su cluster (gate de acceso, render de listas clave, una mutación representativa por dominio para probar que el restyle no la rompió). axe por pantalla restilada.
**Gate por fase:** `pnpm format && lint && typecheck && test && build` con `STORE_ID=pipower` + `DATABASE_URL` explícito (sin él ~239 rojos de entorno, no regresión) + `test:e2e:prod`. Nota DX: correr vitest dispara `cleanDb` y borra la DB dev → reseed después.

## Alcance

**Dentro:** shell slate restilado + drawer mobile; set de componentes admin compartidos (`components/admin/`); restyle de las 16 pantallas en 5 fases; consolidación de badges de estado; cierre de i18n admin (EN/ES); a11y AA; tests unit + e2e + axe. **Cero funcionalidad nueva** — solo presentación + i18n.

**Fuera (FU / specs siguientes):**
- Cualquier **feature nueva** de admin (filtros/orden/paginación que no existan hoy, bulk actions nuevas, etc.) — si surge una mejora chica obvia al tocar una pantalla, se evalúa puntual, pero el spec es restyle.
- **Members** (gestión de equipo en el área de cuenta) → FU.
- **Account** → ya mergeado.

## Riesgos / notas

- **Superficie grande** (16 pantallas, ~2.100 líneas, 12 con tabla) → las fases lo mitigan; cada PR es revisable en localhost.
- **Muchas mutaciones** → el restyle no debe rozar ninguna action; los tests de módulos son la red. Cualquier cambio que toque lógica va con su test y se marca explícito.
- **Tablas densas en mobile** → scroll horizontal aceptable en admin (es desktop-first); no forzar reflow que rompa la lectura de datos.
- **i18n casi completo (~95% keyed)** — sobreestimado en la versión inicial del spec; CC verificó que solo quedan ~4 residuos: `credit/page` (placeholders "sin crédito"/"sin aprobaciones"), `products/[id]` ("Generación AI encolada…"), `quotes/[id]` ("Líneas"), + verificar labels de widgets del dashboard. Cierre trivial por pantalla, no un esfuerzo. Mantener paridad EN/ES.
- **Cross-surface:** admin tiene shell propio (sidebar), no usa el header unificado → no hay regresión de header; el `LocaleSwitch` se reubica en el sidebar restilado, re-verificar que funciona.
- **Sin modelo Prisma nuevo** ni migración (es restyle).

## Reglas de ejecución

- Una branch por fase: `redesign/admin-foundation`, `redesign/admin-catalog`, `redesign/admin-commerce`, `redesign/admin-customers`, `redesign/admin-platform`. PR por fase. Review de Herney en localhost antes de cada merge. **No mergear sin confirmación.**
- Nunca dato inventado (estados, montos, métricas → solo datos reales de DB). TDD en los componentes compartidos con lógica. Conventional Commits, un commit por pieza. La Fase 0 (fundación) es prerequisito de las demás.
- `impeccable detect` / gate completo en verde antes de cada merge.
