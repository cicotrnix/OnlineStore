import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const SESSION_COOKIE = 'authjs.session-token'
const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

/**
 * Regresión del bug: usuario VERIFIED con 1 sola org pero
 * `session.activeOrgId = null` (caso real del onboarding pre-fix)
 * debía poder usar /cart y /orders sin rebotar y los layouts de
 * (account) tenían que mostrar el navbar.
 */
test.describe('buyer-flow: 1 org sin activeOrgId — cart/orders + navbar (account)', () => {
  test('/cart y /orders resuelven (auto-pick) + navbar visible en (account)', async ({
    browser,
  }) => {
    const slug = `acme-buyerfix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await prisma.user.create({
      data: { email: `buyer-${Date.now()}-${Math.random()}@t.com` },
    })
    const org = await prisma.organization.create({
      data: {
        name: 'AcmeBuyer',
        slug,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    })
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
    })
    // Pre-seed cart para evitar race condition entre layout y page
    // (ambos llaman cartService.get → P2002 en getOrCreateCart cuando
    // la row no existe todavía). El bug del race es preexistente y
    // fuera del scope de este fix.
    await prisma.cart.create({ data: { userId: user.id } })

    const sessionToken = randomUUID()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { sessionToken, userId: user.id, expires, activeOrgId: null },
    })

    try {
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
          expires: Math.floor(expires.getTime() / 1000),
        },
      ])
      const page = await ctx.newPage()

      // /cart: no debe rebotar a /select-org ni mostrar "elegí una org".
      // Render del header presente confirma layout intacto.
      await page.goto('/cart')
      await expect(page).toHaveURL(/\/cart$/)
      await expect(page.locator('header').first()).toBeVisible()

      // /orders (en grupo de rutas (account)): si Bug A regresa, la página
      // queda sin <header>. Con el fix StoreHeader compartido, el header
      // y el link al catálogo deben estar visibles.
      await page.goto('/orders')
      await expect(page.locator('header').first()).toBeVisible()
      await expect(
        page
          .locator('header')
          .first()
          .getByRole('link', { name: /catálogo|catalog/i })
      ).toBeVisible()

      await ctx.close()
    } finally {
      await prisma.session.deleteMany({ where: { sessionToken } })
      await prisma.organizationMember.deleteMany({ where: { organizationId: org.id } })
      await prisma.cart.deleteMany({ where: { userId: user.id } })
      await prisma.organization.delete({ where: { id: org.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }
  })
})
