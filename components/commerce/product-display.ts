/**
 * Lógica de presentación del catálogo, dirigida por DATOS (`attributes` JSON +
 * categoría), nunca por parsing del nombre. Pura y testeable; la comparten
 * `ProductCard` (Vista A) y `ProductListRow` (Vista B).
 */

export type StockState = 'in_stock' | 'incoming' | 'coming_soon' | 'out_of_stock'

function asAttrs(a: unknown): Record<string, unknown> {
  return a && typeof a === 'object' ? (a as Record<string, unknown>) : {}
}

/**
 * Deriva el estado de stock. `coming_soon` (línea futura) y `incoming` (agotado,
 * llegando) viven en `attributes`; con `stockQuantity` derivan el badge. El
 * bloqueo de orden se ata a disponibilidad real (`isOrderable`).
 */
export function deriveStockState(stockQuantity: number, attributes: unknown): StockState {
  const a = asAttrs(attributes)
  if (a.coming_soon === true) return 'coming_soon'
  if (a.incoming === true) return 'incoming'
  if (stockQuantity > 0) return 'in_stock'
  return 'out_of_stock'
}

/** Solo `in_stock` se puede ordenar; el resto ofrece "Notify me" o queda agotado. */
export function isOrderable(state: StockState): boolean {
  return state === 'in_stock'
}

export type ChipKey = 'seal' | 'spotWeld' | 'plugAndPlay' | 'flexProgrammed' | 'tagOn' | 'capacity'
export type Chip = { key: ChipKey; value?: string }

/**
 * Chips que DIFERENCIAN un producto. El sello `0-cycle · 100%` es constante (no
 * es data). `spot_welding_required` es accionable (el reparador necesita saber
 * si requiere soldadora). `tag-on` se infiere por CATEGORÍA, no por nombre.
 * Capacidad: solo si `attributes.capacity` es un string real (FU-010 — no se
 * inventa ningún número hasta tener la fuente del fabricante).
 */
export function deriveChips(input: {
  attributes?: unknown
  categorySlug?: string | null
}): Chip[] {
  const a = asAttrs(input.attributes)
  const chips: Chip[] = [{ key: 'seal' }]
  if (a.spot_welding_required === true) chips.push({ key: 'spotWeld' })
  if (a.plug_and_play === true) chips.push({ key: 'plugAndPlay' })
  if (a.flex_programmed === true) chips.push({ key: 'flexProgrammed' })
  if (input.categorySlug === 'tag-on-flex') chips.push({ key: 'tagOn' })
  if (typeof a.capacity === 'string' && a.capacity.trim() !== '') {
    chips.push({ key: 'capacity', value: a.capacity })
  }
  return chips
}
