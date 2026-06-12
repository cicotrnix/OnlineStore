# Product

## Register

brand

## Users

PiPower serves two overlapping buyers on one storefront:

- **Repair shops and independent technicians (primary B2B).** They source iPhone replacement batteries in bulk, work fast, and need to identify the right SKU by model + IMEI without ambiguity. They want spec parity, real-stock signals, and zero friction at checkout. They're logged-in, org-priced, and return often.
- **Tech-savvy consumers (secondary B2C).** Owners of a single iPhone needing a quality replacement, who already looked up their model and care about not buying a counterfeit. They land cold, scan trust signals (warranty, IMEI compatibility check, spec sheet), and convert in one session.

Both share the same buying job: **confirm this battery is the right one for this exact iPhone, trust the source, and buy quickly.**

## Product Purpose

PiPower is a security-first, premium e-commerce store for iPhone replacement batteries. It exists because the replacement-battery market is dominated by counterfeit listings on marketplaces, inconsistent SKUs, and storefronts that look like dropshipping pages. PiPower's job is to be the obviously-real, technically-credible source — the place a repair shop or a careful consumer can buy from without second-guessing.

Success looks like: a repair shop completes a wholesale order from search to checkout in under three minutes, and a first-time consumer walks away certain they bought the right cell.

## Brand Personality

**Technical · Confident · Direct.**

- **Technical** — the copy speaks the buyer's language (model identifiers, IMEI lookup, mAh, cycle ratings) without translating it down. The product details ARE the marketing.
- **Confident** — the brand doesn't hedge, apologize, or shout. No "Trusted by 10,000+ technicians" social proof scaffolding; instead, the product, spec sheet, and warranty terms do the convincing.
- **Direct** — short sentences, plain verbs, no marketing softeners ("transform", "unlock", "empower"). Buttons say what they do. Errors say what's wrong.

Tone is closer to a calm engineer than a cheerful brand voice. Optimism in the design comes from craft (typography, motion, restraint), not from copy adjectives.

## Anti-references

Hard nos for the storefront aesthetic:

- **SaaS cream / Linear-clone / Stripe-clone landing**. Warm-tinted near-white body bg, eyebrows above every section, hero metric + supporting stats, identical card grids. PiPower is not a B2B SaaS landing page.
- **Marketplace look** (eBay, AliExpress, generic Shopify). Crowded grids, badges-on-badges, urgency timers, "X people are viewing this".
- **Apple imitation that misses the point**. Massive blurred hero photo + thin caption is easy to copy badly. PiPower borrows Apple's editorial restraint, not the surface treatment.
- **Generic dropshipping electronics**. Stock photography on white, colored callouts, three feature cards in a row, FAQ accordion at the bottom.
- **Impeccable absolute bans** apply: no Inter as the only typeface; no purple/blue gradient hero; no `background-clip: text` gradient headings; no glassmorphism as default; no side-stripe colored borders; no tiny tracked uppercase eyebrows over every section; no `01 / 02 / 03` scaffolding by default.

The brand register is brand (the storefront IS the marketing), but it borrows the **product-style discipline of a spec-sheet PDP** over the brand-page reflex of a marketing landing. Editorial over decorative.

## Design Principles

1. **The product is the proof.** Real photography of the battery, the cell, the packaging. No mockups of phones we don't ship. Every spec on the page is one you'd see on the datasheet.
2. **Identify, then buy.** Every surface answers "is this the right one for my iPhone?" before it tries to sell. IMEI compatibility lookup is a primary affordance, not buried.
3. **Calm authority.** Big typography, deep whitespace, slate and white as the load-bearing colors. The lime accent is a punctuation mark, not a wash.
4. **Motion with purpose.** Hero entry, scroll-revealed product cards, button micro-states — yes. Decorative parallax, marquee tickers, background gradients that crawl — no. Every animation must be skippable by `prefers-reduced-motion`.
5. **Bilingual by construction.** EN and ES are first-class. No design that breaks when ES copy is 25% longer. Labels go through `t(locale, …)`; never hardcoded.

## Accessibility & Inclusion

- **WCAG 2.1 AA is the floor**, not the goal. Touch targets ≥44×44 px; keyboard reachable end-to-end; visible focus rings (not just `outline: none`); skip-to-content link.
- **The lime accent `#88D810` is the brightest token in the system.** It is BANNED as a background for white text (contrast ratio fails AA). It is used as: badge fill with slate-ink text, border/keyline accent on light surfaces, highlight on hover, and brand-asset color in imagery. Buttons primary use slate `#1A1F2E` with white text (AAA contrast).
- **Reduced motion is honored.** Every GSAP timeline checks `prefers-reduced-motion`; the fallback is an instant or fade-only render with the same final state visible.
- **Locale parity.** EN and ES dictionaries must have full parity (enforced by an existing test). No design that requires English-length copy to fit.
- **Color blindness.** Status (PAID / PENDING / OVERDUE / CANCELLED) does not rely on color alone — every state has a label and an icon or shape cue.
