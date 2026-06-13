import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores', async () => {
  const actual = await vi.importActual<typeof import('@/stores')>('@/stores')
  const base = actual.getStoreConfig()
  return {
    ...actual,
    getStoreConfig: () => ({
      ...base,
      modules: { ...base.modules, privateCatalogs: true },
    }),
  }
})

beforeEach(async () => {
  await cleanDb()
})

async function makeProduct(
  suffix: string,
  opts: { compat?: string[]; isActive?: boolean; isPrivate?: boolean } = {}
) {
  const cat = await prisma.category.create({ data: { slug: `c-${suffix}`, name: 'Battery' } })
  return prisma.product.create({
    data: {
      sku: `S-${suffix}`,
      slug: `s-${suffix}`,
      name: `Battery ${suffix}`,
      basePrice: new Decimal('10.00'),
      stockQuantity: 5,
      categoryId: cat.id,
      isActive: opts.isActive ?? true,
      isPrivate: opts.isPrivate ?? false,
      compatibleModels: opts.compat ?? ['iPhone X'],
    },
  })
}

describe('chat tools', () => {
  it('searchProducts devuelve hits accesibles', async () => {
    const p = await makeProduct(`a-${Date.now()}`)
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'searchProducts',
      { query: 'Battery' },
      { orgId: null, locale: 'en-US' }
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      const results = r.data.results as { id: string }[]
      expect(results.map((x) => x.id)).toContain(p.id)
    }
  })

  it('getProductDetail NO expone precio al anónimo (ADR 0034: precio gated por verificación)', async () => {
    const p = await makeProduct(`b-${Date.now()}`)
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'getProductDetail',
      { productId: p.id },
      { orgId: null, locale: 'en-US' }
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.id).toBe(p.id) // specs/visibilidad sí
      expect(r.data.priceVisible).toBe(false)
      expect(r.data.priceResolved).toBeUndefined()
      expect(r.data.basePrice).toBeUndefined()
    }
  })

  it('getProductDetail NO expone precio a org PENDING/REJECTED', async () => {
    const p = await makeProduct(`pend-${Date.now()}`)
    const org = await prisma.organization.create({
      data: { name: 'O', slug: `pend-${Date.now()}`, verificationStatus: 'PENDING' },
    })
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'getProductDetail',
      { productId: p.id },
      { orgId: org.id, locale: 'en-US' }
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.priceVisible).toBe(false)
      expect(r.data.priceResolved).toBeUndefined()
      expect(r.data.basePrice).toBeUndefined()
    }
  })

  it('searchProducts NO incluye precio al anónimo', async () => {
    await makeProduct(`anonp-${Date.now()}`)
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'searchProducts',
      { query: 'Battery' },
      { orgId: null, locale: 'en-US' }
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      const results = r.data.results as Array<Record<string, unknown>>
      expect(results.length).toBeGreaterThan(0)
      for (const x of results) {
        expect(x.priceVisible).toBe(false)
        expect(x.priceResolved).toBeUndefined()
      }
    }
  })

  it('checkCompatibility filtra por compatibleModels', async () => {
    await makeProduct(`c1-${Date.now()}`, { compat: ['iPhone 14 Pro'] })
    await makeProduct(`c2-${Date.now() + 1}`, { compat: ['iPhone 13'] })
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'checkCompatibility',
      { model: 'iPhone 14 Pro' },
      { orgId: null, locale: 'en-US' }
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      const matches = r.data.matches as { compatibleModels: string[] }[]
      expect(matches.length).toBe(1)
      expect(matches[0]?.compatibleModels).toContain('iPhone 14 Pro')
    }
  })

  it('getProductDetail con producto inexistente devuelve ok:false', async () => {
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'getProductDetail',
      { productId: 'nope' },
      { orgId: null, locale: 'en-US' }
    )
    expect(r.ok).toBe(false)
  })

  it('checkCompatibility sin matches devuelve ok:false con hint', async () => {
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'checkCompatibility',
      { model: 'iPhone 99' },
      { orgId: null, locale: 'en-US' }
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.hint).toMatch(/support|contact/i)
    }
  })

  it('searchProducts oculta producto privado al anónimo', async () => {
    await makeProduct(`priv-${Date.now()}`, { isPrivate: true })
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'searchProducts',
      { query: 'Battery' },
      { orgId: null, locale: 'en-US' }
    )
    // anónimo NO debe ver el privado: ok:false (catálogo vacío)
    expect(r.ok).toBe(false)
  })

  it('getProductDetail bloquea producto privado a org sin grant', async () => {
    const p = await makeProduct(`priv2-${Date.now()}`, { isPrivate: true })
    const org = await prisma.organization.create({
      data: { name: 'O', slug: `o-${Date.now()}` },
    })
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'getProductDetail',
      { productId: p.id },
      { orgId: org.id, locale: 'en-US' }
    )
    expect(r.ok).toBe(false)
  })

  it('getProductDetail devuelve customer price a org VERIFIED con CustomerPrice', async () => {
    const p = await makeProduct(`pp-${Date.now()}`)
    const org = await prisma.organization.create({
      data: { name: 'O', slug: `pp-${Date.now()}`, verificationStatus: 'VERIFIED' },
    })
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: p.id,
        price: new Decimal('7.50'),
      },
    })
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'getProductDetail',
      { productId: p.id },
      { orgId: org.id, locale: 'en-US' }
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      // org VERIFIED → precio visible. base 10.00; con CustomerPrice resuelve a 7.50.
      expect(r.data.priceVisible).toBe(true)
      expect(String(r.data.priceResolved)).toBe('7.5')
      expect(String(r.data.basePrice)).toBe('10')
    }
  })

  it('producto inactivo no se incluye en searchProducts', async () => {
    await makeProduct(`inact-${Date.now()}`, { isActive: false })
    const { handleTool } = await import('../tools')
    const r = await handleTool(
      'searchProducts',
      { query: 'Battery' },
      { orgId: null, locale: 'en-US' }
    )
    expect(r.ok).toBe(false)
  })
})
