import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = new Map<string, { value: string; opts: unknown }>()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: (name: string, value: string, opts: unknown) => cookieStore.set(name, { value, opts }),
    get: (name: string) =>
      cookieStore.has(name) ? { value: cookieStore.get(name)!.value } : undefined,
  })),
}))

beforeEach(async () => {
  await cleanDb()
  cookieStore.clear()
})
afterEach(() => vi.unstubAllEnvs())

describe('createDbSession', () => {
  it('crea fila Session + cookie para el user', async () => {
    const { createDbSession } = await import('@/lib/auth/session')
    const u = await prisma.user.create({ data: { email: `s-${Date.now()}@t.com` } })
    await createDbSession(u.id)
    const sess = await prisma.session.findFirst({ where: { userId: u.id } })
    expect(sess).not.toBeNull()
    expect(sess!.lastSeenAt).toBeInstanceOf(Date)
    expect(sess!.activeOrgId).toBeNull()
    expect(cookieStore.has('authjs.session-token')).toBe(true)
  })
})
