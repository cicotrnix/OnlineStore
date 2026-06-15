/**
 * E2E (PDP rediseñada) — contra el BUILD DE PRODUCCIÓN.
 * Cubre: render de un producto real (h1, SpecReadout instrumento, chips, gating
 * de precio), metadata SEO, precio + stepper para verificado, y el caso
 * coming-soon (plug&play) que muestra el estado SIN precio (el 0.00 placeholder
 * nunca se ve) y sin stepper.
 *
 * Nota: PDP-related sale vacío sin embeddings pgvector (Voyage) → el bloque se
 * oculta graceful; no se smokea acá (esperado por el spec).
 */
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const SESSION_COOKIE = 'authjs.session-token'
const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function seedVerifiedBuyer() {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `pdp-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: {
      name: `PdpOrg-${s}`,
      slug: `pdp-org-${s}`,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
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

async function buyerContext(browser: import('@playwright/test').Browser, sessionToken: string) {
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

test.describe('PDP rediseñada (prod build)', () => {
  test('producto real renderiza (anon): h1, SpecReadout, gating, chips, metadata', async ({
    page,
  }) => {
    await page.goto('/products/iphone-13', { waitUntil: 'networkidle' })
    // h1 = nombre del producto (jerarquía de headings correcta)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/iPhone 13 High Capacity/i)
    // SpecReadout instrumento: labels health/cycles
    await expect(page.getByText(/^health$/i).first()).toBeVisible()
    await expect(page.getByText(/^cycles$/i).first()).toBeVisible()
    // chips de atributo (sello 0-cycle overlaid en el hero)
    await expect(page.getByText(/0-cycle/i).first()).toBeVisible()
    // anon → gating de precio (CTA), sin PriceTag
    await expect(page.getByText(/sign in or register/i)).toBeVisible()
    // metadata SEO: title con el nombre del producto
    await expect(page).toHaveTitle(/iPhone 13/i)
  })

  test('verificado: precio + stepper Add', async ({ browser }) => {
    const { sessionToken } = await seedVerifiedBuyer()
    const ctx = await buyerContext(browser, sessionToken)
    const page = await ctx.newPage()
    try {
      await page.goto('/products/iphone-13', { waitUntil: 'networkidle' })
      await expect(page.getByText(/\$9\.00/)).toBeVisible()
      await expect(page.getByRole('spinbutton')).toBeVisible()
      await expect(page.getByRole('button', { name: /add/i })).toBeVisible()
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('coming-soon (plug&play): estado + Notify, SIN precio ni stepper', async ({ browser }) => {
    const { sessionToken } = await seedVerifiedBuyer()
    const ctx = await buyerContext(browser, sessionToken)
    const page = await ctx.newPage()
    try {
      // Verificado: igual no debe ver el 0.00 placeholder ni el stepper.
      await page.goto('/products/iphone-13-plug-and-play', { waitUntil: 'networkidle' })
      await expect(page.getByText(/coming soon/i).first()).toBeVisible()
      await expect(page.getByRole('link', { name: /notify/i })).toBeVisible()
      await expect(page.getByText(/\$0\.00/)).toHaveCount(0)
      await expect(page.getByRole('spinbutton')).toHaveCount(0)
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })
})
