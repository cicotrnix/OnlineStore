/**
 * Fuente ÚNICA del catálogo Pi-Power (data pura, sin Prisma). La consumen:
 *  - `prisma/seed.ts` (local/e2e: crea categorías+productos + usuarios/org demo + wipe).
 *  - `scripts/load-pipower-catalog.ts` (prod-safe: upsert por SKU, no toca usuarios/órdenes).
 *
 * Reglas de dominio:
 *  - Battery Cell: `spot_welding_required: true`; nombre "High Capacity" SIN número
 *    (capacidad +X% gated por FU-010 hasta fuente del fabricante). iPhone 12 = incoming.
 *  - Plug & Play: `plug_and_play`+`coming_soon`; precio 0.00 placeholder INERTE
 *    (nunca se muestra — coming_soon no muestra precio ni permite ordenar).
 *  - Tag-on Flex: un SKU por modelo (parte física distinta), $3.50, in stock,
 *    imágenes pendientes → placeholder (imageUrl null). 12/12 Pro combinado.
 */

export type CatalogCategory = { slug: string; name: string; sortOrder: number }

export type CatalogProduct = {
  sku: string
  slug: string
  name: string
  description: string
  /** Decimal como string; el consumidor envuelve en Decimal. */
  basePrice: string
  stockQuantity: number
  imageUrl: string | null
  categorySlug: string
  attributes: Record<string, unknown> | null
}

export const PIPOWER_CATEGORIES: CatalogCategory[] = [
  { slug: 'battery-cell', name: 'Battery Cell', sortOrder: 1 },
  { slug: 'plug-and-play', name: 'Plug & Play', sortOrder: 2 },
  { slug: 'tag-on-flex', name: 'Tag-on Flex', sortOrder: 3 },
]

const SPOT = { spot_welding_required: true }
const cellDesc = (m: string) =>
  `Celda de alta capacidad para ${m}. 0 ciclos, 100% de salud de fábrica. Requiere soldadura por puntos (spot welding).`
const flexDesc = (m: string) => `${cellDesc(m)} Incluye flex programado.`

// ── Battery Cell (11) — precios/imágenes reales. 12/12 Pro combinado; 12 Pro Max
//    reusa la imagen del combinado por ahora. Los 15 incluyen flex programado.
const batteryCell: CatalogProduct[] = [
  {
    sku: 'PP-BC-1212P',
    slug: 'iphone-12-12-pro',
    name: 'iPhone 12 / 12 Pro High Capacity Battery',
    description: cellDesc('iPhone 12 / 12 Pro'),
    basePrice: '9.24',
    stockQuantity: 0,
    imageUrl: '/products/iphone-12-12-pro.png',
    categorySlug: 'battery-cell',
    attributes: { ...SPOT, incoming: true },
  },
  {
    sku: 'PP-BC-12PM',
    slug: 'iphone-12-pro-max',
    name: 'iPhone 12 Pro Max High Capacity Battery',
    description: cellDesc('iPhone 12 Pro Max'),
    basePrice: '13.01',
    stockQuantity: 0,
    imageUrl: '/products/iphone-12-12-pro.png',
    categorySlug: 'battery-cell',
    attributes: { ...SPOT, incoming: true },
  },
  {
    sku: 'PP-BC-13',
    slug: 'iphone-13',
    name: 'iPhone 13 High Capacity Battery',
    description: cellDesc('iPhone 13'),
    basePrice: '9.00',
    stockQuantity: 120,
    imageUrl: '/products/iphone-13.png',
    categorySlug: 'battery-cell',
    attributes: SPOT,
  },
  {
    sku: 'PP-BC-13P',
    slug: 'iphone-13-pro',
    name: 'iPhone 13 Pro High Capacity Battery',
    description: cellDesc('iPhone 13 Pro'),
    basePrice: '11.34',
    stockQuantity: 100,
    imageUrl: '/products/iphone-13-pro.png',
    categorySlug: 'battery-cell',
    attributes: SPOT,
  },
  {
    sku: 'PP-BC-13PM',
    slug: 'iphone-13-pro-max',
    name: 'iPhone 13 Pro Max High Capacity Battery',
    description: cellDesc('iPhone 13 Pro Max'),
    basePrice: '15.25',
    stockQuantity: 100,
    imageUrl: '/products/iphone-13-pro-max.png',
    categorySlug: 'battery-cell',
    attributes: SPOT,
  },
  {
    sku: 'PP-BC-14',
    slug: 'iphone-14',
    name: 'iPhone 14 High Capacity Battery',
    description: cellDesc('iPhone 14'),
    basePrice: '9.03',
    stockQuantity: 110,
    imageUrl: '/products/iphone-14.png',
    categorySlug: 'battery-cell',
    attributes: SPOT,
  },
  {
    sku: 'PP-BC-14P',
    slug: 'iphone-14-pro',
    name: 'iPhone 14 Pro High Capacity Battery',
    description: cellDesc('iPhone 14 Pro'),
    basePrice: '12.17',
    stockQuantity: 90,
    imageUrl: '/products/iphone-14-pro.png',
    categorySlug: 'battery-cell',
    attributes: SPOT,
  },
  {
    sku: 'PP-BC-14PM',
    slug: 'iphone-14-pro-max',
    name: 'iPhone 14 Pro Max High Capacity Battery',
    description: cellDesc('iPhone 14 Pro Max'),
    basePrice: '14.40',
    stockQuantity: 90,
    imageUrl: '/products/iphone-14-pro-max.png',
    categorySlug: 'battery-cell',
    attributes: SPOT,
  },
  {
    sku: 'PP-BC-15',
    slug: 'iphone-15',
    name: 'iPhone 15 High Capacity Battery (Flex Programmed)',
    description: flexDesc('iPhone 15'),
    basePrice: '11.20',
    stockQuantity: 80,
    imageUrl: '/products/iphone-15-flex.png',
    categorySlug: 'battery-cell',
    attributes: { ...SPOT, flex_programmed: true },
  },
  {
    sku: 'PP-BC-15P',
    slug: 'iphone-15-pro',
    name: 'iPhone 15 Pro High Capacity Battery (Flex Programmed)',
    description: flexDesc('iPhone 15 Pro'),
    basePrice: '14.07',
    stockQuantity: 70,
    imageUrl: '/products/iphone-15-pro-flex.png',
    categorySlug: 'battery-cell',
    attributes: { ...SPOT, flex_programmed: true },
  },
  {
    sku: 'PP-BC-15PM',
    slug: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max High Capacity Battery (Flex Programmed)',
    description: flexDesc('iPhone 15 Pro Max'),
    basePrice: '17.12',
    stockQuantity: 60,
    imageUrl: '/products/iphone-15-pro-max-flex.png',
    categorySlug: 'battery-cell',
    attributes: { ...SPOT, flex_programmed: true },
  },
]

// ── Plug & Play (9, coming soon) — rango iPhone 13 → 15 Pro Max. Sin soldadura.
//    Precio 0.00 placeholder inerte (pendiente Herney; coming_soon no lo muestra).
const PNP = { plug_and_play: true, coming_soon: true }
const pnpModels: { sku: string; slug: string; model: string }[] = [
  { sku: 'PP-PP-13', slug: 'iphone-13-plug-and-play', model: 'iPhone 13' },
  { sku: 'PP-PP-13P', slug: 'iphone-13-pro-plug-and-play', model: 'iPhone 13 Pro' },
  { sku: 'PP-PP-13PM', slug: 'iphone-13-pro-max-plug-and-play', model: 'iPhone 13 Pro Max' },
  { sku: 'PP-PP-14', slug: 'iphone-14-plug-and-play', model: 'iPhone 14' },
  { sku: 'PP-PP-14P', slug: 'iphone-14-pro-plug-and-play', model: 'iPhone 14 Pro' },
  { sku: 'PP-PP-14PM', slug: 'iphone-14-pro-max-plug-and-play', model: 'iPhone 14 Pro Max' },
  { sku: 'PP-PP-15', slug: 'iphone-15-plug-and-play', model: 'iPhone 15' },
  { sku: 'PP-PP-15P', slug: 'iphone-15-pro-plug-and-play', model: 'iPhone 15 Pro' },
  { sku: 'PP-PP-15PM', slug: 'iphone-15-pro-max-plug-and-play', model: 'iPhone 15 Pro Max' },
]
const plugAndPlay: CatalogProduct[] = pnpModels.map((m) => ({
  sku: m.sku,
  slug: m.slug,
  name: `${m.model} Plug & Play Battery`,
  description: `Reemplazo sin soldadura para ${m.model}. Próximamente.`,
  basePrice: '0.00',
  stockQuantity: 0,
  imageUrl: null,
  categorySlug: 'plug-and-play',
  attributes: PNP,
}))

// ── Tag-on Flex (8) — imágenes reales (composición Back-to-100% de las fotos del
//    vendor). $3.50, in stock. La placa de 13 Pro/13 Pro Max/14 Pro/14 Pro Max es
//    UNA pieza compartida → SKU único PP-TO-PRO-1314. 12/12 Pro combinado.
const tagOnModels: { sku: string; slug: string; model: string; image: string }[] = [
  {
    sku: 'PP-TO-1212P',
    slug: 'tag-on-flex-12-12-pro',
    model: 'iPhone 12 / 12 Pro',
    image: '12-12pro.png',
  },
  {
    sku: 'PP-TO-12PM',
    slug: 'tag-on-flex-12-pro-max',
    model: 'iPhone 12 Pro Max',
    image: '12promax.png',
  },
  { sku: 'PP-TO-13', slug: 'tag-on-flex-13', model: 'iPhone 13', image: '13-13mini.png' },
  {
    sku: 'PP-TO-PRO-1314',
    slug: 'tag-on-flex-pro-13-14',
    model: 'iPhone 13 Pro / 13 Pro Max / 14 Pro / 14 Pro Max',
    image: '13-14-pro-promax-shared.png',
  },
  { sku: 'PP-TO-14', slug: 'tag-on-flex-14', model: 'iPhone 14', image: '14-14plus.png' },
  { sku: 'PP-TO-15', slug: 'tag-on-flex-15', model: 'iPhone 15', image: '15-15plus.png' },
  { sku: 'PP-TO-15P', slug: 'tag-on-flex-15-pro', model: 'iPhone 15 Pro', image: '15pro-15pm.png' },
  {
    sku: 'PP-TO-15PM',
    slug: 'tag-on-flex-15-pro-max',
    model: 'iPhone 15 Pro Max',
    image: '15pro-15pm.png',
  },
]
const tagOn: CatalogProduct[] = tagOnModels.map((m) => ({
  sku: m.sku,
  slug: m.slug,
  name: `Tag-on Flex — ${m.model}`,
  description: `Flex tag-on para ${m.model}. Para celdas que no lo incluyen.`,
  basePrice: '3.50',
  stockQuantity: 200,
  imageUrl: `/products/tag-on/${m.image}`,
  categorySlug: 'tag-on-flex',
  attributes: null,
}))

export const PIPOWER_PRODUCTS: CatalogProduct[] = [...batteryCell, ...plugAndPlay, ...tagOn]

/** SKUs a desactivar en prod (sin borrar → preserva FKs de órdenes/precios):
 *  - Catálogo Fase 3 viejo (PI-2004xx).
 *  - Tag-on Pro 13/14 consolidados en PP-TO-PRO-1314 (eran la misma placa física). */
export const LEGACY_SKUS: string[] = [
  'PI-200450',
  'PI-200451',
  'PI-200452',
  'PI-200453',
  'PI-200454',
  'PI-200455',
  'PI-200456',
  'PI-200457',
  'PI-200458',
  'PI-200459',
  'PI-200460',
  'PI-200461',
  // Tag-on Pro/Pro Max 13+14 → consolidados en PP-TO-PRO-1314
  'PP-TO-13P',
  'PP-TO-13PM',
  'PP-TO-14P',
  'PP-TO-14PM',
]

/** Categorías del catálogo Fase 3 viejo, a desactivar (reemplazadas por las 3
 * nuevas). El loader las pone isActive=false para que no aparezcan como tabs
 * vacíos en /catalog (listCategories filtra por Category.isActive). */
export const LEGACY_CATEGORY_SLUGS: string[] = ['battery', 'tag-on']
