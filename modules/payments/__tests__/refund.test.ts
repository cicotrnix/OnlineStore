import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { refundPayment } from '../refund'
import { issueSensitiveActionToken } from '../step-up'

async function setup() {
  const user = await prisma.user.create({ data: { email: `r-${Date.now()}@t.com` } })
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
      status: 'CONFIRMED',
      paymentMethod: 'PREPAID',
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
      subtotal: new Decimal('50.00'),
      total: new Decimal('50.00'),
      currency: 'USD',
    },
  })
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: 'STRIPE_CARD',
      status: 'CAPTURED',
      amountCents: BigInt(5000),
      currency: 'USD',
      stripeIntentId: 'pi_test',
    },
  })
  return { user, payment }
}

beforeEach(async () => {
  await cleanDb()
})

describe('refundPayment', () => {
  it('refund válido con step-up correcto → REFUNDED + payment.refunded', async () => {
    const { user, payment } = await setup()
    const { token, otp } = await issueSensitiveActionToken({
      userId: user.id,
      action: 'payment.refund',
      subjectId: payment.id,
    })
    await refundPayment({ paymentId: payment.id, byUserId: user.id, token, otp })
    const p = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(p.status).toBe('REFUNDED')
    const ev = await prisma.domainEvent.findFirst({ where: { type: 'payment.refunded' } })
    expect(ev).not.toBeNull()
  })

  it('refund sin step-up válido → STEP_UP_FAILED', async () => {
    const { user, payment } = await setup()
    await expect(
      refundPayment({
        paymentId: payment.id,
        byUserId: user.id,
        token: 'bad',
        otp: '000000',
      })
    ).rejects.toThrow('STEP_UP_FAILED')
  })
})
