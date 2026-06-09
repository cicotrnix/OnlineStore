import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = { id: 'placeholder', email: 'p@t.com' }
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(async () => authUser),
  getCurrentUser: vi.fn(async () => authUser),
}))

vi.mock('@/lib/auth/actions', () => ({
  switchActiveOrg: vi.fn(async (_orgId: string) => {}),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return {
    ...actual,
    useFormStatus: () => ({ pending: false, data: null, method: null, action: null }),
  }
})

beforeEach(async () => {
  await cleanDb()
})

async function makeUser() {
  const u = await prisma.user.create({ data: { email: `p-${Date.now()}-${Math.random()}@t.com` } })
  authUser.id = u.id
  authUser.email = u.email
  return u
}

async function makeOrgForUser(opts: {
  status: 'PENDING' | 'REJECTED'
  withCert: boolean
  rejectionReason?: string
}) {
  const u = await makeUser()
  const org = await prisma.organization.create({
    data: {
      name: 'Acme',
      slug: `acme-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      verificationStatus: opts.status,
      verificationSubmittedAt: new Date(),
      rejectionReason: opts.rejectionReason ?? null,
    },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: u.id, role: 'OWNER' },
  })
  if (opts.withCert) {
    await prisma.taxDocument.create({
      data: {
        organizationId: org.id,
        type: 'US_RESALE_CERT',
        number: 'TX-1',
        jurisdiction: 'TX',
        fileKey: `tax-docs/${org.id}/seed.pdf`,
        status: 'UPLOADED',
      },
    })
  }
  return org
}

async function renderPage() {
  const { default: OnboardingPendingPage } = await import('../onboarding/pending/page')
  const tree = await OnboardingPendingPage()
  return renderToStaticMarkup(tree)
}

describe('OnboardingPendingPage', () => {
  it('PENDING sin certificado → renderiza form de subida (input file presente)', async () => {
    await makeOrgForUser({ status: 'PENDING', withCert: false })
    const html = await renderPage()
    expect(html).toContain('name="file"')
    expect(html).toContain('name="type"')
    expect(html).toContain('name="number"')
    expect(html).toContain('name="jurisdiction"')
  })

  it('PENDING con certificado → NO renderiza form; muestra mensaje de revisión', async () => {
    await makeOrgForUser({ status: 'PENDING', withCert: true })
    const html = await renderPage()
    expect(html).not.toContain('name="file"')
    expect(html).toMatch(/under review|en revisión/i)
  })

  it('REJECTED → sigue renderizando form de re-subida (regresión)', async () => {
    await makeOrgForUser({ status: 'REJECTED', withCert: true, rejectionReason: 'expired' })
    const html = await renderPage()
    expect(html).toContain('name="file"')
    expect(html).toContain('expired')
  })
})
