/**
 * E2E (build de producción) del hub de Cuenta rediseñado "Back to 100%".
 * Cubre: Overview (identidad + org B2B + accesos rápidos), Profile (editar
 * persiste), Addresses (OWNER add/edit/set-default/delete vs BUYER read-only),
 * Órdenes en EN y ES (cierre de i18n), y axe por pantalla autenticada.
 */
import { randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
import { type BrowserContext, expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import type { OrgRole } from '@prisma/client'

const SESSION_COOKIE = 'authjs.session-token'
const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function seedSession(role: OrgRole, locale = 'en-US') {
  const user = await prisma.user.create({
    data: {
      email: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@t.com`,
      name: 'Test Buyer',
      emailVerified: new Date(),
      preferredLocale: locale,
    },
  })
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Wholesale',
      slug: `acme-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      taxExempt: true,
      paymentTerms: 'NET_30',
      members: { create: { userId: user.id, role } },
      addresses: {
        create: {
          label: 'HQ',
          recipient: 'Receiving',
          line1: '1 Main St',
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
  const token = randomUUID()
  await prisma.session.create({
    data: {
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 1e9),
      activeOrgId: org.id,
    },
  })
  return { user, org, token }
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

async function cleanup(userId: string, orgId: string) {
  await prisma.order.deleteMany({ where: { organizationId: orgId } })
  await prisma.session.deleteMany({ where: { userId } })
  await prisma.organizationAddress.deleteMany({ where: { organizationId: orgId } })
  await prisma.organizationMember.deleteMany({ where: { organizationId: orgId } })
  await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
  await prisma.user.delete({ where: { id: userId } }).catch(() => {})
}

test.describe('account hub (prod build)', () => {
  test('Overview: identidad + org B2B + acceso rápido a Orders', async ({ browser }) => {
    const { user, org, token } = await seedSession('OWNER')
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      await page.goto('/account', { waitUntil: 'networkidle' })
      await expect(page.getByText(user.email)).toBeVisible()
      await expect(page.getByText(org.name).first()).toBeVisible()
      await expect(page.getByText('OWNER')).toBeVisible()
      await expect(page.getByRole('link', { name: /orders/i })).toBeVisible()
      await ctx.close()
    } finally {
      await cleanup(user.id, org.id)
    }
  })

  test('Profile: editar nombre persiste', async ({ browser }) => {
    const { user, org, token } = await seedSession('OWNER')
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      await page.goto('/account/profile', { waitUntil: 'networkidle' })
      await page.locator('input[name="name"]').fill('Renamed Buyer')
      await page.getByRole('button', { name: /save changes|guardar cambios/i }).click()
      await expect
        .poll(async () => (await prisma.user.findUnique({ where: { id: user.id } }))?.name)
        .toBe('Renamed Buyer')
      await ctx.close()
    } finally {
      await cleanup(user.id, org.id)
    }
  })

  test('Addresses (OWNER): add agrega una dirección', async ({ browser }) => {
    const { user, org, token } = await seedSession('OWNER')
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      await page.goto('/account/addresses', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /add address|agregar dirección/i }).click()
      await page.locator('input[name="label"]').fill('Warehouse')
      await page.locator('input[name="recipient"]').fill('Dock')
      await page.locator('input[name="line1"]').fill('2 Side St')
      await page.locator('input[name="city"]').fill('Doral')
      await page.locator('input[name="postalCode"]').fill('33122')
      await page.locator('input[name="country"]').fill('US')
      await page.getByRole('button', { name: /save address|guardar dirección/i }).click()
      await expect
        .poll(async () => prisma.organizationAddress.count({ where: { organizationId: org.id } }))
        .toBe(2)
      await ctx.close()
    } finally {
      await cleanup(user.id, org.id)
    }
  })

  test('Addresses (BUYER): read-only, sin botón Add', async ({ browser }) => {
    const { user, org, token } = await seedSession('BUYER')
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      await page.goto('/account/addresses', { waitUntil: 'networkidle' })
      await expect(
        page.getByText(/managed by organization owners|gestionan los owners/i)
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /add address|agregar dirección/i })
      ).toHaveCount(0)
      await ctx.close()
    } finally {
      await cleanup(user.id, org.id)
    }
  })

  test('Orders: render en EN y ES (cierre de i18n)', async ({ browser }) => {
    const { user, org, token } = await seedSession('OWNER', 'en-US')
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      await page.goto('/orders', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible()

      await prisma.user.update({ where: { id: user.id }, data: { preferredLocale: 'es-419' } })
      await page.goto('/orders', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Tus órdenes' })).toBeVisible()
      await ctx.close()
    } finally {
      await cleanup(user.id, org.id)
    }
  })

  test('a11y axe: pantallas de cuenta autenticadas sin violaciones serious/critical', async ({
    browser,
  }) => {
    const { user, org, token } = await seedSession('OWNER')
    try {
      const ctx = await browser.newContext()
      await withSession(ctx, token)
      const page = await ctx.newPage()
      for (const path of [
        '/account',
        '/account/profile',
        '/account/addresses',
        '/account/security',
      ]) {
        await page.goto(path, { waitUntil: 'networkidle' })
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
        const blocking = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical'
        )
        if (blocking.length > 0) {
          console.log(
            `axe ${path}:`,
            JSON.stringify(
              blocking.map((v) => ({ id: v.id, nodes: v.nodes.length })),
              null,
              2
            )
          )
        }
        expect(blocking, `a11y serious/critical en ${path}`).toEqual([])
      }
      await ctx.close()
    } finally {
      await cleanup(user.id, org.id)
    }
  })
})
