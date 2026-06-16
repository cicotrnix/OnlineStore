/**
 * E2E (build de producción) del admin rediseñado "Back to 100%" — Fase 0.
 * Harness reusable por las fases siguientes: siembra una sesión isPlatformAdmin
 * y un usuario normal. Cubre el gate de acceso, el render del Dashboard
 * restilado (shell slate + MetricCard) y axe sobre /admin autenticado.
 */
import { randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
import { type BrowserContext, expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const SESSION_COOKIE = 'authjs.session-token'
const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function seedUser(isPlatformAdmin: boolean) {
  const user = await prisma.user.create({
    data: {
      email: `adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@t.com`,
      emailVerified: new Date(),
      isPlatformAdmin,
    },
  })
  const token = randomUUID()
  await prisma.session.create({
    data: { sessionToken: token, userId: user.id, expires: new Date(Date.now() + 1e9) },
  })
  return { user, token }
}

async function withSession(context: BrowserContext, token: string) {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 86_400,
    },
  ])
}

test.describe('admin shell (prod build) — Fase 0', () => {
  test('gate: platform admin → /admin renderiza el Dashboard', async ({ browser }) => {
    const { user, token } = await seedUser(true)
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      await page.goto('/admin', { waitUntil: 'networkidle' })
      expect(page.url()).toMatch(/\/admin$/)
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
      // Sidebar slate con nav: el item activo del dashboard.
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
      await ctx.close()
    } finally {
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })

  test('gate: usuario sin isPlatformAdmin es redirigido fuera de /admin', async ({ browser }) => {
    const { user, token } = await seedUser(false)
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      await page.goto('/admin', { waitUntil: 'networkidle' })
      expect(page.url()).not.toMatch(/\/admin/)
      await ctx.close()
    } finally {
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })

  test('a11y axe: /admin (slate shell) sin violaciones serious/critical', async ({ browser }) => {
    const { user, token } = await seedUser(true)
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      await page.goto('/admin', { waitUntil: 'networkidle' })
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const blocking = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      )
      if (blocking.length > 0) {
        console.log(
          'axe /admin:',
          JSON.stringify(
            blocking.map((v) => ({ id: v.id, nodes: v.nodes.length })),
            null,
            2
          )
        )
      }
      expect(blocking, 'a11y serious/critical en /admin').toEqual([])
      await ctx.close()
    } finally {
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })
})

test.describe('admin catalog (prod build) — Fase 1', () => {
  async function axeBlocking(page: import('@playwright/test').Page) {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  }

  test('products + categories + detail renderizan (DataTable) y pasan axe', async ({ browser }) => {
    const { user, token } = await seedUser(true)
    const product = await prisma.product.findFirst({ select: { id: true, sku: true } })
    expect(product, 'la DB del e2e prod debe estar seedeada').not.toBeNull()
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()

      // /admin/products — DataTable con datos reales
      await page.goto('/admin/products', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
      await expect(page.getByText(product!.sku).first()).toBeVisible()
      expect(await axeBlocking(page), 'axe /admin/products').toEqual([])

      // /admin/categories
      await page.goto('/admin/categories', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()
      expect(await axeBlocking(page), 'axe /admin/categories').toEqual([])

      // /admin/products/[id]
      await page.goto(`/admin/products/${product!.id}`, { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'AI content' })).toBeVisible()
      expect(await axeBlocking(page), 'axe /admin/products/[id]').toEqual([])

      await ctx.close()
    } finally {
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })
})
