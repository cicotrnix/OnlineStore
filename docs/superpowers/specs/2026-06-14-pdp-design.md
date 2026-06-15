# Spec — PDP (página de detalle de producto) · rediseño "Back to 100%"

**Fecha:** 2026-06-14
**Origen:** Tercera superficie del rediseño, tras Header y Catálogo (ambos mergeados). La PDP (`app/(storefront)/products/[slug]/page.tsx`, ~199 líneas) usa los primitivos viejos (`Badge` de ui, texto gris). Llega "liviana": el card de related ya quedó unificado en el trabajo de catálogo, así que esta superficie es **chrome de página** + el **SpecReadout instrumento completo** (que se reservó deliberadamente para acá, no para los cards del catálogo).
**Negocio:** B2B mayorista Pi-Power. La PDP es donde el comprador profesional evalúa el producto antes de re-ordenar; el SpecReadout instrument comunica la garantía de calidad (0-cycle / 100% salud) que un taller verifica antes de confiar en un proveedor.

## Objetivo

Restilar la PDP al sistema "Back to 100%", **preservando todas sus features/data**, e incorporar el SpecReadout instrumento completo + el sistema de chips/stock/stepper que ya vive en el catálogo (reutilizar, no reimplementar). Imágenes y semántica de búsqueda fuera de alcance.

## Decisiones de diseño (cerradas con Herney en Cowork)

1. **Galería = hero de una imagen.** Los productos tienen un solo `imageUrl`. Una imagen grande instrument-grade, sin thumbnails. La estructura queda lista para crecer a galería multi-imagen cuando haya varias fotos (sin cambio de schema ahora).
2. **Layout dos columnas (above-fold):** hero de imagen a la izquierda (con los chips de atributo overlaid, igual que el card); **buy box** a la derecha.
3. **Orden del buy box:** categoría · SKU (mono) → nombre → short description AI → **SpecReadout instrumento** → precio + stock (3 estados) → stepper de cantidad + Add to cart → RFQ (secundario) → badge privado (si aplica).
4. **SpecReadout = 2 columnas ahora** (`health 100%` · `cycles 0`); la 3ª columna (`capacity +X%`) **se suma solo cuando exista `product.attributes.capacity`** real (FU-010 pendiente). Nunca mostrar "—" ni número inventado — la columna no aparece hasta tener el dato (regla del design-system "capacidad solo si existe").
5. **Below-fold, full-width:** Product details (descripción larga AI en markdown + atributos + compatible models) → Volume pricing (tier table) → Related products (ya con el card nuevo).

## Arquitectura

### Componentes — reusar lo del catálogo, no duplicar

- **`SpecReadout`** (`components/commerce/SpecReadout.tsx`) ya existe (hoy solo en la home, toma `rows: SpecRow[]`). Se reusa en la PDP con el instrumento completo: filas `health 100%` + `cycles 0` (+ `capacity` si real). Mismos valores constantes spec-aprobados; capacidad gated.
- **Chips de atributo, 3 estados de stock, stepper** → reusar los helpers ya centralizados en el trabajo de catálogo (`components/commerce/product-display.ts` + gating B2B en `lib/catalog/card-context.ts`). El buy box los consume; no se reescribe la lógica.
- **`AddToCartButton`** con `showQuantity` (stepper) — ya existe, se usa en el buy box.
- **`PriceTierTable`** (volume discounts) — restilar a tabla instrument-style (mono, líneas sutiles), misma data/flag.
- **`AddToQuoteButton`** (RFQ) — restilar a CTA secundario.
- **`RelatedProducts`** — ya usa el `ProductCard` nuevo; sin cambios (o ajuste mínimo de título/espaciado).
- **`PriceTag`** / gating — restilar; preservar `showPrice = customerState.kind === 'verified'`, override de cliente (`showOverride`), y el link "sign in to see prices" para anónimos/pending.

### La PDP (`products/[slug]/page.tsx`) — restyle, misma data

Se mantiene el data-fetching y la lógica actual: `generateMetadata` (SEO desde `ProductContent.seoDescription`/`product.description`), `ProductContent` por locale (short + long description), `resolveForOrg` (precio cliente), `listTiersForProduct` (tiers gated por `volumeDiscounts`), `getRelatedProducts`/`getPersonalizedRecommendations`, gating RFQ (`rfq` + sesión + no-impersonando), badge privado. Solo cambia la **presentación** (layout + tokens). El `ProductContent.longDescriptionMd` se renderea con tipografía nueva (markdown legible).

## Preservado (no se toca la lógica)

SEO/`generateMetadata` · `ProductContent` AI (short/long/seo por locale) · gating de precio + override de cliente · RFQ · badge privado · tier table (flag `volumeDiscounts`) · related/recommendations · 3 estados de stock · chips por atributo · stepper.

## A11y (WCAG 2.1 AA)

- SpecReadout: valores con label de texto (no solo color); contraste AA (lima-deep `#5fa000` para unidades sobre blanco).
- Stock con punto + texto (no color-only). Botones-ícono con `aria-label`. Stepper operable por teclado.
- Imagen hero con `alt` real (nombre del producto). Jerarquía de headings correcta (un `h1` = nombre del producto).
- Cero motion nuevo (página interna). Las micro-interacciones livianas del card compartido (hover/feedback) ya respetan `prefers-reduced-motion`.

## Testing

**Unit:** el buy box / SpecReadout renderiza según data — health/cycles constantes, capacity solo si `attributes.capacity`; gating de precio (verificado vs anónimo/pending); chips por atributo; 3 estados de stock; RFQ aparece/desaparece según flag+sesión; tier table según flag.
**e2e (prod build, TST-6):** PDP de un producto real renderiza (nombre, SpecReadout, precio gated, stepper, related con card nuevo); `generateMetadata` produce title/description; coming-soon (plug&play) muestra estado correcto sin precio.
**Gate ejecutable:** `pnpm format && lint && typecheck && test && build` con `STORE_ID=pipower` + `DATABASE_URL` + `test:e2e:prod` + axe. (`impeccable` sigue sin instalar — no es gate; verificación de diseño = review de Herney en localhost.)

## Alcance

**Dentro:** restyle completo de la PDP (hero de imagen + buy box + secciones below-fold) al sistema nuevo; SpecReadout instrumento (2 col, capacity gated); reuso de chips/stock/stepper del catálogo; restyle de tier table, RFQ, PriceTag, ProductContent.

**Fuera (FU / superficies siguientes):**
- **Galería multi-imagen** (varias fotos por producto) → requiere schema/data + fotos; diferido.
- Capacidad `+X%` real → FU-010 (doc del fabricante, Herney).
- Imágenes reales de tag-on / fotos de packaging → pendientes de Herney.
- Carrito + Checkout (drawer Vaul) → superficie siguiente.

## Riesgos / notas

- **PDP-related en local:** `getRelatedProducts` depende de embeddings pgvector/Voyage; en local sin ese stack, related puede salir vacío (cubierto por unit + build; no e2e-smokeable local). En prod, Meili/semántica está caído (instancia muerta) → related por vecinos pgvector sigue si los embeddings existen; si no, el bloque se oculta. No bloquea la PDP.
- Es restyle de una sola página + reuso de componentes ya hechos → de bajo riesgo comparado con catálogo/header.

## Ajustes de implementación (confirmados en el review de CC)

El "reusar tal cual" del spec subestimaba que estos 3 componentes necesitan tocarse para servir al catálogo nuevo:

1. **`SpecReadout` → columnas dinámicas** según `rows.length` (2 sin capacity / 3 con). Hoy está hardcodeado a `grid-cols-3` → con 2 rows queda un hueco a la derecha. **Cross-surface:** arregla también ese hueco en las featured cards de la **home** (pasan 2 rows sin capacity por FU-010) → **re-verificar la home** en el review de localhost. Es un beneficio, no un riesgo. De paso, actualizar el comentario stale "+12%" del ejemplo a genérico.
2. **Chip de la PDP = código muerto.** Hoy chequea `attributes.flex_included === 'tag-on'` (líneas 71-74) — el catálogo nuevo usa `spot_welding_required`/`flex_programmed` + tag-on por categoría → ningún producto nuevo muestra chip. Reemplazar por `deriveChips` (del catálogo).
3. **Buy box, 3 estados de stock.** Reemplazar el `StockBadge` binario (hoy muestra "Out of stock" para un coming_soon) por `deriveStockState` + `NotifyButton` + suprimir stepper/Add cuando `!isOrderable` — igual que el card.

Menores (del review): la tier table anidada con `md:col-span-2` que no spanea queda corregida por la reorg "below-fold full-width"; el gating inline de la PDP anda (reusar `getProductCardContext` es dedup opcional, no necesario).

## Reglas de ejecución

- Branch `redesign/pdp`. PR. Review de Herney en localhost antes de merge. No mergear sin confirmación.
- Nunca dato inventado (capacidad, precio) — solo data real o constantes spec-aprobadas (100% salud / 0 ciclos).
- TDD donde aplique. Conventional Commits, un commit por pieza (SpecReadout en PDP → buy box → below-fold/tier/RFQ → e2e).
