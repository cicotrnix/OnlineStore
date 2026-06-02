import { prisma } from '@/lib/db/client'
import { _resetStripe } from '@/lib/stripe'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = { id: 'placeholder', email: 'buyer@t.com' }
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(async () => authUser),
  getCurrentUser: vi.fn(async () => authUser),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

const stripeEnabled = { value: false }
vi.mock('@/store.config', () => ({
  default: {
    payments: {
      get stripe() {
        return { enabled: stripeEnabled.value }
      },
      mercadopago: { enabled: false },
    },
  },
}))

async function makeOrderForUser(): Promise<{ orderId: string }> {
  const user = await prisma.user.create({ data: { email: `b-${Date.now()}@t.com` } })
  authUser.id = user.id
  authUser.email = user.email
  const org = await prisma.organization.create({
    data: { name: 'O', slug: `o-${Date.now()}`, verificationStatus: 'VERIFIED' },
  })
  const addr = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'M',
      recipient: 'R',
      line1: '1',
      city: 'X',
      postalCode: '0',
      country: 'US',
    },
  })
  const order = await prisma.order.create({
    data: {
      orderNumber: `O-${Date.now()}`,
      organizationId: org.id,
      placedByUserId: user.id,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'PREPAID',
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
      subtotal: new Decimal('50.00'),
      total: new Decimal('50.00'),
      currency: 'USD',
    },
  })
  return { orderId: order.id }
}

beforeEach(async () => {
  await cleanDb()
  _resetStripe()
  stripeEnabled.value = false
})

describe('startCardCheckoutAction', () => {
  it('flag off → throw PAYMENT_CARD_DISABLED', async () => {
    stripeEnabled.value = false
    const { startCardCheckoutAction } = await import('../_actions')
    const fd = new FormData()
    fd.set('orderId', 'whatever')
    await expect(startCardCheckoutAction(fd)).rejects.toThrow('PAYMENT_CARD_DISABLED')
  })

  it('flag on + orden propia + PENDING_PAYMENT → redirect a session.url (Fake)', async () => {
    stripeEnabled.value = true
    const { orderId } = await makeOrderForUser()
    const { startCardCheckoutAction } = await import('../_actions')
    const fd = new FormData()
    fd.set('orderId', orderId)
    await expect(startCardCheckoutAction(fd)).rejects.toThrow(/REDIRECT:https:\/\/stripe\.fake\/checkout\//)
    // Payment PENDING fue creado por createCardCheckout.
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } })
    expect(payment.status).toBe('PENDING')
    expect(payment.method).toBe('STRIPE_CARD')
  })

  it('orden de otro usuario → throw FORBIDDEN', async () => {
    stripeEnabled.value = true
    const { orderId } = await makeOrderForUser()
    // Cambiar el usuario "autenticado" a otro.
    const other = await prisma.user.create({ data: { email: `other-${Date.now()}@t.com` } })
    authUser.id = other.id
    authUser.email = other.email
    const { startCardCheckoutAction } = await import('../_actions')
    const fd = new FormData()
    fd.set('orderId', orderId)
    await expect(startCardCheckoutAction(fd)).rejects.toThrow('FORBIDDEN')
  })

  it('orden CONFIRMED → throw ORDER_NOT_PAYABLE', async () => {
    stripeEnabled.value = true
    const { orderId } = await makeOrderForUser()
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } })
    const { startCardCheckoutAction } = await import('../_actions')
    const fd = new FormData()
    fd.set('orderId', orderId)
    await expect(startCardCheckoutAction(fd)).rejects.toThrow('ORDER_NOT_PAYABLE')
  })
})
