# Spec — Carrito + Checkout · rediseño "Back to 100%"

**Fecha:** 2026-06-14
**Origen:** Cuarta superficie del rediseño, tras Header · Catálogo · PDP. `/cart` (154 líneas) y `/checkout` (219 líneas) usan los primitivos viejos (`Card`/`Badge`/`Button`). El checkout estaba congelado hasta que aterrizara la unificación wire-payment (#29) — **ya aterrizó**, así que se destraba. Incorpora el `mini-cart drawer` (Vaul) que el plan de rediseño pedía.
**Negocio:** B2B mayorista Pi-Power. El carrito y el checkout son el flujo que el comprador que re-ordena recorre cada semana — velocidad-a-orden manda.

## Objetivo

Restilar `/cart` y `/checkout` al sistema "Back to 100%", agregar un **mini-cart drawer** (Vaul) desde el ícono de carrito del header, **preservando toda la lógica** (snapshot pricing, gating de verificación, detección de issues, wire-payment, colocación de orden). Velocidad y CWV verdes son requisito; cero motion pesado (igual que catálogo/PDP).

## Decisiones de diseño (cerradas con Herney en Cowork)

1. **Alcance:** mini-cart drawer (net-new) **+** restyle de `/cart` y `/checkout`.
2. **Mini-cart drawer (Vaul):** se abre desde el ícono de carrito del header — slide-in a la derecha en desktop, bottom-sheet en mobile. Contenido: ítems (thumbnail · nombre · stepper `− n +` · precio de línea · remove) → subtotal → **Checkout** (lima) + **View full cart** (→ `/cart`). Empty state. Reusa `cartService` + las actions de quantity/remove.
3. **Add → mini-cart:** agregar muestra **toast + actualiza el badge** del ícono (como hoy); el drawer se abre **solo al clickear el ícono**. No auto-abre — bulk-friendly (el que re-ordena mete muchos ítems sin que el drawer salte cada vez).
4. **`/cart` (página completa):** ítems con imagen + stepper + remove + estado "no disponible" (inactive), y **resumen sticky** (subtotal → checkout). Más espacio que el mini-cart para editar en lote.
5. **`/checkout`:** review de líneas → selección de direcciones (billing/shipping) → **detección de issues bien visible** (banner que bloquea confirm si hay `inactive`/`insufficient-stock`) → confirm. Resumen de orden sticky en desktop, **Vaul drawer en mobile**. Toda la lógica intacta.

## Arquitectura

### `MiniCart` (nuevo, client — Vaul drawer)

Disparado por el ícono de carrito del header (cross-surface: el ícono pasa de link `/cart` a trigger del drawer; en no-JS o como fallback, sigue linkeando `/cart`). Trae los ítems del carrito al abrir (server action o fetch de `cartService.get`), renderiza la lista compacta + subtotal + CTAs. Reusa las actions existentes (`updateCartQuantityAction`, `removeCartItemAction`) para editar inline. Vaul aporta focus-trap, scroll-lock, cierre por overlay/Esc, y el bottom-sheet mobile. Gating: el carrito es de clientes verificados (`requireVerifiedCustomer` ya gatea `/cart`); para no-verificados el ícono no muestra mini-cart con precios.

### `/cart` y `/checkout` — restyle, misma lógica

Se mantiene el data-fetching y la lógica:
- **Cart:** `cartService.get`, subtotal con `lib/money` (`addMoney`/`multiplyMoney`/`formatMoney`), manejo de ítems `inactive` (badge "no longer available" + opacity), gating `requireVerifiedCustomer`.
- **Checkout:** `checkoutService.review` (issues), `customersService.listAddresses` (defaults billing/shipping), `hasBlockingIssue` (`inactive`/`insufficient-stock`), confirm → `placeOrder` (reserva de stock, wire-payment). Verification gate antes del form.

Solo cambia la **presentación**: tokens nuevos, line items instrument-grade, el banner de issues prominente (no un badge perdido), el resumen como panel sticky/Vaul. Reusar el stepper compartido y los helpers de `product-display` donde aplique.

### Línea de carrito — compartida

Un componente de línea de carrito con dos densidades: compacta (mini-cart) y completa (`/cart`). Misma data, misma action de quantity/remove. DRY donde tenga sentido; no dos implementaciones divergentes.

## Preservado (no se toca la lógica)

Snapshot pricing del carrito · gating `requireVerifiedCustomer` · ítems inactive/unavailable · subtotal (`lib/money`) · `checkoutService.review` + issues · direcciones billing/shipping + defaults · `hasBlockingIssue` bloquea confirm · `placeOrder` (reserva de stock + wire-payment) · i18n.

## A11y (WCAG 2.1 AA)

- Drawer Vaul: focus-trap, retorno de foco al ícono trigger, cierre por Esc, scroll-lock. El ícono trigger con `aria-expanded`/`aria-haspopup`.
- Banner de issues con `role="alert"`; confirm deshabilitado comunica el motivo (no solo color).
- Steppers de cantidad operables por teclado, `aria-label` en − / + y en remove. Precios/subtotales como texto.
- Touch targets ≥44px en mobile. Cero motion nuevo salvo el deslizamiento del drawer (Vaul, respeta `prefers-reduced-motion`).

## Testing

**Unit:** mini-cart renderiza ítems + subtotal + empty state; gating (verificado vs no); línea de cartón compacta vs completa; checkout: `hasBlockingIssue` deshabilita confirm; subtotal correcto.
**e2e (prod build, TST-6):**
- Add to cart → toast + badge incrementa; **no** auto-abre el drawer.
- Click ícono → drawer abre con los ítems; "Checkout" navega a `/checkout`; "View full cart" a `/cart`.
- `/cart` → editar cantidad / remove refleja subtotal.
- `/checkout` con issue bloqueante (item inactive) → confirm deshabilitado + banner visible.
- Compra completa (buyer verificado) → orden colocada (reusar/extender el e2e de buyer flow existente).
**Gate ejecutable:** `pnpm format && lint && typecheck && test && build` con `STORE_ID=pipower` + `DATABASE_URL` + `test:e2e:prod` + axe.

## Alcance

**Dentro:** `MiniCart` drawer (Vaul) + trigger en el ícono del header; restyle de `/cart` y `/checkout`; línea de carrito compartida (compacta/completa); banner de issues prominente; resumen sticky/Vaul.

**Fuera (FU / superficies siguientes):**
- Cambios al método de pago / UI de wire-payment (ya aterrizó #29 — solo se restila lo visible).
- CRUD de direcciones rediseñado (se restila el selector existente, no se rehace la gestión).
- Net-new steps del checkout (se preserva el flujo actual review→addresses→confirm).
- **Auth** (sign-in / sign-up) y **Cuenta/Admin** → superficies siguientes.

## Riesgos / notas

- **Cross-surface (header):** el ícono de carrito pasa a abrir el drawer → re-verificar el header en el review. Fallback a `/cart` sin JS.
- **Flujo con dinero:** es el camino de revenue. El restyle **no toca** `placeOrder`/checkout service; cualquier cambio que roce la lógica va con su test. El e2e de compra completa es el gate que prueba que el flujo sigue entero (la auditoría marcó que faltaba cobertura e2e de compra — ya existe desde el Top 10 #6; extenderla, no romperla).
- Mini-cart en prod: lee del DB (no depende de Meili) → no afectado por la instancia caída.

## Ajustes de implementación (confirmados en el review de CC)

1. **Trigger del mini-cart = `<a href="/cart">` con `Drawer.Trigger asChild`.** El ícono de carrito sigue siendo `role=link` (varios tests asertan `getByRole('link')` y es el fallback no-JS). Vaul intercepta el click para abrir el drawer; sin JS, navega a `/cart`. **NO** convertir a `<button>` — rompería header/catalog e2e.
2. **Extraer `hasBlockingIssue` a `modules/checkout`** como función pura (hoy inline en `checkout/page.tsx:35`, solo testeable vía e2e) → unit-testeable.
3. **Agregar un purchase e2e a `tests/e2e-prod/`** (no solo el de dev `tests/e2e/`): es el camino de revenue, el gate es `test:e2e:prod`, y la auditoría marcó la cobertura e2e de compra como faltante (Top 10 #6). Compra completa contra el build de prod (regla TST-6).
4. **MiniCart lazy:** traer los ítems **al abrir** (server action que reusa `cartService.get`), no en cada render del header — no inflar el chrome.
5. **Gating no-verificado:** el ícono no muestra mini-cart con precios para no-verificados → degrada a link `/cart` (que ya redirige por `requireVerifiedCustomer`).

Cross-surface: re-verificar `header.spec` + axe del header (el ícono cambió). `aria-label="Cart, N items"` se preserva.

## Reglas de ejecución

- Branch `redesign/cart-checkout`. PR. Review de Herney en localhost antes de merge. No mergear sin confirmación.
- Nunca dato inventado. TDD donde aplique (línea de carrito, gating, issues). Conventional Commits, un commit por pieza (MiniCart → trigger header → /cart → /checkout → e2e).
