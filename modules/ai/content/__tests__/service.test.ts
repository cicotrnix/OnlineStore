import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))

vi.mock('@/modules/ai/provider', () => ({
  isAIEnabled: vi.fn().mockReturnValue(true),
  complete: vi.fn(),
}))

beforeEach(async () => {
  await cleanDb()
  vi.clearAllMocks()
})

describe('generateContentForProduct', () => {
  it('genera y persiste DRAFT', async () => {
    const sample = readFileSync(join(__dirname, 'fixtures', 'sample-en.txt'), 'utf-8')
    const { complete } = await import('@/modules/ai/provider')
    vi.mocked(complete).mockResolvedValue({
      text: sample,
      usage: { inputTokens: 100, outputTokens: 200 },
    })

    const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}`, name: 'Battery' } })
    const p = await prisma.product.create({
      data: {
        sku: `S-${Date.now()}`,
        slug: `s-${Date.now()}`,
        name: 'Battery X',
        basePrice: '10.00',
        categoryId: cat.id,
        attributes: { capacity_mah: 3279 } as never,
        compatibleModels: ['iPhone 13'],
      },
    })

    const { generateContentForProduct } = await import('../service')
    const result = await generateContentForProduct({ productId: p.id, locale: 'en-US' })

    expect(result.status).toBe('DRAFT')
    const row = await prisma.productContent.findFirst({
      where: { productId: p.id, locale: 'en-US' },
    })
    expect(row?.status).toBe('DRAFT')
    expect(row?.longDescriptionMd).toContain('OVERVIEW')
    expect(row?.shortDescription).toBeTruthy()
  })

  it('lanza si el producto no existe', async () => {
    const { generateContentForProduct } = await import('../service')
    await expect(generateContentForProduct({ productId: 'nope', locale: 'en-US' })).rejects.toThrow(
      /not found/i
    )
  })
})
