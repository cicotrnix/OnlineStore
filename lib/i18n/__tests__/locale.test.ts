import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getLocale', () => {
  it('devuelve preferredLocale del user si está logueado y es válido', async () => {
    const { cookies } = await import('next/headers')
    const { prisma } = await import('@/lib/db/client')
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ preferredLocale: 'es-419' } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: 'u1' })).toBe('es-419')
  })

  it('cae al cookie si user no tiene preferredLocale', async () => {
    const { cookies } = await import('next/headers')
    const { prisma } = await import('@/lib/db/client')
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'es-419' }) } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ preferredLocale: null } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: 'u1' })).toBe('es-419')
  })

  it('anónimo + cookie válida = locale del cookie', async () => {
    const { cookies } = await import('next/headers')
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'es-419' }) } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: null })).toBe('es-419')
  })

  it('anónimo + sin cookie = DEFAULT_LOCALE (en-US)', async () => {
    const { cookies } = await import('next/headers')
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: null })).toBe('en-US')
  })

  it('cookie con valor no soportado = DEFAULT_LOCALE', async () => {
    const { cookies } = await import('next/headers')
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'fr-FR' }) } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: null })).toBe('en-US')
  })
})
