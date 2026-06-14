# Spec — Unificación del header (rediseño "Back to 100%")

**Fecha:** 2026-06-13
**Origen:** Auditoría 2026-06-12 (§2a/§2b — "la tienda vivirá como dos marcas cruzando la costura al segundo clic"). El header nuevo `Header.tsx` solo vive en la home; el resto del storefront usa `StoreHeader.tsx` legacy, que además es la única superficie con búsqueda/carrito/cuenta. Primera superficie del rediseño tras la home (que ya está merged).
**Negocio:** B2B mayorista Pi-Power, compradores profesionales que re-ordenan. El chrome lo ve **cada página**; unificarlo es la fundación que el resto de las superficies hereda.

## Objetivo

Un solo header para toda la tienda (storefront + account + home), con la estética "Back to 100%", que **absorbe sin perder nada** lo que hoy hace el `StoreHeader` legacy: búsqueda, carrito con badge, catálogo, órdenes, quotes/invoices/approvals (gateados por flag), switch de locale, notificaciones, banner de impersonation, y sign-in/registro vs sign-out. Mata la costura de dos-marcas y mete el affordance de re-orden en el chrome. Tras esta superficie, el resto de la tienda se restila superficie por superficie heredando este header.

## Decisiones de diseño (cerradas con Herney en Cowork)

1. **Enfoque A:** extender `Header.tsx` como header único; portar todo lo del legacy adentro; **borrar `StoreHeader.tsx`**. Una sola fuente de verdad para el chrome.
2. **Tema adaptativo solo en la home.** La home conserva la barra transparente sobre el hero oscuro con crossfade dark↔light en scroll. Las páginas internas usan una barra **sólida clara fija** (sin transparencia, sin watcher — no hay hero oscuro debajo).
3. **Búsqueda:** campo inline en páginas internas (primaria para el que re-ordena). **Sin búsqueda en la home** (es landing de marketing; el hero no tiene buscador y se deja así).
4. **Ítems de cuenta colapsados en un menú "My account"** para no recargar el chrome minimal. El affordance de re-orden de la auditoría entra como **"Buy again"** dentro del menú → navega a `/orders` (no ejecuta la acción).
5. **Mobile:** barra = logo · carrito · hamburguesa; **drawer Vaul** con nav + ítems de cuenta + locale. En páginas internas, búsqueda como fila full-width bajo la barra.
6. **Arquitectura:** wrapper server delgado hace el fetch → `Header` presentacional puro recibe props. `HeaderThemeWatcher` (client) solo se monta en la variante `home`. Mantiene "no re-render en scroll".

## Arquitectura

### `HeaderContainer` (nuevo, async server component — reemplaza el fetch del StoreHeader)

Única responsabilidad: resolver datos y delegar el render. Hace su propio data-fetching (igual que el StoreHeader hoy) y pasa todo por props a `Header`.

```ts
// components/commerce/HeaderContainer.tsx
HeaderContainer(props: { variant: 'home' | 'inner'; initialTheme?: 'dark' | 'light' }): Promise<JSX.Element>
```

Resuelve: sesión (`auth()`), `cartCount` (`cartService.get`), flags (`rfq`/`credit`/`approvals` vía `isFeatureEnabled`), `notificationCount`, `impersonatingName` (si `session.impersonatingOrgId`), `locale` (`getLocale`). Renderiza `ImpersonationBanner` (si aplica) + `Header` con las props resueltas. Lo consumen los tres shells:
- `app/(storefront)/layout.tsx` → `<HeaderContainer variant="inner" />`
- `app/(account)/layout.tsx` → `<HeaderContainer variant="inner" />`
- `app/page.tsx` (home) → `<HeaderContainer variant="home" initialTheme="dark" />` (reemplaza el `<Header .../>` directo de hoy)

### `Header` (presentacional puro — extiende el actual)

Sin acceso a DB ni `auth()`. Todo por props:

```ts
interface HeaderProps {
  variant: 'home' | 'inner'
  locale: Locale
  isSignedIn: boolean
  initialTheme?: 'dark' | 'light'        // solo se usa en variant='home'
  cartCount: number
  notificationCount?: number
  flags: { rfq: boolean; credit: boolean; approvals: boolean }
}
```

El `ImpersonationBanner` lo renderiza `HeaderContainer` por encima de la barra (no entra en las props del `Header`).

Comportamiento por variante:
- **`home`:** monta `HeaderThemeWatcher`, `data-header-theme={initialTheme}`, estilos adaptativos dark/light (los actuales). **Sin campo de búsqueda.** Nav: Catalog · [signed-in: My account ▾ · carrito · campana] · [anon: Sign in · Register lima] · locale.
- **`inner`:** **sin** watcher, `data-header-theme="light"` fijo, barra sólida `surface` + border `line`. Nav: Catalog · **búsqueda inline** (`SearchBar` existente) · carrito (badge lima) · My account ▾ · campana (badge) · locale.

Mantiene los tokens y el contrato WCAG ya documentados en `Header.tsx` (logo crossfade, links/CTA AA en ambos temas).

### `AccountMenu` (nuevo, client component — desktop)

Dropdown disparado por "My account ▾". Ítems: **Orders** · **Buy again** (→ `/orders`) · **Quotes** (flag `rfq`) · **Invoices** (flag `credit`) · **Approvals** (flag `approvals`) · separador · **Sign out** (`SignOutButton` existente). Solo se renderiza si `isSignedIn`. Anónimo: en su lugar van "Sign in" + "Register" (CTA lima) directos en la barra.

Interacción accesible: abre/cierra por click y teclado, cierra por click-fuera y `Esc`, foco gestionado (primer ítem al abrir, retorno al trigger al cerrar), `aria-expanded`/`aria-controls` en el trigger.

### `MobileNav` (nuevo, client component — drawer Vaul)

Hamburguesa en la barra (`< md`). Abre un **drawer Vaul** con: búsqueda, nav (Catalog), ítems de cuenta (Orders, Buy again, Quotes/Invoices/Approvals gateados, Sign out / Sign in + Register), notificaciones y locale. Carrito queda visible en la barra (no en el drawer). Vaul aporta focus-trap, scroll-lock y cierre por overlay/`Esc`. En páginas internas, además, la búsqueda aparece como fila full-width bajo la barra (no solo dentro del drawer).

### Borrado del legacy

Tras migrar los tres shells, **eliminar `components/commerce/StoreHeader.tsx`** y su test (`app/(storefront)/__tests__/layout.test.tsx` se actualiza para el nuevo container). Verificar que `grep StoreHeader` queda en 0.

### i18n

Hoy coexisten dos namespaces de nav: `landing.nav.*` (header nuevo) y `storefront.nav.*` (legacy). **Consolidar en un set único** para el header unificado (EN default + ES), cubriendo: catalog, placeholder de búsqueda, cart, label del menú de cuenta, buyAgain, orders, quotes, invoices, approvals, notifications, signIn, signOut, register, labels de locale. Esto se cruza con el i18n sweep pendiente (`docs/plans/2026-06-10-i18n-storefront-sweep.md`) pero las claves del header se entregan con esta superficie, autocontenidas.

**Orden-sensible (no romper labels en vuelo):** el set consolidado se agrega de forma **aditiva** primero (sin retirar nada); los namespaces viejos solo se retiran **en el mismo commit** que migra a su último consumidor — `landing.nav.*` se elimina junto con la migración de la home, `storefront.nav.*` junto con el borrado de `StoreHeader`. Nunca retirar una clave antes de que su última página deje de usarla, o la página renderiza labels rotos.

## A11y (WCAG 2.1 AA — no negociable)

- Logo, links, Register CTA, locale y campana pasan AA en **ambos** temas (ya documentado en `Header.tsx`; mantener).
- Botones-ícono (carrito, campana, hamburguesa) con `aria-label`; conteos anunciados (p. ej. `aria-label="Cart, 3 items"`).
- `AccountMenu` y drawer Vaul: focus-trap, retorno de foco al trigger, cierre por `Esc`, `aria-expanded`.
- Touch targets ≥ 44px en mobile.
- **Cero motion nuevo en páginas internas** — la barra interna es estática. No propagar GSAP al flujo de compra (regla §c de la auditoría). El crossfade adaptativo vive solo en la home y respeta `prefers-reduced-motion` (ya implementado).

## Testing

**Unit (`Header` presentacional + `AccountMenu`):**
- `variant='home'` vs `variant='inner'`: presencia/ausencia de búsqueda, watcher montado solo en home.
- signed-in vs anónimo: menú de cuenta vs Sign in/Register.
- flags on/off: quotes/invoices/approvals aparecen/desaparecen.
- `cartCount`/`notificationCount`: badge se muestra solo con conteo > 0.
- `AccountMenu`: abre/cierra por teclado, cierra por `Esc`, foco correcto.

**e2e (contra build de prod, TST-6):**
- El chrome es **consistente** cruzando home → /catalog → /cart (mismo header, sin costura de dos-marcas).
- Drawer mobile abre y cierra (viewport chico).
- "Buy again" en el menú navega a `/orders`.

**Gate ejecutable (bloqueante):** `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build` con `STORE_ID=pipower` y `DATABASE_URL` explícito, + el check axe del e2e de prod (`test:e2e:prod`).

**Nota sobre `impeccable`:** no está instalado en el repo (no hay script en `package.json` ni binario en `node_modules/.bin`; `npx impeccable detect` del brief de rediseño queda pendiente de instalación). **No es parte del gate bloqueante** hasta que se instale. La verificación de diseño real de esta superficie es el **review de Herney en localhost** (obligatorio antes de merge) — el chrome es visual y no se auto-verifica.

## Alcance

**Dentro:** solo el chrome — `Header` (desktop + mobile, variantes home/inner), `HeaderContainer`, `AccountMenu`, `MobileNav`, consolidación de claves i18n del header, migración de los tres shells, borrado de `StoreHeader`.

**Fuera (superficies siguientes, cada una su propio branch → spec → PR, heredando ya este chrome):**
1. Catálogo + ProductCard (con Vista B escrita en el spec del design system)
2. PDP
3. Carrito + Checkout (Vaul drawer mobile; ya destrabado tras la unificación wire-payment #29)
4. Auth (sign-in / sign-up)
5. Cuenta / Admin (post-launch)

Además, en paralelo y fuera de esta superficie: el i18n sweep pendiente (claves no-header).

## Riesgos y orden de ejecución

- **Blast radius visual alto.** Es el PR más grande del rediseño: cambia el chrome de **todas** las páginas internas de golpe (barra sólida clara que hoy no existe). Mitigación: e2e de consistencia + check axe + commit por pieza (revisable incrementalmente) + review obligatorio de Herney en localhost. El chrome es global, no admite feature-flag parcial; el control es el review humano antes de merge.
- **`AccountMenu` es la pieza frágil.** El drawer Vaul trae su a11y (focus-trap/Esc/scroll-lock); el dropdown de cuenta es custom y ahí se esconden los bugs (foco al abrir, retorno al trigger, `Esc`, click-fuera, `aria-expanded`). **Test-first** su comportamiento de teclado/foco antes del markup.

**Orden de commits sugerido (hace seguro el retiro de claves):**
1. i18n: agregar el set consolidado de claves del header (aditivo, sin retirar nada).
2. `HeaderContainer` + `Header` variante `inner` con las claves nuevas; migrar layouts storefront + account. (La home sigue con `<Header>` directo y `landing.nav.*` intactas.)
3. `AccountMenu` (test-first a11y).
4. `MobileNav` + drawer Vaul.
5. Migrar la home a `<HeaderContainer variant="home">` **+ retirar `landing.nav.*`** (atómico, mismo commit).
6. Borrar `StoreHeader` **+ retirar `storefront.nav.*` huérfanas**; actualizar `layout.test`.
7. e2e de consistencia (build de prod) + check axe.

## Reglas de ejecución

- Branch `redesign/header`. PR. Review de Herney en localhost antes de merge. No mergear sin confirmación.
- Nunca mostrar dato inventado — solo datos reales o constantes spec-aprobadas.
- TDD donde aplique (el `Header` presentacional y `AccountMenu` se prestan a test-first).
- Conventional Commits, un commit por pieza funcional (ver orden arriba).
