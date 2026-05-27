import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/voyage', () => ({
  embedQuery: vi.fn().mockResolvedValue(new Array(512).fill(0.1)),
  embedDocument: vi.fn().mockResolvedValue(new Array(512).fill(0.2)),
  isVoyageEnabled: vi.fn().mockReturnValue(true),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('search.embeddings', () => {
  it('embedSearchQuery returns vector', async () => {
    const { embedSearchQuery } = await import('../embeddings')
    const vec = await embedSearchQuery('test query')
    expect(vec).toHaveLength(512)
  })

  it('embedProductText returns vector', async () => {
    const { embedProductText } = await import('../embeddings')
    const vec = await embedProductText('product description')
    expect(vec).toHaveLength(512)
  })

  it('formatVectorForPostgres returns pgvector literal string', async () => {
    const { formatVectorForPostgres } = await import('../embeddings')
    expect(formatVectorForPostgres([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]')
  })

  it('buildSearchableText concatenates name + description + sku + category', async () => {
    const { buildSearchableText } = await import('../embeddings')
    const text = buildSearchableText({
      name: 'Foo',
      description: 'Bar',
      sku: 'SK-1',
      category: { name: 'Tools' },
    })
    expect(text).toBe('Foo\nBar\nSK-1\nTools')
  })
})
