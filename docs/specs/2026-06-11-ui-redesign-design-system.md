# UI Redesign — "Back to 100%" Design System

**Fecha:** 2026-06-11  
**Estado:** APROBADO — ejecución en curso  
**Responsable:** Herney (diseño) + Claude Code (implementación)  
**Mockup de referencia:** `docs/mockups/pipower-back-to-100.html`

---

## Dirección

Identidad visual "Back to 100%": oscuro, técnico, lima como acento único. Pensado para PiPower (baterías iPhone B2B) pero implementado como capa de tema sobre la plataforma multi-tenant.

Concepto: el gauge de batería que anima de 0 → 100% es el momento firma de la marca. Todo lo demás refuerza ese mensaje: cero ciclos, salud completa, capacidad superior al OEM.

---

## Tokens de diseño

### Colores
| Token            | Valor        | Uso                                      |
|------------------|--------------|------------------------------------------|
| `accent`         | `#88d810`    | CTA, íconos activos, contornos, underlines |
| `lime-deep`      | `#5fa000`    | Texto lime sobre fondos blancos (AA-safe) |
| `neutral-900`    | `#1a1f2e`    | Fondo hero / stat strip / header oscuro  |
| `surface`        | `#ffffff`    | Fondos claros, cards                     |
| `ink-950`        | `#1a1f2e`    | Texto principal sobre surface            |
| `ink-500`        | `#6b7280`    | Texto secundario                         |
| `ink-300`        | `#9ca3af`    | Texto terciario (SKU, labels)            |
| `line`           | `#e5e7eb`    | Borders sutiles                          |
| `muted`          | `#f4f5f0`    | Fondos alternos (How it works)           |

### Tipografía
- **Sans:** Geist Sans — display, headings, body
- **Mono:** Geist Mono — SKUs, métricas, readouts, chips
- `text-display`: `clamp(52px, 6vw, 80px)` — headline hero
- `text-h2`: `clamp(32px, 4vw, 44px)` — section titles
- `text-body-lg`: `18px/1.55` — párrafos hero
- Tracking: display `−0.045em`, h2 `−0.035em`

### Radio
- `rounded-card`: `14px` — product cards
- `rounded-button`: `9px` — CTAs, chips

---

## Componentes firma

### HeroGauge (`components/home/HeroGauge.tsx`)
- SVG 300×480px. Well: x=14 y=38 w=272 h=428. ClipPath para fill.
- GSAP `attr`-based: anima `y` + `height` del fill rect (no CSS scaleY).
- Duración: 2.4s, `power3.out`. Delay: 0.25s.
- Contador `[data-hero-pct]` sincronizado con el fill.
- SSR default = 100% (fallback sin JS / `prefers-reduced-motion`).
- Chips flotantes: "0 / cycle count" + "+12% / capacidad vs OEM".

### StatStrip (`components/commerce/StatStrip.tsx`)
Métricas fijas en home: **0×** ciclos · **100%** salud · **+12%** capacidad · **24–48h** despacho.  
Fondo `neutral-900`. Números mono con unidad en `accent`. 4 columnas.

### SpecReadout (`components/commerce/SpecReadout.tsx`)
Instrumento 3 columnas en product cards y PDP.  
Valores constantes por producto nuevo: `100%` salud / `0` ciclos.  
Capacidad: **solo si existe `product.attributes.capacity`** — nunca inventar.  
El valor `up` (capacidad) renderiza en `lime-deep` (AA sobre blanco).

---

## Secciones home

| Sección         | Fondo           | `data-header-theme` |
|-----------------|-----------------|---------------------|
| Hero            | `neutral-900`   | `dark`              |
| Stat strip      | `neutral-900`   | `dark`              |
| Featured grid   | `surface`       | `light`             |
| How it works    | `muted`         | `light`             |
| Footer          | `surface`       | `light`             |

### Featured grid
- Fuente: `prisma.product` real (mismo filtro que `FeaturedGrid.tsx`).
- Sección se oculta si `featuredProducts.length === 0`.
- Imagen: `product.imageUrl` si existe; fallback = battery glyph SVG inline.
- Badge "Tag-On Flex": solo si `product.attributes.tagOnFlex === true`.
- Precio: solo a usuarios autenticados (B2B); unauthenticated → i18n key `landing.featured.loginForPrice`.
- Capacity en SpecReadout: solo si `product.attributes.capacity` es string real.

---

## Header unificado (`components/commerce/Header.tsx`)

> **Actualizado 2026-06-13 (branch `redesign/header`):** el header dejó de ser "solo home".
> Ahora es **un único chrome** para storefront + account + home. Spec de la unificación:
> `docs/superpowers/specs/2026-06-13-header-unification-design.md`.

`Header.tsx` es **presentacional** y recibe `variant: 'home' | 'inner'`. El fetch de datos
(sesión, cart count, flags, locale, impersonation) vive en `HeaderContainer.tsx` (server
component, único punto de fetch), consumido por los tres shells con la `variant` correspondiente.

- **`variant='home'`** — adaptativo scroll-aware. `HeaderThemeWatcher` (client) observa
  `[data-header-theme]` con IntersectionObserver. Dos estados: `dark` (transparente sobre
  hero/stat-strip) → `light` (semi-opaco `surface/90` sobre secciones claras). Transición CSS
  `transition-colors duration-300`. Logo crossfade (dark variant / default).
- **`variant='inner'`** — barra sólida clara fija (sin `HeaderThemeWatcher`), con `SearchBar`
  inline. Es el chrome de todas las páginas internas; mata la costura de "dos marcas"
  home↔storefront.

Affordances compartidas (ambas variantes): link de carrito con badge, `AccountMenu`
(dropdown de cuenta con a11y completa — `aria-haspopup/expanded/controls`, foco al abrir,
Esc cierra y devuelve foco, click-outside), `NotificationBadge`, y `MobileNav` (drawer Vaul,
`direction="right"`). i18n consolidado bajo el namespace `header.*` (se retiraron
`landing.nav.*` y `storefront.nav.*`). `StoreHeader` legacy eliminado.

---

## HomeMotion (`components/home/HomeMotion.tsx`)

GSAP ScrollTrigger. Animaciones:
- Hero gauge fill + counter (one-shot, congela en 100%).
- Hero text stagger: `[data-motion-step]` fade+rise `power3.out 0.7s stagger 0.07s`.
- Steps section: líneas horizontal/vertical `scaleX/scaleY` + items stagger.
- Generic `[data-reveal]`: ScrollTrigger por elemento, `top 88%`, once.

`prefers-reduced-motion: reduce` → skip todos los efectos (SSR state queda como visual final).

---

## i18n

Locales: `en-US` (default) + `es-419`.  
Secciones activas: `landing.hero.*`, `landing.stats.*`, `landing.featured.*`, `landing.howItWorks.*`, `spec.label.*`.

---

## Reglas de ejecución

- Una branch `redesign/<superficie>` por superficie. PR. Review de Herney en localhost antes de merge.
- Nunca mostrar dato inventado (capacidad, precio, estado) — solo datos reales de DB o constantes spec-aprobados (100% salud / 0 ciclos).
- `impeccable detect` en cada PR — 0 issues antes de merge.
- Gate completo: `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Nota: vitest necesita `DATABASE_URL` explícito — sin él tira ~239 rojos de entorno (no regresión).
