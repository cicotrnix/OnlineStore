/**
 * E2E (carrito + checkout rediseñados) — contra el BUILD DE PRODUCCIÓN.
 * - Compra real (camino de revenue): buyer verificado con carrito + dirección →
 *   /checkout → place order → orden colocada (PENDING_PAYMENT) + stock baja.
 * - Mini-cart drawer: click en el ícono del header → drawer abre (NO navega a
 *   /cart) → "Checkout" navega a /checkout.
 *
 * El prod build corre sin STRIPE_ENABLED (wire-only); el webhook FakeStripe lo
 * cubre el e2e de dev (purchase-flow.spec). Acá se gatea que el flujo UI no se
 * rompa con el restyle.
 */
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const SESSION_COOKIE = 'authjs.session-token'
const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function seedBuyerWithCart() {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `cc-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: {
      name: `CcOrg-${s}`,
      slug: `cc-org-${s}`,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
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
      sku: `CC-${s}`,
      slug: `cc-prod-${s}`,
      name: `Checkout Battery ${s}`,
      basePrice: new Decimal('50.00'),
      stockQuantity: 10,
      categoryId: cat.id,
    },
  })
  await prisma.cart.create({
    data: {
      userId: user.id,
      items: {
        create: [{ productId: product.id, quantity: 2, unitPriceSnapshot: product.basePrice }],
      },
    },
  })
  const sessionToken = randomUUID()
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 86_400_000) },
  })
  return { user, org, product, sessionToken }
}

async function ctxFor(browser: import('@playwright/test').Browser, sessionToken: string) {
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
  return ctx
}

test.describe('carrito + checkout (prod build)', () => {
  test('compra real: buyer verificado → /checkout → place order → orden colocada', async ({
    browser,
  }) => {
    const { org, product, sessionToken } = await seedBuyerWithCart()
    const ctx = await ctxFor(browser, sessionToken)
    const page = await ctx.newPage()
    try {
      await page.goto('/checkout', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /place order/i }).click()
      await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 15_000 })

      const order = await prisma.order.findFirstOrThrow({
        where: { organizationId: org.id },
        orderBy: { placedAt: 'desc' },
      })
      expect(order.status).toBe('PENDING_PAYMENT')
      // placeOrder reserva stock una vez: 10 - 2 = 8.
      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity
      ).toBe(8)
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('mini-cart: click ícono → drawer abre (no navega) → Checkout → /checkout', async ({
    browser,
  }) => {
    const { sessionToken } = await seedBuyerWithCart()
    const ctx = await ctxFor(browser, sessionToken)
    const page = await ctx.newPage()
    try {
      await page.goto('/catalog', { waitUntil: 'networkidle' })
      // Ícono de carrito del header (verificado → trigger del MiniCart).
      await page
        .getByRole('link', { name: /\d+ items/i })
        .first()
        .click()
      // El drawer abre (no navega a /cart): "View full cart" es propio del drawer.
      await expect(page.getByRole('link', { name: /view full cart/i })).toBeVisible()
      await expect(page).not.toHaveURL(/\/cart$/)
      // "Checkout" del drawer navega a /checkout.
      await page.getByRole('link', { name: /^checkout$/i }).click()
      await page.waitForURL(/\/checkout$/, { timeout: 10_000 })
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })
})
