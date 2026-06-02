import { prisma } from '@/lib/db/client'
import { _getFakeStripe, _resetStripe } from '@/lib/stripe'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { refundPayment } from '../refund'
import { handleStripeWebhook } from '../service'
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
      stripeIntentId: `pi_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    },
  })
  return { user, payment, order }
}

beforeEach(async () => {
  await cleanDb()
  _resetStripe()
})

describe('refundPayment — PSDD webhook-driven', () => {
  it('inicia refund: REFUND_PENDING (NO REFUNDED) + sin payment.refunded aún', async () => {
    const { user, payment } = await setup()
    const { token, otp } = await issueSensitiveActionToken({
      userId: user.id,
      action: 'payment.refund',
      subjectId: payment.id,
    })
    const r = await refundPayment({ paymentId: payment.id, byUserId: user.id, token, otp })
    expect(r.refundId).toMatch(/^re_/)
    const p = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(p.status).toBe('REFUND_PENDING')
    const ev = await prisma.domainEvent.findFirst({ where: { type: 'payment.refunded' } })
    expect(ev).toBeNull()
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

  it('webhook charge.refunded → REFUNDED + emite payment.refunded; replay idempotente', async () => {
    const { user, payment } = await setup()
    const { token, otp } = await issueSensitiveActionToken({
      userId: user.id,
      action: 'payment.refund',
      subjectId: payment.id,
    })
    await refundPayment({ paymentId: payment.id, byUserId: user.id, token, otp })

    const event = {
      id: `evt_ref_${Date.now()}`,
      type: 'charge.refunded',
      data: { object: { payment_intent: payment.stripeIntentId, amount_refunded: 5000 } },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    await handleStripeWebhook(body, signature)
    const p = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(p.status).toBe('REFUNDED')
    let evs = await prisma.domainEvent.findMany({ where: { type: 'payment.refunded' } })
    expect(evs).toHaveLength(1)

    await handleStripeWebhook(body, signature)
    evs = await prisma.domainEvent.findMany({ where: { type: 'payment.refunded' } })
    expect(evs).toHaveLength(1)
  })

  it('refundPayment idempotente: 2 calls → mismo refund id (idempotency key estable, sin Date.now)', async () => {
    const { user, payment } = await setup()
    const t1 = await issueSensitiveActionToken({
      userId: user.id,
      action: 'payment.refund',
      subjectId: payment.id,
    })
    const a = await refundPayment({
      paymentId: payment.id,
      byUserId: user.id,
      token: t1.token,
      otp: t1.otp,
    })
    const t2 = await issueSensitiveActionToken({
      userId: user.id,
      action: 'payment.refund',
      subjectId: payment.id,
    })
    const b = await refundPayment({
      paymentId: payment.id,
      byUserId: user.id,
      token: t2.token,
      otp: t2.otp,
    })
    expect(a.refundId).toBe(b.refundId)
  })
})
