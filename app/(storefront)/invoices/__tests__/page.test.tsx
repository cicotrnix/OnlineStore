import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: { value: { user: { id: string }; activeOrgId: string | null } | null } = {
  value: null,
}

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(async () => sessionRef.value),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}))

const wireRef: {
  value: NonNullable<NonNullable<import('@/modules/config').StoreConfig['payments']['wire']>> | null
} = {
  value: null,
}

vi.mock('@/stores', async () => {
  const actual = await vi.importActual<typeof import('@/stores')>('@/stores')
  return {
    ...actual,
    getStoreConfig: () => {
      const base = actual.getStoreConfig()
      return {
        ...base,
        modules: { ...base.modules, credit: true },
        payments: {
          ...base.payments,
          wire: wireRef.value ?? base.payments.wire,
        },
      }
    },
  }
})

beforeEach(async () => {
  await cleanDb()
  wireRef.value = null
})

async function seedInvoice() {
  const user = await prisma.user.create({
    data: { email: `inv-${Date.now()}-${Math.random()}@t.com` },
  })
  const org = await prisma.organization.create({
    data: {
      name: 'AcmeBuyer',
      slug: `acme-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
  })
  const addr = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'HQ',
      recipient: 'AcmeBuyer',
      line1: '123 Main',
      city: 'Austin',
      postalCode: '78701',
      country: 'US',
    },
  })
  const order = await prisma.order.create({
    data: {
      orderNumber: `O-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId: org.id,
      placedByUserId: user.id,
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
      status: 'CONFIRMED',
      subtotal: new Decimal('100.00'),
      total: new Decimal('100.00'),
      currency: 'USD',
    },
  })
  const inv = await prisma.invoice.create({
    data: {
      number: `INV-${Date.now()}`,
      organizationId: org.id,
      orderId: order.id,
      amount: new Decimal('100.00'),
      currency: 'USD',
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      status: 'PENDING',
    },
  })
  sessionRef.value = { user: { id: user.id }, activeOrgId: org.id }
  return inv
}

async function renderPage(id: string) {
  const { default: InvoiceDetailPage } = await import('../[id]/page')
  const tree = await InvoiceDetailPage({ params: Promise.resolve({ id }) })
  return renderToStaticMarkup(tree)
}

describe('InvoiceDetailPage — wire instructions section', () => {
  it('wire vacío / enabled:false → NO renderiza la sección de instrucciones', async () => {
    const inv = await seedInvoice()
    wireRef.value = {
      enabled: false,
      beneficiaryName: '',
      accountNumber: '',
    }
    const html = await renderPage(inv.id)
    expect(html).not.toMatch(/Payment instructions|Instrucciones de pago/i)
    expect(html).not.toMatch(/KonLLC/)
  })

  it('wire enabled + beneficiario + cuenta → SÍ renderiza la sección con los datos', async () => {
    const inv = await seedInvoice()
    wireRef.value = {
      enabled: true,
      beneficiaryName: 'KonLLC dba PiPower',
      bankName: 'Test Bank',
      accountNumber: '0001234567',
      routingNumber: '021000021',
      swift: 'TESTSWIFT',
      accountType: 'checking',
      reference: 'Memo: order number',
    }
    const html = await renderPage(inv.id)
    expect(html).toMatch(/Payment instructions|Instrucciones de pago/i)
    expect(html).toContain('KonLLC dba PiPower')
    expect(html).toContain('0001234567')
    expect(html).toContain('021000021')
  })
})
