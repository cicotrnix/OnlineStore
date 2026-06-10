# Design

> **Status:** proposal — pending Herney's review per `docs/plans/2026-06-10-ui-redesign-brief.md`. Do NOT apply to surfaces (Home, Catalog, PDP, Checkout, Auth) until this file is approved.

## Theme

Light surface, slate ink, lime accent. The storefront is daylight: a real product, photographed, on a clean ground, with confident type and a single bright color used as punctuation.

**Scene sentence (per impeccable):** A repair technician opens the storefront on a desktop in a workshop with daylight overhead, on a small countertop monitor, while a phone is mid-repair on the bench. The page must read instantly under fluorescent or window light, with no eye strain when shifted to from a backlit phone screen. → forces light surface, high-contrast type, no dark-mode reflex.

Color strategy: **Restrained** (impeccable's tier 1). Tinted neutrals + one accent ≤10% of surface area. The product imagery (battery, packaging) carries the visual weight. The chrome is calm.

## Color Palette

Tokens already shipped at `stores/pipower/theme.config.ts`. The brief locks the brand triad; this proposal adds the ramp + the OKLCH equivalents for math + the role assignments. No new hex values invented outside this set.

### Brand triad (locked by brief — non-negotiable)

| Role | Hex | OKLCH | Use |
|---|---|---|---|
| `primary` (slate ink) | `#1A1F2E` | `oklch(20.5% 0.025 261)` | Headings, body, primary button surface (with white text), borders on solid blocks. |
| `accent` (brand lime) | `#88D810` | `oklch(83.5% 0.218 130)` | Badges, keylines, hover highlights, brand-asset color in imagery, focus rings. **Banned as button-fill behind white text** (AA fails). |
| `surface` (paper white) | `#FFFFFF` | `oklch(100% 0 0)` | Body bg by default. |
| `muted` (tinted off-white) | `#F4F7EE` | `oklch(97.4% 0.016 122)` | Section bands, card surfaces against white, IMEI lookup composite bg. |
| `danger` | `#A32D2D` | `oklch(45.5% 0.146 27)` | Error states, refund / fail flows. |

### Derived ramp (proposal — add to theme tokens)

A 5-stop ink ramp (off the slate) and a 5-stop neutral ramp (off the muted). All derived in OKLCH from the locked triad. No "warm cream" tints; the off-whites lean toward the lime hue by a hair (chroma 0.01) so the system feels coherent, not generic.

```
ink-950  #1A1F2E   primary
ink-700  #3B4253   body
ink-500  #6B7280   secondary text (verify AA on white: passes ≥4.5:1)
ink-300  #C5C9D0   dividers, disabled text
ink-100  #ECEDF0   subtle borders, keyline on muted

neutral-50  #FFFFFF   surface
neutral-100 #F4F7EE   muted (current)
neutral-200 #E8ECE0   section divider on muted
neutral-700 #2B3140   dark band (hero product tile bg)
neutral-900 #14181F   deepest, only for high-contrast cinematic blocks
```

### Color rules

- Body text on white: `ink-700` (`#3B4253`) — 9.4:1 (passes AAA).
- Body text on muted: `ink-700` — 9.0:1.
- Secondary text on white: `ink-500` (`#6B7280`) — 4.6:1 (passes AA body).
- Lime accent on white: keyline OK (decorative), text NOT OK (3.0:1 fails body).
- Lime accent on slate `ink-950`: 9.6:1 — passes AAA — this is the SINGLE place lime-on-text is permitted (e.g., a logo accent dot in the hero, or a stat number on a dark tile).
- Lime as button fill: text MUST be `ink-950` slate (10.3:1 AAA). No white text on lime.
- Focus ring: `accent` 2px solid + 2px offset on `surface`/`muted`; on dark blocks, white 2px + 2px offset.

## Typography

**Drop Inter.** Current `theme.config.ts` sets `Inter, system-ui` — this trips the impeccable anti-pattern ("Inter for everything") and reads as the AI default.

### Recommended pairing (proposal)

**Geist Sans** (UI / body / display) + **Geist Mono** (technical specs, IMEI, mAh, SKU, prices in spec sheets).

Why:
- **Contrast axis is type-class, not visual variant** — geometric sans + mono = legitimate impeccable pairing (not "two geometric sans"). The mono carries the "technical" half of the brand personality at the type level.
- **Free, distributed via `geist` npm package** (zero licensing risk; SIL OFL).
- **Distinct from Inter / Helvetica reflex** — Geist's apertures and the mono's slab terminals read as "engineered" without screaming brand.
- **Variable axes** (weight 100–900) → one file, many roles, fewer requests.

Alternates considered:
- **Manrope + JetBrains Mono** — solid backup; Manrope is slightly warmer; would work for a less Vercel-coded feel.
- **Söhne Buch + Söhne Mono** — Stripe-grade; ~$700/yr commercial license; revisit only if the brand later expands beyond storefront.
- **Inter Display / Inter Tight** — borderline; same family as the body anti-pattern; do not propose.

### Scale (clamp-based, hero max ≤6rem per impeccable rule)

```css
--font-display: clamp(2.5rem, 4vw + 1rem, 5.5rem);   /* hero h1, wordmark — 40–88px */
--font-h1:      clamp(2rem,  3vw + 0.75rem, 3.5rem); /* page h1 — 32–56px */
--font-h2:      clamp(1.5rem, 2vw + 0.5rem, 2.25rem);/* section h2 — 24–36px */
--font-h3:      1.25rem;  /* 20px — card titles, PDP section heads */
--font-body-lg: 1.125rem; /* 18px — hero subhead, lead paragraphs */
--font-body:    1rem;     /* 16px — default body */
--font-small:   0.875rem; /* 14px — meta, secondary */
--font-meta:    0.75rem;  /* 12px — labels, captions */

--font-mono-spec: 0.875rem; /* 14px — spec-sheet rows, IMEI input value */
--font-mono-pill: 0.75rem;  /* 12px — SKU pills, model badges */
```

### Type rules

- Body line-length: 60–72ch on prose; 100% width OK on UI rows.
- Display heading letter-spacing: `-0.025em` to `-0.035em`. Never tighter than `-0.04em`.
- Hero h1: `text-wrap: balance`. Prose h2-h3: `text-wrap: pretty`.
- Weights: 400 body, 500 emphasis, 600 UI bold, 700 display. Avoid 800/900 — too SaaS-CTA.
- Mono is for **values**, not labels. "IMEI" label is sans; the IMEI string is mono. "Capacity" label is sans; "3140 mAh" value is mono.

## Layout

### Grid

- Max content width: **1240px** (slightly tighter than the SaaS 1280 reflex).
- Gutter: 32px desktop / 24px tablet / 20px mobile (left+right).
- Section vertical rhythm: 96px desktop / 64px tablet / 48px mobile between major sections. Pause is part of the brand.
- Card grid for product cards: `repeat(auto-fit, minmax(280px, 1fr))` with 24px gap. No fixed breakpoints.

### Spacing scale

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128` (px). Use 12 sparingly; the workhorses are 8/16/24/32/48/64.

### Radius (keep current theme tokens)

`card: 12 · button: 8 · input: 8`. Pills (badges) = full radius. Hero product tile = 16 (one tier above standard card to signal hierarchy).

### Z-index scale (semantic, not arbitrary)

```
--z-dropdown:        10
--z-sticky:          20
--z-modal-backdrop:  30
--z-modal:           40
--z-toast:           50
--z-tooltip:         60
```

No literal `9999`. Ever.

## Components

### Primary button (slate)

- Surface: `ink-950`. Text: `surface` white. Weight 500.
- Hover: lift +1px translate-y, ring `accent` 2px appears around the button.
- Active: translate-y returns to 0, ring stays.
- Disabled: surface `ink-300`, text `ink-500`, no ring on hover.
- Min height: 44px (touch target). Padding: 12px 20px.

### Accent button (lime ghost / outline)

- Surface: transparent. Border: 1.5px `accent`. Text: `ink-950`.
- Hover: surface fills `accent` (text stays `ink-950` — passes AAA).
- Used for secondary CTAs (e.g., "Compatibility check") where slate would be too heavy.

### PaymentBadge (already shipped in PR #29 — keep)

`Paid` → bg `accent` tint (~10% mix on white), text `ink-950`, no border.
`Payment pending` → bg amber tint, text amber-900 (existing). Out of scope.
Cancelled → null (existing).

### Card

`bg surface`, `ring-1 ring-ink-100`, `rounded-12px`. NO box-shadow by default. On hover (product cards only): `ring-ink-300`, translate-y `-2px`, 200ms `ease-out-quart`.

### Hero product tile (dark block)

Full-width on Home + PDP, `bg neutral-900` (`#14181F`), product photo center, slate-to-near-black radial behind the cell. Glow on the cell uses `box-shadow` with low `accent` opacity (~12%), tasteful. This is the ONE place dark surface lives — by exception, not by default.

### IMEI lookup composite

`bg muted` (`#F4F7EE`), `ring-1 ring-accent` (2px on focus-within), input is `font-mono-spec`, label is sans + uppercase tracked +0.05em (one localized eyebrow is fine; the rule bans eyebrows OVER EVERY SECTION). CTA is the accent ghost button.

### Form inputs

Height 44px. Background `surface`. Border `ink-100` 1px. Radius 8. Focus: 2px `accent` ring + 2px offset. Error: 1px `danger` border + helper text in `danger`.

### Anti-components (do not introduce)

- **Tabs that aren't tabs** (visually pill-shaped buttons rendered as a row, but no actual tab semantics). Use `<nav>` or `role="tablist"` or links.
- **Modals for confirmations that should be inline.** "Are you sure?" with one accept button is friction, not safety.
- **Card-in-card** nesting. If a card needs a sub-card, the parent isn't really a card.

## Motion

### Library

GSAP (already installed) + ScrollTrigger for reveals. Vaul for the mobile cart drawer. Sonner for toasts (already shipped).

### Easing

- UI micro (hover, focus, press): `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart). 150–200ms.
- Hero entry: `power3.out` GSAP (= ease-out-cubic). 600–800ms total. Staggered children 60ms.
- ScrollTrigger reveals: `power2.out`. 400ms. Each section's reveal is shaped to the content (no uniform reflex per impeccable's rule).
- NO `back.out` / bounce / elastic.

### `prefers-reduced-motion` (required)

Every GSAP timeline opens with:

```ts
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReduced) {
  // Skip transforms. Apply final state immediately.
  gsap.set(elements, finalStateProps)
  return
}
```

Reveal-on-scroll content is **visible by default** in CSS. The animation only re-plays it on first intersect. If the timeline never fires (headless render, prefers-reduced, hidden tab), the content is already on the page.

### Where motion lives

- **Hero entry on `/`** — wordmark fade-up + dark product tile slide-up + accent glow build over 800ms.
- **Product card reveals on scroll** — fade-up + 8px translateY, staggered 60ms across the grid.
- **PDP image gallery** — crossfade between angles, 200ms.
- **Vaul cart drawer** — spring open, default Vaul physics, ~200ms close.
- **PaymentBadge transition** (PENDING → PAID after Mark paid) — 300ms color crossfade, no transform.
- **Button micro-states** — 150ms.

### Where motion does NOT live

- No background-gradient crawl.
- No marquee logos.
- No parallax on hero photography.
- No looping ambient animation.

## Open questions for Herney

1. **Type family confirm.** Geist Sans + Geist Mono (free, Vercel) is the proposal. OK to commit, or do you want me to evaluate Manrope + JetBrains Mono first?
2. **Audience tilt confirm.** PRODUCT.md positions primary = B2B repair shops, secondary = tech-savvy B2C. If actually B2C-primary, the IMEI lookup affordance moves from hero-primary to PDP-only.
3. **Dark hero tile.** I'm proposing one dark block (the product tile) as exception. Alternative: keep everything light. Brief leans light; I'll keep the dark tile unless you veto.
4. **Theme tokens.** Add the derived `ink-*` / `neutral-*` ramp to `stores/pipower/theme.config.ts` (extending `defineTheme`)? Or keep the ramp as Tailwind theme extension only? I'd extend `theme.config.ts` so all stores using this codebase inherit consistently.

## Next step

On approval of this DESIGN.md, the Home surface (`app/page.tsx` + its components) is the first to be rebuilt per the brief. New branch `redesign/home` from main, gate verde per surface, PR for Herney review on preview. No mergeo without your OK.
