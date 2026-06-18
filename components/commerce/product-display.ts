import { type Locale, t } from '@/lib/i18n'

/**
 * Lógica de presentación del catálogo, dirigida por DATOS (`attributes` JSON +
 * categoría), nunca por parsing del nombre. La comparten `ProductCard` (Vista A)
 * y `ProductListRow` (Vista B) para que ambas vistas usen el MISMO sistema
 * visual (chips, tonos, estados de stock).
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

export type ChipKey =
  | 'seal'
  | 'spotWeld'
  | 'plugAndPlay'
  | 'flexProgrammed'
  | 'tagOn'
  | 'capacity'
  | 'genuine'
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
  if (a.genuine_part === true) chips.push({ key: 'genuine' })
  if (a.flex_programmed === true) chips.push({ key: 'flexProgrammed' })
  if (input.categorySlug === 'tag-on-flex') chips.push({ key: 'tagOn' })
  if (typeof a.capacity === 'string' && a.capacity.trim() !== '') {
    chips.push({ key: 'capacity', value: a.capacity })
  }
  return chips
}

// ── Presentación compartida (card + fila densa) ──────────────────────────────

/** Punto de color por estado (acompañado SIEMPRE de texto — nunca color-only). */
export const STOCK_DOT: Record<StockState, string> = {
  in_stock: 'bg-lime-500',
  incoming: 'bg-amber-500',
  coming_soon: 'bg-gray-400',
  out_of_stock: 'bg-gray-400',
}

export function stockLabel(state: StockState, locale: Locale): string {
  switch (state) {
    case 'in_stock':
      return t(locale, 'catalog.stock.inStock')
    case 'incoming':
      return t(locale, 'catalog.stock.incoming')
    case 'coming_soon':
      return t(locale, 'catalog.stock.comingSoon')
    default:
      return t(locale, 'catalog.stock.outOfStock')
  }
}

// Tonos: sello/capacidad/plug = lima-deep; flex/tag-on = lima suave; spot-weld = ámbar (accionable).
export const CHIP_TONE: Record<ChipKey, string> = {
  seal: 'border-lime-200 bg-lime-50 text-lime-700',
  capacity: 'border-lime-200 bg-lime-50 text-lime-700',
  plugAndPlay: 'border-lime-200 bg-lime-50 text-lime-700',
  // Genuine: destacado (lima más saturado) — es el diferencial clave del P&P.
  genuine: 'border-lime-300 bg-lime-100 text-lime-800',
  flexProgrammed: 'border-lime-100 bg-lime-50/60 text-lime-700',
  tagOn: 'border-lime-100 bg-lime-50/60 text-lime-700',
  spotWeld: 'border-amber-200 bg-amber-50 text-amber-800',
}

export function chipLabel(chip: Chip, locale: Locale): string {
  switch (chip.key) {
    case 'seal':
      return '0-cycle · 100%'
    case 'spotWeld':
      return t(locale, 'catalog.chip.spotWeld')
    case 'plugAndPlay':
      return t(locale, 'catalog.chip.plugAndPlay')
    case 'flexProgrammed':
      return t(locale, 'catalog.chip.flexProgrammed')
    case 'tagOn':
      return t(locale, 'catalog.chip.tagOn')
    case 'genuine':
      return t(locale, 'catalog.chip.genuine')
    default:
      return `+${chip.value ?? ''}`
  }
}

/**
 * Línea de instalación para Plug & Play (dirigida por DATOS): si el producto es
 * `plug_and_play`, devuelve la copy i18n; si no, null. La renderizan el card
 * (Vista A) y la fila densa (Vista B) como línea muted bajo los chips.
 */
export function pnpInstallLine(attributes: unknown, locale: Locale): string | null {
  return asAttrs(attributes).plug_and_play === true ? t(locale, 'catalog.pnp.install') : null
}
