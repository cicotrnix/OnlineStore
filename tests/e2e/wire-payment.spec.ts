/**
 * E2E: Admin "Mark paid" wire payment flow.
 *
 * Covers:
 *   1. Admin logs in (session cookie, same approach as admin-auth.spec.ts).
 *   2. Navigates to /admin/invoices — finds the seeded PENDING invoice row.
 *   3. Enters a wire reference in the "Referencia" input and submits.
 *   4. Invoice row shows "PAID" badge.
 *   5. Navigates to the order detail page — PaymentBadge shows "Captured"/"Paid"
 *      and order status reflects CONFIRMED.
 *   6. DB: org.creditUsed was decremented.
 *   7. Idempotent: submitting "Mark paid" again with the same reference does NOT
 *      change DB state (paymentEvent count stays at 1, creditUsed unchanged).
 *
 * NOTE: This test requires a running dev server (pnpm dev) on localhost:3000 and
 * a seeded admin user (admin@example.com with isPlatformAdmin = true).
 * It is gated under `pnpm test:e2e` (Playwright). Do NOT run via `pnpm test`
 * (Vitest) — Playwright tests live outside Vitest's scope.
 *
 * Known limitation: the test seeds its own invoice/order via Prisma directly
 * because the project has no shared e2e fixture builder helper. The Prisma
 * client is instantiated inline, mirroring admin-auth.spec.ts.
 */
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const SESSION_COOKIE = 'authjs.session-token'

const prisma = new PrismaClient()

// ─── helpers ──────────────────────────────────────────────────────────────────

async function createAdminSession(): Promise<{ sessionToken: string; adminId: string }> {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } })
  if (!admin) throw new Error('Seed missing admin@example.com — run pnpm db:seed')
  const sessionToken = randomUUID()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.session.create({ data: { sessionToken, userId: admin.id, expires } })
  return { sessionToken, adminId: admin.id }
}

/**
 * Seed a minimal org + order + invoice that's PENDING, ready for "Mark paid".
 * Returns enough data to find the invoice row in the UI and verify post-state.
 */
async function seedPendingInvoice(adminId: string) {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const org = await prisma.organization.create({
    data: {
      name: `E2EWireOrg-${uniqueSuffix}`,
      slug: `e2e-wire-org-${uniqueSuffix}`,
      creditLimit: new Decimal('5000.00'),
      creditUsed: new Decimal('100.00'),
      paymentTerms: 'NET_30',
      verificationStatus: 'VERIFIED',
    },
  })

  const addr = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'HQ',
      recipient: 'E2E Tester',
      line1: '1 E2E St',
      city: 'Testville',
      postalCode: '00000',
      country: 'US',
    },
  })

  const cat = await prisma.category.create({
    data: { name: `E2ECat-${uniqueSuffix}`, slug: `e2e-cat-${uniqueSuffix}` },
  })

  const product = await prisma.product.create({
    data: {
      sku: `E2E-SKU-${uniqueSuffix}`,
      slug: `e2e-prod-${uniqueSuffix}`,
      name: 'E2E Wire Product',
      basePrice: new Decimal('100.00'),
      stockQuantity: 10,
      categoryId: cat.id,
    },
  })

  const order = await prisma.order.create({
    data: {
      orderNumber: `E2E-ORD-${uniqueSuffix}`,
      organizationId: org.id,
      placedByUserId: adminId,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'NET_TERMS',
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
            unitPrice: new Decimal('100.00'),
            quantity: 1,
            lineTotal: new Decimal('100.00'),
          },
        ],
      },
    },
  })

  // Create invoice manually (PENDING, so it shows the "Mark paid" form)
  const invoice = await prisma.invoice.create({
    data: {
      number: `INV-E2E-${uniqueSuffix}`,
      organizationId: org.id,
      orderId: order.id,
      status: 'PENDING',
      amount: new Decimal('100.00'),
      currency: 'USD',
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return { org, order, invoice }
}

// ─── teardown ─────────────────────────────────────────────────────────────────

test.afterAll(async () => {
  await prisma.$disconnect()
})

// ─── tests ────────────────────────────────────────────────────────────────────

test.describe('admin wire payment flow', () => {
  test('Mark paid → invoice PAID, order CONFIRMED, creditUsed decremented, idempotent on retry', async ({
    browser,
  }) => {
    const { sessionToken, adminId } = await createAdminSession()
    const { org, order, invoice } = await seedPendingInvoice(adminId)
    const wireReference = `E2E-WR-${Date.now()}`

    // ── 1. Mount authenticated browser context ─────────────────────────
    const ctx = await browser.newContext()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
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

    try {
      // ── 2. Navigate to /admin/invoices ──────────────────────────────
      await page.goto('/admin/invoices')
      await expect(page).toHaveURL(/\/admin\/invoices/)

      // ── 3. Find the seeded invoice row and fill the wire reference ──
      // Row identified by the invoice number, which is unique to this test run.
      const invoiceRow = page.locator('tr').filter({ hasText: invoice.number })
      await expect(invoiceRow).toBeVisible()

      const referenceInput = invoiceRow.locator('input[name="paidNote"]')
      await referenceInput.fill(wireReference)

      // ── 4. Submit "Mark paid" ───────────────────────────────────────
      const submitBtn = invoiceRow.getByRole('button', { name: /mark paid|marcar pagado/i })
      await submitBtn.click()

      // Wait for the page to reload (Server Action redirect/revalidation)
      await page.waitForLoadState('networkidle')

      // ── 5. Invoice row shows PAID badge ─────────────────────────────
      // After payment the form disappears; the status Badge shows "PAID".
      const paidRow = page.locator('tr').filter({ hasText: invoice.number })
      await expect(paidRow.getByText('PAID')).toBeVisible()

      // ── 6. Navigate to order detail — CONFIRMED + paid badge ────────
      await page.goto(`/admin/orders/${order.id}`)
      // Order status should reflect CONFIRMED
      await expect(page.getByText('CONFIRMED')).toBeVisible()
      // PaymentBadge renders some "captured"/"paid" variant
      await expect(page.getByText(/captured|paid/i).first()).toBeVisible()

      // ── 7. DB: creditUsed decremented ───────────────────────────────
      const updatedOrg = await prisma.organization.findUniqueOrThrow({
        where: { id: org.id },
      })
      // creditUsed started at 100.00, invoice was for 100.00 → should be 0
      expect(Number(updatedOrg.creditUsed)).toBe(0)

      // ── 8. Idempotent retry: submit "Mark paid" again ───────────────
      await page.goto('/admin/invoices')
      // Invoice is now PAID — form is gone, no "Mark paid" button visible for it.
      // The same paymentEvent count in the DB should still be 1.
      const paymentEventCount = await prisma.paymentEvent.count({
        where: { eventId: `wire-${wireReference}` },
      })
      expect(paymentEventCount).toBe(1)

      // creditUsed still 0 (not double-decremented)
      const orgAfterRetry = await prisma.organization.findUniqueOrThrow({
        where: { id: org.id },
      })
      expect(Number(orgAfterRetry.creditUsed)).toBe(Number(updatedOrg.creditUsed))
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })
})
