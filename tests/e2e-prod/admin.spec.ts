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

test.describe('admin commerce (prod build) — Fase 2', () => {
  async function axeBlocking(page: import('@playwright/test').Page) {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  }

  test('listas + detalle de orden con acciones (StatusBadge i18n) pasan axe', async ({
    browser,
  }) => {
    const { user, token } = await seedUser(true)
    // Orden PENDING_PAYMENT seedeada → ejercita botones lime/outline/danger del detalle.
    const product = await prisma.product.findFirst({ select: { id: true, sku: true, name: true } })
    const org = await prisma.organization.create({
      data: {
        name: 'Commerce E2E Co',
        slug: `commerce-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        addresses: {
          create: {
            label: 'HQ',
            recipient: 'R',
            line1: 'L1',
            city: 'Miami',
            postalCode: '33101',
            country: 'US',
            isDefaultBilling: true,
            isDefaultShipping: true,
          },
        },
      },
      include: { addresses: true },
    })
    const addr = org.addresses[0]!
    const order = await prisma.order.create({
      data: {
        orderNumber: `O-E2E-${Date.now()}`,
        organizationId: org.id,
        placedByUserId: user.id,
        status: 'PENDING_PAYMENT',
        billingAddressId: addr.id,
        shippingAddressId: addr.id,
        subtotal: 100,
        total: 100,
        currency: 'USD',
        lines: {
          create: {
            productId: product!.id,
            sku: product!.sku,
            name: product!.name,
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
        },
      },
    })

    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()

      for (const [path, heading] of [
        ['/admin/orders', 'Orders'],
        ['/admin/quotes', 'Quotes'],
        ['/admin/invoices', 'Invoices'],
        ['/admin/approvals', 'Approvals'],
      ] as const) {
        await page.goto(path, { waitUntil: 'networkidle' })
        await expect(page.getByRole('heading', { name: heading })).toBeVisible()
        expect(await axeBlocking(page), `axe ${path}`).toEqual([])
      }

      // Detalle de orden: acciones (transición lime / extend outline / cancel danger).
      await page.goto(`/admin/orders/${order.id}`, { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Actions' })).toBeVisible()
      expect(await axeBlocking(page), 'axe /admin/orders/[id]').toEqual([])

      // Detalle de cotización (la seed crea una) — form editable con botón lime.
      const quote = await prisma.quote.findFirst({ select: { id: true } })
      if (quote) {
        await page.goto(`/admin/quotes/${quote.id}`, { waitUntil: 'networkidle' })
        expect(await axeBlocking(page), 'axe /admin/quotes/[id]').toEqual([])
      }

      await ctx.close()
    } finally {
      await prisma.orderLine.deleteMany({ where: { orderId: order.id } })
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {})
      await prisma.organizationAddress.deleteMany({ where: { organizationId: org.id } })
      await prisma.organization.delete({ where: { id: org.id } }).catch(() => {})
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })
})

test.describe('admin customers (prod build) — Fase 3', () => {
  async function axeBlocking(page: import('@playwright/test').Page) {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  }

  test('list + detalle PENDING (approve/reject) + credit + prices pasan axe', async ({
    browser,
  }) => {
    const { user, token } = await seedUser(true)
    // Org PENDING → ejercita los botones approve (lime) / reject (danger) + upload.
    const org = await prisma.organization.create({
      data: {
        name: 'Pending Cust E2E',
        slug: `pending-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        verificationStatus: 'PENDING',
        verificationSubmittedAt: new Date(),
        country: 'US',
      },
    })
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()

      await page.goto('/admin/customers', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
      expect(await axeBlocking(page), 'axe /admin/customers').toEqual([])

      await page.goto(`/admin/customers/${org.id}`, { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'B2B verification' })).toBeVisible()
      expect(await axeBlocking(page), 'axe /admin/customers/[id]').toEqual([])

      await page.goto(`/admin/customers/${org.id}/credit`, { waitUntil: 'networkidle' })
      expect(await axeBlocking(page), 'axe /admin/customers/[id]/credit').toEqual([])

      await page.goto(`/admin/customers/${org.id}/prices`, { waitUntil: 'networkidle' })
      expect(await axeBlocking(page), 'axe /admin/customers/[id]/prices').toEqual([])

      await ctx.close()
    } finally {
      await prisma.organization.delete({ where: { id: org.id } }).catch(() => {})
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })
})
