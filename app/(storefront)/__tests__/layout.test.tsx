import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: { value: { user: { id: string } } | null } = { value: null }

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(async () => sessionRef.value),
}))

vi.mock('@/lib/auth/maintain', () => ({
  maintainCurrentSession: vi.fn(async () => {}),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}))

// HeaderContainer hace queries (cart, etc.) — para esta suite del layout no nos
// importa, así que lo mockeamos a un noop. El render solo importa cuando NO
// se redirige (caso anónimo + verificado).
vi.mock('@/components/commerce/HeaderContainer', () => ({
  HeaderContainer: () => null,
}))

vi.mock('@/components/commerce/ChatWidget', () => ({
  ChatWidget: () => null,
}))

beforeEach(async () => {
  await cleanDb()
  sessionRef.value = null
})

async function renderLayout() {
  const { default: StorefrontLayout } = await import('../layout')
  const tree = await StorefrontLayout({ children: <span>page</span> })
  return renderToStaticMarkup(tree)
}

describe('StorefrontLayout — no-org redirect', () => {
  it('user logueado sin membership → redirect /onboarding', async () => {
    const u = await prisma.user.create({
      data: { email: `no-${Date.now()}-${Math.random()}@t.com` },
    })
    sessionRef.value = { user: { id: u.id } }
    await expect(renderLayout()).rejects.toThrow(/REDIRECT:\/onboarding/)
  })

  it('anónimo → NO redirige (ADR 0034: catálogo público se mantiene)', async () => {
    sessionRef.value = null
    const html = await renderLayout()
    expect(html).toContain('page')
  })

  it('user con org VERIFIED → NO redirige', async () => {
    const u = await prisma.user.create({
      data: { email: `v-${Date.now()}-${Math.random()}@t.com` },
    })
    const org = await prisma.organization.create({
      data: {
        name: 'Verified',
        slug: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    })
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: u.id, role: 'OWNER' },
    })
    sessionRef.value = { user: { id: u.id } }
    const html = await renderLayout()
    expect(html).toContain('page')
  })
})
