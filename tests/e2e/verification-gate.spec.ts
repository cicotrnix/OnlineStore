/**
 * E2E (TST-3): gate de verificación B2B por UI.
 *   Una org PENDING (no verificada) no puede llegar al checkout: la página
 *   /checkout redirige a /onboarding/pending (requireVerifiedCustomer).
 *   Una org VERIFIED sí accede al checkout.
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

async function seedUserWithOrg(status: 'PENDING' | 'VERIFIED') {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `vg-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: { name: `VGOrg-${s}`, slug: `vg-org-${s}`, verificationStatus: status },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
  })
  await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'HQ',
      recipient: 'VG',
      line1: '1 St',
      city: 'X',
      postalCode: '0',
      country: 'US',
      isDefaultBilling: true,
      isDefaultShipping: true,
    },
  })
  // Carrito con un item para que /checkout no redirija por carrito vacío.
  const cat = await prisma.category.create({ data: { name: `VGCat-${s}`, slug: `vg-cat-${s}` } })
  const product = await prisma.product.create({
    data: {
      sku: `VG-${s}`,
      slug: `vg-prod-${s}`,
      name: `VG Battery ${s}`,
      basePrice: new Decimal('50.00'),
      stockQuantity: 10,
      categoryId: cat.id,
    },
  })
  const cart = await prisma.cart.create({ data: { userId: user.id } })
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: product.id,
      quantity: 1,
      unitPriceSnapshot: new Decimal('50.00'),
    },
  })
  const sessionToken = randomUUID()
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 86_400_000) },
  })
  return { user, org, sessionToken }
}

async function pageWithSession(browser: import('@playwright/test').Browser, sessionToken: string) {
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

test.describe('gate de verificación B2B en checkout', () => {
  test('org PENDING → /checkout redirige a /onboarding/pending', async ({ browser }) => {
    const { sessionToken } = await seedUserWithOrg('PENDING')
    const { ctx, page } = await pageWithSession(browser, sessionToken)
    try {
      await page.goto('/checkout')
      await page.waitForURL(/\/onboarding\/pending/, { timeout: 15_000 })
      await expect(page).toHaveURL(/\/onboarding\/pending/)
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('org VERIFIED → /checkout accede (no redirige al onboarding)', async ({ browser }) => {
    const { sessionToken } = await seedUserWithOrg('VERIFIED')
    const { ctx, page } = await pageWithSession(browser, sessionToken)
    try {
      await page.goto('/checkout')
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/checkout/)
      await expect(page).not.toHaveURL(/\/onboarding/)
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })
})
