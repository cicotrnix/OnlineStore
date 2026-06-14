# Spec — Catálogo + ProductCard (rediseño "Back to 100%")

**Fecha:** 2026-06-14
**Origen:** Segunda superficie del rediseño tras el header unificado (mergeado, 25049a3). El catálogo y sus dos vistas usan hoy los primitivos viejos (`Card`/`Badge`, grises/azules genéricos) — el "look AI default". La auditoría 2026-06-12 marcó dos cosas a respetar acá: (1) la Vista B densa existe (`ProductListRow`) pero el design-system spec no la menciona → riesgo de regresión; (2) el `SpecReadout` con "100%/0 ciclos" idéntico en cada card es "información cero".
**Negocio:** B2B mayorista Pi-Power, compradores profesionales que re-ordenan. El catálogo es la pantalla que el comprador usa cada semana.

## Objetivo

Restilar **las dos vistas del catálogo** (Vista A cards + Vista B lista densa) y el chrome de la página al sistema "Back to 100%", heredando el header ya unificado. Misma data, dos UX, un solo render según el modo activo (no reimplementar). Preservar: toggle A/B persistente (`preferredCatalogView`), stock, Tag-On Flex, gating de precio B2B. Incorporar: sistema de chips dirigido por atributos, 3 estados de stock, selector de cantidad en el card. En paralelo, refrescar el catálogo con la **data real** y cerrar el prereq de imágenes (FU-011).

## Decisiones de diseño (cerradas con Herney en Cowork)

### ProductCard — dirección B (product-forward)

- El `SpecReadout` de 3 columnas **no va** en el card. Aclaración (CC verificó): hoy el `SpecReadout` **nunca estuvo** en `ProductCard` — su único uso es la home (`app/page.tsx`). Lo que existe es una *intención desfasada* en el design-system spec (línea 62: "en product cards y PDP") que jamás llegó al código. Así que no "lo quitamos del card": **cancelamos esa intención del doc**. El instrumento completo se reserva para la **PDP**.
- En su lugar, un **sello de calidad compacto**: chip `0-cycle · 100%` (mono, lima-deep `#5fa000` sobre tinte lima). Da la garantía de fábrica en un solo chip.
- El card gasta su espacio en lo que **diferencia** un producto de otro: chips de atributo, capacidad real (si existe), modelo, precio, stock.
- **Ajuste al design-system spec:** la sección "SpecReadout" (`docs/specs/2026-06-11-…`, "en product cards y PDP") pasa a "sello compacto en cards, SpecReadout en PDP". Actualizar al mergear.

### Sistema de chips (dirigido por atributos, nunca por parsing del nombre)

Los chips se leen de `product.attributes` (campo JSON ya existente, Fase 4), no del texto del nombre:

| Chip | Atributo | Estilo | Línea |
|------|----------|--------|-------|
| `0-cycle · 100%` | constante (todo producto nuevo) | sello lima-deep | todas |
| `Spot weld` | `spot_welding_required: true` | ámbar (requisito de instalación, accionable) | Battery Cell |
| `Plug & play` / `no solder` | `plug_and_play: true` | lima (positivo) | Plug & Play |
| `Tag-on` | categoría Tag-on Flex | lima suave | Tag-on Flex |
| `Flex programmed` | `flex_programmed: true` | lima suave | celdas 15 |
| capacidad (`+X%`) | `attributes.capacity` real | lima-deep, **solo si existe** | gated FU-010 |

El "Spot weld" es **accionable** (el reparador necesita saber si requiere soldadora), por eso gana chip aunque hoy sea uniforme en las cells; y se vuelve el diferenciador real frente a Plug & Play. El nombre mostrado se **limpia** (se le quita el "(Spot Welding Required)" del nombre del proveedor — el chip ya lo dice). El card aguanta nombres descriptivos de 2-3 líneas sin romper.

### Selector de cantidad en el card

Stepper `− [n] +` antes de "Add to cart", **default 1** (Add agrega 1 de una; − baja, + sube para pedir varios). Reusa el `AddToCartButton` con `showQuantity` (ya existe, hoy solo en la lista densa) — se activa también en el card. Las **dos vistas** quedan con selección de cantidad. Accesible por teclado, `aria-label` en − y +.

### Tres estados de stock (el binario actual crece)

| Estado | Indicador | Botón | Ordenable |
|--------|-----------|-------|-----------|
| In stock | punto lima + "In stock" | Add to cart (lima) | sí |
| Incoming | punto ámbar + "Incoming" | "Notify me" | no |
| Coming soon | punto gris + "Coming soon" | "Notify me" | no |

- **Incoming** = lo tenemos pero agotado, llegando (las iPhone 12). **Coming soon** = línea futura no lanzada (Plug & Play).
- Ni incoming ni coming soon se pueden ordenar → "Notify me". El **mecanismo real de Notify** (waitlist + email al reponer) es net-new → **diferido como FU**; en esta superficie el botón es un stub liviano (mailto/contacto) + el badge de estado bien claro.
- **No color-only:** el estado se comunica con punto + label de texto (WCAG), no solo el color del punto.
- Representación en data: distinguir incoming vs coming-soon vs out-of-stock pelado. Recomendado: flags en `attributes` (`incoming: true` / `coming_soon: true`) que, con `stockQuantity === 0`, derivan el badge; el bloqueo de orden se mantiene atado a disponibilidad. Si CC prefiere un enum `StockStatus` (schema), va con ADR.

### Chrome de la página

- **Tabs de categoría** (no sidebar — overkill para 3): `All · Battery Cell · Plug & Play · Tag-on Flex`. Tab activa en slate, resto outline. Filtra el listado.
- **Toggle Cards/List** restilado (arriba-derecha), Cards activo en lima. Persiste por usuario (`preferredCatalogView`, ya existe).
- Gating de precio para anónimos/pending: en vez del precio, link de "iniciá sesión para ver precios". La clave existe como `landing.featured.loginForPrice`; para no arrastrar el namespace `landing.featured` a una página que no es la landing, agregar `catalog.loginForPrice` (aditivo). Prolijidad i18n, no bloqueante.

### Card único compartido (opción A — decidido con Herney)

`ProductCard`/`ProductListRow` hoy solo viven en `/catalog`; home-featured, PDP-related y /search tienen card propio con primitivos viejos `Card/CardBody`. Para no recrear la costura multi-marca que el header acaba de matar, el `ProductCard` restilado se vuelve el **card único** y se aplica también a `FeaturedGrid` (home), `RelatedProducts` (PDP) y `SearchResults` (/search), reemplazando su markup inline por `<ProductCard>`. Se unifica **solo el átomo card**; el chrome de página de la PDP y de /search se restila en sus propias superficies. El card se mantiene presentacional y flexible por props para rendir en los 3 contextos (grilla featured, related, resultados de búsqueda).

### Vista B (lista densa) — restyle

Tabla densa sobre los tokens nuevos, para re-orden/compra grande. Columnas: SKU (mono) · Nombre · Categoría · atributos como íconos compactos (⚡ spot-weld / 🔌 plug&play / tag-on) · estado de stock (punto + label) · precio (verificado) · **input de cantidad + Add por fila** (ya existe vía `showQuantity`, ahora prominente). Header sticky. Mismo sistema visual que el card, en formato denso.

## Data real del catálogo (→ seed update, pareado con FU-011)

Es un workstream de **data/seed** que CC implementa junto al restyle (mismo branch o pareado). Nada de la imagen de referencia de MobileSentrix (marca AmpSentrix, "6%", nombres) entra acá — **Pi-Power es independiente**; precios y nombres son los de Herney.

**Categoría Battery Cell** (atributo `spot_welding_required: true`, sello `0-cycle · 100%`) — precios online finales, mostrados solo a verificados:

| Producto | SKU | Precio | Stock |
|----------|-----|--------|-------|
| iPhone 12 / 12 Pro | (un solo SKU) | $9.24 | incoming |
| iPhone 12 Pro Max | aparte | $13.01 | incoming |
| iPhone 13 | | $9.00 | in stock |
| iPhone 13 Pro | | $11.34 | in stock |
| iPhone 13 Pro Max | | $15.25 | in stock |
| iPhone 14 | | $9.03 | in stock |
| iPhone 14 Pro | | $12.17 | in stock |
| iPhone 14 Pro Max | | $14.40 | in stock |
| iPhone 15 · Flex Programmed incl. (`flex_programmed: true`) | | $11.20 | in stock |
| iPhone 15 Pro · Flex Programmed incl. | | $14.07 | in stock |
| iPhone 15 Pro Max · Flex Programmed incl. | | $17.12 | in stock |

**Categoría Plug & Play** (`plug_and_play: true`, sin soldadura) — iPhone 13 → 15 Pro Max · **coming soon** · precios pendientes (Herney).
**Categoría Tag-on Flex** — un producto Tag-on por **todos** los modelos (incl. 15, como extra aparte de las celdas que ya lo traen) · precio fijo **$3.50** · in stock.
**Eliminado:** la variante iPhone 15 sin Flex Programmed (todos los 15 lo incluyen).

**Prereqs de data (dependen de Herney, anotados):**
- **FU-011 (imágenes): resuelto en el repo.** Las imágenes locales reales ya existen en `public/products/` (14 PNGs por modelo, incl. `iphone-12-12-pro.png` y los `iphone-15-*-flex.png`). El seed apunta los productos batería a esas (no unsplash, no remoto) → resuelve el 500 de `/catalog`, sin `remotePatterns`, **sin dependencia de Herney**. Como al menos un producto tiene imagen local real, el prod-e2e sí ejercita el render de `next/image` (cierra el gap que dejó FU-011 invisible). Faltantes menores: un `12-pro-max` propio (hoy solo el combinado 12/12-pro — reusar o agregar), y plug&play/tag-on (coming-soon/accesorio → placeholder OK).
- **FU-010 (capacidad):** el `+X%` por modelo **no se muestra** hasta la fuente formal del fabricante. No usar el "6%" de la imagen de referencia. Hasta entonces, los productos se llaman "High Capacity" sin número.

## A11y (WCAG 2.1 AA)

- Estado de stock comunicado con punto **+ texto** (no color-only).
- Stepper de cantidad operable por teclado, `aria-label` en − / +, el valor anunciado.
- Tabs de categoría con semántica correcta (rol tab/lista o links con `aria-current`), toggle Cards/List accesible.
- Contraste AA: lima-deep `#5fa000` para texto lima sobre blanco; ámbar/gris de los estados con contraste medido.
- Cero motion nuevo (catálogo = velocidad-a-orden + CWV; regla §c de la auditoría).

## Testing

**Unit (`ProductCard` + `ProductListRow`):**
- variantes de stock (in stock / incoming / coming soon): botón correcto (Add vs Notify), no-ordenable cuando corresponde.
- chips por atributo (spot_weld, plug_and_play, flex_programmed, tag-on) aparecen/desaparecen según `attributes`.
- capacidad: se muestra solo si `attributes.capacity` real (no por defecto).
- stepper: default 1, mínimo 1 (no se agrega 0); Add manda la cantidad elegida.
- gating de precio: anónimo/pending → `loginForPrice`, no precio.

**e2e (contra build de prod, TST-6):**
- `/catalog` renderiza con datos seed **reales incluyendo imágenes** (cierra el gap de FU-011 que dejó invisible el 500).
- toggle Cards/List persiste por usuario.
- tabs de categoría filtran.
- stepper: elegir N → Add → el carrito tiene N.

**Gate ejecutable (bloqueante):** `pnpm format && lint && typecheck && test && build` con `STORE_ID=pipower` + `DATABASE_URL` + `test:e2e:prod` + axe. (`impeccable` sigue sin instalar — no es parte del gate; verificación de diseño = review de Herney en localhost. Ver decisión pendiente en `online-store-redesign-status`.)

## Alcance

**Dentro:** restyle de `ProductCard` + `ProductListRow` + chrome de `/catalog` (tabs + toggle); sistema de chips por atributo; stepper de cantidad en card; 3 estados de stock (display + bloqueo de orden); data real del catálogo (seed) + imágenes locales (FU-011); **card único compartido (A): aplicar el `ProductCard` restilado a `FeaturedGrid`, `RelatedProducts` y `SearchResults`** (solo el átomo card).

**Fuera (FU o superficies siguientes):**
- El **chrome de página** de la PDP (layout, SpecReadout completo, galería) y de `/search` (facet sidebar) → sus propias superficies. Acá solo se unifica el card que usan.
- Mecanismo real de "Notify me" (waitlist + email) → FU nuevo.
- Capacidad `+X%` por modelo → FU-010 (fuente del fabricante, Herney).
- Precios de Plug & Play → pendientes (Herney).
- CSV/bulk-add net-new → fuera (la lista densa ya tiene cantidad por fila; CSV es su propia feature).
- **PDP** (donde sí va el SpecReadout completo) → superficie siguiente.

## Riesgos y orden de ejecución

- **Corrección de un claim del spec (CC verificó):** `ProductCard`/`ProductListRow` los importa **solo `/catalog`**. `FeaturedGrid` (home), `RelatedProducts` (PDP) y `SearchResults` (/search) tienen markup propio con primitivos viejos. El riesgo no es "no romper esas superficies" — es que el restyle **no propaga** y recrea la costura multi-marca que el header acaba de matar.
- **Decisión A — card único compartido.** Se aplica el `ProductCard` restilado también a esas 3 superficies. Riesgo a manejar: el card compartido tiene que rendir en 3 contextos (grilla featured de la home, related de la PDP, resultados de /search) — mantenerlo presentacional y flexible por props; alinear la data que cada superficie le pasa.
- **Seed swap primero.** El seed actual es cosmética genérica; revisar el restyle contra cosmética es engañoso. El swap a Pi-Power (con las imágenes locales que ya existen) entra **antes** del restyle, para que el review en localhost muestre baterías reales.

**Orden de commits sugerido:**
1. **Seed swap a Pi-Power**: 11 baterías + 3 categorías (Battery Cell / Plug & Play / Tag-on Flex) + flags de atributo + estados de stock, apuntando a las imágenes de `public/products/`. (Resuelve FU-011.)
2. `ProductCard` restyle (dirección B + chips por atributo + sello + stepper + 3 estados) — test-first.
3. **Extraer `ProductCard` como card único** y aplicarlo a `FeaturedGrid` (home), `RelatedProducts` (PDP) y `SearchResults` (/search): reemplazar el markup `Card/CardBody` inline por `<ProductCard>`, alineando la data a las props. Mata la costura.
4. `ProductListRow` restyle (tabla densa + cantidad por fila + chips compactos).
5. Chrome de `/catalog` (tabs de categoría + toggle restilado + gating precio + clave `catalog.loginForPrice`).
6. e2e: `/catalog` con datos+imágenes reales (toggle persiste, tabs filtran, stepper → carrito) + smoke de que home-featured / PDP-related / /search renderizan con el card nuevo.

## Reglas de ejecución

- Branch `redesign/catalog`. PR. Review de Herney en localhost antes de merge. No mergear sin confirmación.
- Nunca dato inventado (capacidad, precio) — solo data real o constantes spec-aprobadas (100% salud / 0 ciclos).
- TDD donde aplique (`ProductCard`/`ProductListRow` se prestan a test-first).
- Conventional Commits, un commit por pieza (ver orden arriba).
