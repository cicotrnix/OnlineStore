/**
 * E2E (unificación del header) — contra el BUILD DE PRODUCCIÓN.
 * Prueba que el chrome es UNO solo cruzando home → /catalog → /cart (mata la
 * costura de dos-marcas), que el drawer mobile abre/cierra, y que "Buy again"
 * del menú navega a /orders.
 */
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const SESSION_COOKIE = 'authjs.session-token'
const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function seedBuyerSession() {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `hdr-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: { name: `HdrOrg-${s}`, slug: `hdr-org-${s}`, verificationStatus: 'VERIFIED' },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
  })
  const sessionToken = randomUUID()
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 86_400_000) },
  })
  return { sessionToken }
}

async function ctxWith(
  browser: import('@playwright/test').Browser,
  sessionToken: string,
  mobile = false
) {
  const ctx = await browser.newContext(
    mobile ? { viewport: { width: 390, height: 844 } } : undefined
  )
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

test.describe('header unificado (prod build)', () => {
  test('chrome consistente cruzando home → /catalog → /cart (sin costura de dos-marcas)', async ({
    browser,
  }) => {
    const { sessionToken } = await seedBuyerSession()
    const ctx = await ctxWith(browser, sessionToken)
    const page = await ctx.newPage()
    try {
      for (const path of ['/', '/catalog', '/cart']) {
        await page.goto(path, { waitUntil: 'networkidle' })
        const header = page.getByRole('banner')
        await expect(header, `header en ${path}`).toBeVisible()
        // Mismo chrome: el menú de cuenta ("My account") está en las 3.
        await expect(
          header.getByRole('button', { name: /my account/i }),
          `account menu en ${path}`
        ).toBeVisible()
      }
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('"Buy again" del menú de cuenta navega a /orders', async ({ browser }) => {
    const { sessionToken } = await seedBuyerSession()
    const ctx = await ctxWith(browser, sessionToken)
    const page = await ctx.newPage()
    try {
      await page.goto('/catalog', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /my account/i }).click()
      await page.getByRole('menuitem', { name: /buy again/i }).click()
      await page.waitForURL(/\/orders/, { timeout: 15_000 })
      await expect(page).toHaveURL(/\/orders/)
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('drawer mobile abre y cierra', async ({ browser }) => {
    const { sessionToken } = await seedBuyerSession()
    const ctx = await ctxWith(browser, sessionToken, true)
    const page = await ctx.newPage()
    try {
      await page.goto('/catalog', { waitUntil: 'networkidle' })
      // Abre con la hamburguesa.
      await page.getByRole('button', { name: /^menu$/i }).click()
      const close = page.getByRole('button', { name: /^close$/i })
      await expect(close).toBeVisible()
      // Cierra.
      await close.click()
      await expect(close).toBeHidden()
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })
})
