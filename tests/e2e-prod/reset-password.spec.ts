/**
 * E2E (build de producción) del flujo de reset de contraseña — rediseño auth
 * 2026-06-15. Cubre el único pedazo con lógica nueva:
 *  1. Happy path: token válido seedeado → nueva contraseña → auto sign-in +
 *     token consumido (usedAt) + password actualizada en DB.
 *  2. Token ya usado → la pantalla muestra el estado "link inválido".
 *  3. axe sobre el FORM real de reset (no solo el estado inválido del a11y spec).
 *
 * El token CRUDO se inserta solo en memoria del test; en DB va el hash SHA-256
 * (mismo contrato que requestPasswordResetAction).
 */
import { createHash, randomBytes } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const SESSION_COOKIE = 'authjs.session-token'
const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

function uniqueEmail(tag: string): string {
  return `reset-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@t.com`
}

function makeRawToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex')
  return { raw, hash: createHash('sha256').update(raw).digest('hex') }
}

test.describe('reset de contraseña (build prod)', () => {
  test('happy path: token válido → nueva contraseña → auto sign-in + token consumido', async ({
    browser,
  }) => {
    const email = uniqueEmail('ok')
    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: new Date(),
        hashedPassword: bcrypt.hashSync('Old1234A', 12),
      },
    })
    const { raw, hash } = makeRawToken()
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    try {
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      await page.goto(`/reset-password/${raw}`, { waitUntil: 'networkidle' })

      // El form real debe renderizar (no el estado inválido).
      await expect(page.locator('input[name="newPassword"]')).toBeVisible()

      // axe sobre el FORM de reset.
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const blocking = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      )
      expect(blocking, 'violaciones a11y serious/critical en el form de reset').toEqual([])

      await page.locator('input[name="newPassword"]').fill('Brandnew1')
      await page.locator('input[name="confirmPassword"]').fill('Brandnew1')
      await Promise.all([
        page.waitForURL(/\/select-org|\/onboarding/, { timeout: 15_000 }),
        page.getByRole('button', { name: /restablecer contraseña|reset password/i }).click(),
      ])

      // Auto sign-in: cookie de sesión seteada + fila Session en DB.
      const cookies = await ctx.cookies()
      const session = cookies.find((c) => c.name === SESSION_COOKIE)
      expect(session?.value, 'reset debe auto-iniciar sesión').toBeTruthy()
      const dbSessions = await prisma.session.findMany({ where: { userId: user.id } })
      expect(dbSessions).toHaveLength(1)

      // Password efectivamente cambiada + token consumido.
      const fresh = await prisma.user.findUnique({ where: { id: user.id } })
      expect(bcrypt.compareSync('Brandnew1', fresh!.hashedPassword!)).toBe(true)
      expect(fresh?.passwordUpdatedAt).not.toBeNull()
      const tok = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } })
      expect(tok?.usedAt).not.toBeNull()
      await ctx.close()
    } finally {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })

  test('token ya usado → pantalla de link inválido', async ({ browser }) => {
    const email = uniqueEmail('used')
    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: new Date(),
        hashedPassword: bcrypt.hashSync('Old1234A', 12),
      },
    })
    const { raw, hash } = makeRawToken()
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: new Date(),
      },
    })

    try {
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      await page.goto(`/reset-password/${raw}`, { waitUntil: 'networkidle' })

      // No hay form; hay estado inválido + CTA para pedir uno nuevo.
      await expect(page.locator('input[name="newPassword"]')).toHaveCount(0)
      await expect(
        page.getByRole('link', { name: /pedir un link nuevo|request a new link/i })
      ).toBeVisible()
      await ctx.close()
    } finally {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })
})
