# Rediseño UI — storefront premium / minimal

> Brief Cowork → Claude Code CLI. Esto es **dirección de diseño**, no un plan paso a paso: la artesanía la conduce la skill `impeccable`. Trabajo **superficie por superficie con review de Herney** entre cada una (el diseño es visual, no se auto-verifica). Branch por superficie. NO mergear sin review.

## Objetivo

Elevar el storefront de PiPower a una estética **premium / minimal** (limpio, tipografía grande, mucho aire, accent de marca con moderación, motion sutil y con propósito), manteniendo funcionalidad, i18n y accesibilidad.

## Regla de marca — OBLIGATORIA (no negociable)

Paleta = **verde lima `#88D810`** (el de la caja de baterías / logo) + **negro-slate `#1A1F2E`** + **blanco `#FFFFFF`**. Ya están en `stores/pipower/theme.config.ts` (`accent` / `primary` / `surface`, + `muted #F4F7EE`). Colores extra **solo si matchean estéticamente** con esos tres.
- **WCAG:** el lima `#88D810` es muy brillante → **nunca** como fondo de botón con texto blanco. Va como **accent/badge/borde/highlight con texto oscuro**. Botones primarios = slate `#1A1F2E` con texto blanco.
- Usar los tokens del theme (CSS vars), no hex inventados.

## Herramientas (instalar + usar)

1. **impeccable** (skill de diseño, sobre `frontend-design`): instalar en el proyecto — `cp -r dist/claude-code/.claude your-project/` desde el repo `pbakaus/impeccable`, o bajar de impeccable.style. Workflow: `/impeccable teach` (fijar el design system de PiPower con esta paleta + voz de marca) → `/impeccable craft <superficie>` → `/impeccable audit` (a11y/perf/responsive) + `npx impeccable detect` (anti-patterns sin LLM). Respetar sus anti-patterns (sin Inter genérico, sin gradientes violeta, sin cards-en-cards, sin gris-sobre-color, sin bounce easing).
2. **GSAP** (`pnpm add gsap`): motion orquestado — entrada del hero, reveals de productos al scroll (ScrollTrigger), micro-interacciones.
3. **Vaul** (`pnpm add vaul`): drawer del carrito en mobile. **Sonner** ya está para toasts.
4. **Principios de Emil Kowalski** ("Great animations"): motion natural (spring/easing, no lineal), rápido (~200-300ms), interrumpible, desde el origen. **`prefers-reduced-motion` obligatorio** en toda animación.

## Constraints (no romper)

- **WCAG 2.1 AA** (requisito existente del proyecto) — contraste, foco, touch targets, teclado.
- **i18n:** todo texto visible pasa por `t(locale, …)` con paridad EN/ES. NO hardcodear strings (hay barrido i18n en curso; no re-introducir literales).
- **Funcionalidad intacta:** no romper el flujo de compra, login, carrito, etc. El rediseño es visual + motion, no cambia lógica.
- **Performance:** GSAP/animaciones no deben degradar el LCP. Lazy donde corresponda. `next/image` ya optimiza las imágenes (no romperlo).
- No tocar `MAINTENANCE_MODE`, pagos, adaptadores, ni el modelo de datos.
- Gate verde por superficie: `pnpm format && lint && typecheck && test && STORE_ID=pipower pnpm build`.

## Referencia visual

`docs/mockups/pipower-premium-minimal.html` = referencia de **layout/feel** (NO de tipografía ni del verde — ahí usé un system font y un verde más oscuro por error). impeccable refina tipo/color/motion sobre esta base, con la paleta de marca correcta.

## Scope y orden (superficie por superficie)

1. **Home** (`app/page.tsx` + componentes de la home) — primera, mayor impacto.
2. Catálogo + **ProductCard** (la grilla que más se ve).
3. PDP (`products/[slug]`).
4. Flujo de compra (carrito/checkout) + el drawer con Vaul.
5. Auth (sign-in/sign-up) — pulido.

Por cada superficie: branch → `/impeccable craft` → gate verde → push + PR → **Herney revisa el deploy/preview** → iterar → siguiente. **No** un PR gigante.

## Arranque

Empezar por **instalar impeccable + `/impeccable teach`** (fijar el design system con la paleta) y después **la home**. Reportar el design system que impeccable proponga (tipografía, escala, tokens) ANTES de aplicarlo a fondo, para validar con Herney.
