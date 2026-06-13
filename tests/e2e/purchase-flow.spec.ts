/**
 * E2E (TST-3): compra real de punta a punta.
 *   UI: buyer verificado → add to cart → /cart → /checkout → place order
 *       (placeOrder reserva stock UNA vez, ADR 0036).
 *   Pago: webhook checkout.session.completed FIRMADO por FakeStripe → CONFIRMED.
 *   Asserts: stock baja exactamente una vez (no doble decremento) y el webhook
 *   confirma la orden sin volver a tocar stock.
 *
 * Requiere dev server (pnpm dev) con STRIPE_ENABLED=true — el webServer de
 * playwright.config lo setea (FakeStripe en dev, sin claves → sin fail-fast).
 */
import { createHmac, randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const SESSION_COOKIE = 'authjs.session-token'
// FakeStripe firma con STRIPE_WEBHOOK_SECRET ?? 'whsec_fake'; el dev e2e no setea
// la clave, así que el secreto es el default público.
const FAKE_WEBHOOK_SECRET = 'whsec_fake'

const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function seedBuyer() {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `buyer-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: { name: `BuyerOrg-${s}`, slug: `buyer-org-${s}`, verificationStatus: 'VERIFIED' },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
  })
  await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'HQ',
      recipient: 'Buyer',
      line1: '1 Buyer St',
      city: 'Testville',
      postalCode: '00000',
      country: 'US',
      isDefaultBilling: true,
      isDefaultShipping: true,
    },
  })
  const cat = await prisma.category.create({ data: { name: `Cat-${s}`, slug: `cat-${s}` } })
  const product = await prisma.product.create({
    data: {
      sku: `BUY-${s}`,
      slug: `buy-prod-${s}`,
      name: `Buyable Battery ${s}`,
      basePrice: new Decimal('50.00'),
      stockQuantity: 10,
      categoryId: cat.id,
    },
  })
  const sessionToken = randomUUID()
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 86_400_000) },
  })
  return { user, org, product, sessionToken }
}

test.describe('compra real con webhook FakeStripe', () => {
  test('add→cart→checkout→webhook firmado: stock baja UNA vez y la orden queda CONFIRMED', async ({
    browser,
    request,
  }) => {
    const { org, product, sessionToken } = await seedBuyer()

    const ctx = await browser.newContext()
    await ctx.addCookies([
      {
        name: SESSION_COOKIE,
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor((Date.now() + 86_400_000) / 1000),
      },
    ])
    const page = await ctx.newPage()

    try {
      // ── 1. Add to cart (UI) ────────────────────────────────────────────
      await page.goto(`/products/${product.slug}`)
      await page
        .getByRole('button', { name: /agregar|add/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle')

      // ── 2. Cart muestra el producto ────────────────────────────────────
      await page.goto('/cart')
      await expect(page.getByText(product.name).first()).toBeVisible()

      // ── 3. Checkout → place order ──────────────────────────────────────
      await page.goto('/checkout')
      await page.getByRole('button', { name: /colocar pedido|place order/i }).click()
      await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 15_000 })

      // ── 4. Orden PENDING_PAYMENT + stock decrementado UNA vez ───────────
      const order = await prisma.order.findFirstOrThrow({
        where: { organizationId: org.id },
        orderBy: { placedAt: 'desc' },
      })
      expect(order.status).toBe('PENDING_PAYMENT')
      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity
      ).toBe(9)

      // ── 5. Crear Payment de tarjeta (como createCardCheckout) ──────────
      const sessionId = `cs_e2e_${Date.now()}`
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'STRIPE_CARD',
          status: 'PENDING',
          amountCents: 5000n,
          currency: order.currency,
          stripeSessionId: sessionId,
          stripeIntentId: `pi_e2e_${Date.now()}`,
          idempotencyKey: `pay-${order.id}`,
        },
      })

      // ── 6. Webhook checkout.session.completed FIRMADO ──────────────────
      const event = {
        id: `evt_e2e_${Date.now()}`,
        type: 'checkout.session.completed',
        data: { object: { id: sessionId, amount_total: 5000, currency: 'usd' } },
      }
      const body = JSON.stringify(event)
      const signature = createHmac('sha256', FAKE_WEBHOOK_SECRET).update(body).digest('hex')
      const res = await request.post('/api/webhooks/stripe', {
        headers: { 'content-type': 'application/json', 'stripe-signature': signature },
        data: body,
      })
      expect(res.status()).toBe(200)

      // ── 7. CONFIRMED + stock SIGUE en 9 (webhook no re-decrementa) ─────
      const confirmed = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
      expect(confirmed.status).toBe('CONFIRMED')
      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity
      ).toBe(9)
      const captured = await prisma.domainEvent.findFirst({
        where: { type: 'payment.captured', aggregateType: 'Payment' },
        orderBy: { occurredAt: 'desc' },
      })
      expect(captured).not.toBeNull()
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })
})
