/**
 * E2E (loop de re-orden, spec 2026-06-13) — contra el BUILD DE PRODUCCIÓN.
 *
 * Es la prueba de que el loop existe de verdad — justo lo que la auditoría
 * detectó que faltaba (grep reorder = 0 hits). Coloca un pedido (seed), pulsa
 * "Volver a pedir" y aterriza en /cart con los items. Segundo caso: un pedido
 * cuyo producto está sin stock → muestra el aviso "nada disponible" y NO navega.
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

async function seedOrderForBuyer(opts: { stock: number }) {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `reord-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: { name: `ReordOrg-${s}`, slug: `reord-org-${s}`, verificationStatus: 'VERIFIED' },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
  })
  const addr = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'HQ',
      recipient: 'Buyer',
      line1: '1',
      city: 'X',
      postalCode: '0',
      country: 'US',
      isDefaultBilling: true,
      isDefaultShipping: true,
    },
  })
  const cat = await prisma.category.create({ data: { slug: `c-${s}`, name: 'C' } })
  const product = await prisma.product.create({
    data: {
      sku: `RO-${s}`,
      slug: `ro-prod-${s}`,
      name: `Reorderable Battery ${s}`,
      basePrice: new Decimal('50.00'),
      stockQuantity: opts.stock,
      categoryId: cat.id,
    },
  })
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${s}`,
      organizationId: org.id,
      placedByUserId: user.id,
      status: 'CONFIRMED',
      paymentMethod: 'PREPAID',
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
      subtotal: new Decimal('100.00'),
      total: new Decimal('100.00'),
      currency: 'USD',
      lines: {
        create: [
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unitPrice: new Decimal('50.00'),
            quantity: 2,
            lineTotal: new Decimal('100.00'),
          },
        ],
      },
    },
  })
  const sessionToken = randomUUID()
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 86_400_000) },
  })
  return { user, org, product, order, sessionToken }
}

async function pageWith(browser: import('@playwright/test').Browser, sessionToken: string) {
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
  return { ctx, page: await ctx.newPage() }
}

test.describe('loop de re-orden (prod build)', () => {
  test('coloca un pedido → "Volver a pedir" → aterriza en /cart con los items', async ({
    browser,
  }) => {
    const { product, order, sessionToken } = await seedOrderForBuyer({ stock: 10 })
    const { ctx, page } = await pageWith(browser, sessionToken)
    try {
      await page.goto(`/orders/${order.id}`)
      await page.getByRole('button', { name: /volver a pedir|reorder/i }).click()
      await page.waitForURL(/\/cart/, { timeout: 15_000 })
      // El producto del pedido está en el carrito.
      await expect(page.getByText(product.name).first()).toBeVisible()
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('pedido con producto sin stock → muestra el aviso y NO navega a /cart', async ({
    browser,
  }) => {
    const { order, sessionToken } = await seedOrderForBuyer({ stock: 0 })
    const { ctx, page } = await pageWith(browser, sessionToken)
    try {
      await page.goto(`/orders/${order.id}`)
      await page.getByRole('button', { name: /volver a pedir|reorder/i }).click()
      // Aviso "nada disponible" visible; sigue en el detalle del pedido.
      await expect(page.getByText(/available to reorder|disponible para re-pedir/i)).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/orders/${order.id}`))
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })
})
