import { describe, expect, it, vi } from 'vitest'
import { buildAccessFilter, isMeilisearchEnabled } from './meilisearch'

describe('meilisearch', () => {
  it('isMeilisearchEnabled returns false when env vars missing', () => {
    vi.stubEnv('MEILISEARCH_HOST', '')
    vi.stubEnv('MEILISEARCH_API_KEY', '')
    expect(isMeilisearchEnabled()).toBe(false)
    vi.unstubAllEnvs()
  })

  it('isMeilisearchEnabled returns true when both env vars present', () => {
    vi.stubEnv('MEILISEARCH_HOST', 'https://example.com')
    vi.stubEnv('MEILISEARCH_API_KEY', 'key')
    expect(isMeilisearchEnabled()).toBe(true)
    vi.unstubAllEnvs()
  })

  it('buildAccessFilter for anonymous includes isPrivate=false and categoryIsPrivate=false', () => {
    const result = buildAccessFilter({ anonymous: true })
    expect(result).toContain('isPrivate = false')
    expect(result).toContain('categoryIsPrivate = false')
    expect(result).toContain('isActive = true')
  })

  it('buildAccessFilter for logged user with grants includes id IN clause', () => {
    const result = buildAccessFilter({
      anonymous: false,
      grantedProductIds: ['p1', 'p2'],
      grantedCategoryIds: ['c1'],
    })
    expect(result).toContain('isPrivate = false OR id IN')
    expect(result).toContain('p1')
    expect(result).toContain('c1')
  })

  it('buildAccessFilter for logged user without grants is same as anonymous shape', () => {
    const result = buildAccessFilter({ anonymous: false })
    expect(result).toContain('isPrivate = false')
    expect(result).toContain('categoryIsPrivate = false')
  })
})
