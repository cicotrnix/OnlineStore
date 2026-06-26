import { describe, expect, it } from 'vitest'
import { LEGACY_SKUS, PIPOWER_PRODUCTS } from '../pipower-catalog'

const tagOn = PIPOWER_PRODUCTS.filter((p) => p.categorySlug === 'tag-on-flex')
const OLD_PRO_SKUS = ['PP-TO-13P', 'PP-TO-13PM', 'PP-TO-14P', 'PP-TO-14PM']

describe('pipower-catalog — tag-on flex consolidation', () => {
  it('tag-on-flex tiene exactamente 8 SKUs activos', () => {
    expect(tagOn).toHaveLength(8)
  })

  it('cada tag-on tiene imageUrl real (/products/tag-on/...), ninguno null', () => {
    for (const p of tagOn) {
      expect(p.imageUrl, p.sku).toMatch(/^\/products\/tag-on\/.+\.png$/)
    }
  })

  it('PP-TO-PRO-1314 unificado: slug + imagen compartida + 4 modelos Pro en name/desc', () => {
    const unified = tagOn.find((p) => p.sku === 'PP-TO-PRO-1314')
    expect(unified).toBeDefined()
    expect(unified?.slug).toBe('tag-on-flex-pro-13-14')
    expect(unified?.imageUrl).toBe('/products/tag-on/13-14-pro-promax-shared.png')
    for (const model of ['13 Pro', '13 Pro Max', '14 Pro', '14 Pro Max']) {
      expect(unified?.name, model).toContain(model)
    }
  })

  it('los 4 SKUs Pro viejos están en LEGACY_SKUS y NO en el catálogo activo', () => {
    for (const sku of OLD_PRO_SKUS) {
      expect(LEGACY_SKUS, sku).toContain(sku)
      expect(
        PIPOWER_PRODUCTS.some((p) => p.sku === sku),
        sku
      ).toBe(false)
    }
  })

  it('plug-and-play: 9 SKUs, cada uno con imageUrl real, coming_soon + precio 0', () => {
    const pnp = PIPOWER_PRODUCTS.filter((p) => p.categorySlug === 'plug-and-play')
    expect(pnp).toHaveLength(9)
    for (const p of pnp) {
      expect(p.imageUrl, p.sku).toMatch(/^\/products\/plug-and-play\/.+\.png$/)
      expect(p.basePrice, p.sku).toBe('0.00')
      expect((p.attributes as { coming_soon?: boolean } | null)?.coming_soon, p.sku).toBe(true)
    }
  })

  it('sin SKUs ni slugs duplicados en el catálogo', () => {
    const skus = PIPOWER_PRODUCTS.map((p) => p.sku)
    const slugs = PIPOWER_PRODUCTS.map((p) => p.slug)
    expect(new Set(skus).size).toBe(skus.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('pipower-catalog — Extended Capacity (mAh documentado por modelo)', () => {
  const bySku = (sku: string) => PIPOWER_PRODUCTS.find((p) => p.sku === sku)
  const attrsOf = (sku: string) =>
    (bySku(sku)?.attributes ?? {}) as { capacity?: unknown; rated_capacity_mah?: unknown }

  // Solo modelos con mapeo inequívoco a una celda documentada (高容) en
  // docs/sources/capacity-data.md: iPhone 13 / 14 / 15 base.
  const MAPPED: Record<string, number> = {
    'PP-BC-13': 3630,
    'PP-BC-14': 3580,
    'PP-BC-15': 3520,
  }

  it('los modelos documentados cargan capacity (string "<mAh> mAh") + rated_capacity_mah (número)', () => {
    for (const [sku, mah] of Object.entries(MAPPED)) {
      const a = attrsOf(sku)
      expect(a.capacity, sku).toBe(`${mah} mAh`)
      expect(a.rated_capacity_mah, sku).toBe(mah)
      // El sistema solo rendea capacity si es string real (FU-010 / product-display).
      expect(typeof a.capacity, sku).toBe('string')
    }
  })

  it('NO publica % vs OEM en ningún copy de capacidad (solo mAh absoluto)', () => {
    for (const sku of Object.keys(MAPPED)) {
      expect(String(attrsOf(sku).capacity), sku).not.toContain('%')
    }
  })

  it('los modelos SIN figura documentada (12/12 Pro, Pro, Pro Max) NO traen capacity inventada', () => {
    const UNMAPPED = [
      'PP-BC-1212P',
      'PP-BC-12PM',
      'PP-BC-13P',
      'PP-BC-13PM',
      'PP-BC-14P',
      'PP-BC-14PM',
      'PP-BC-15P',
      'PP-BC-15PM',
    ]
    for (const sku of UNMAPPED) {
      const a = attrsOf(sku)
      expect(a.capacity, sku).toBeUndefined()
      expect(a.rated_capacity_mah, sku).toBeUndefined()
    }
  })
})
