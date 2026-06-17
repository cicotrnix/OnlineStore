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

  it('sin SKUs ni slugs duplicados en el catálogo', () => {
    const skus = PIPOWER_PRODUCTS.map((p) => p.sku)
    const slugs = PIPOWER_PRODUCTS.map((p) => p.slug)
    expect(new Set(skus).size).toBe(skus.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
