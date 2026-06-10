import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

// Auth.js v5 session cookie (HTTP dev = Playwright baseURL http://localhost:3000).
const SESSION_COOKIE = 'authjs.session-token'

const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

function uniqueEmail(tag: string): string {
  return `pw-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@t.com`
}

/**
 * Task 8 — Password auth E2E.
 *
 * Cubre los 3 ejes del spec password-login:
 *  1. Session contract (Spec §8 / Task 0 audit): la fila Session que mintea
 *     `createDbSession` (al hacer login con password) debe ser una sesión
 *     completa para `auth()` v5. Probado abriendo un contexto nuevo con la
 *     cookie y verificando que NO rebota a /sign-in.
 *  2. Flujos UX: wrong password, forgot-password toggle, sign-up happy path.
 *  3. Regresión de seguridad: signup con email existente NO pisa la fila,
 *     y change-password invalida las otras sesiones (current sobrevive).
 */
test.describe('password auth (login + signup + change)', () => {
  test('session contract: cookie minteada por passwordSignInAction sirve para auth()', async ({
    browser,
  }) => {
    const email = uniqueEmail('login')
    const password = 'Abcd1234'
    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: new Date(),
        hashedPassword: bcrypt.hashSync(password, 12),
      },
    })

    try {
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      await page.goto('/sign-in')

      // El form de password es el primero (input password con autocomplete=current-password).
      await page.locator('input[name="email"]').first().fill(email)
      await page
        .locator('input[name="password"][autocomplete="current-password"]')
        .first()
        .fill(password)
      // SignInForm hace router.push('/select-org') al recibir state.ok.
      await Promise.all([
        page.waitForURL(/\/select-org/, { timeout: 15_000 }),
        page.getByRole('button', { name: /entrar|sign in$/i }).click(),
      ])

      // Captura cookie minteada por createDbSession.
      const cookies = await ctx.cookies()
      const session = cookies.find((c) => c.name === SESSION_COOKIE)
      expect(session?.value, 'authjs.session-token debe estar seteada').toBeTruthy()

      // Verificá que existe la fila Session en DB (createDbSession).
      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: session!.value },
      })
      expect(dbSession?.userId).toBe(user.id)

      // Nuevo contexto, inyectamos solo esa cookie. Si /account redirige a
      // /sign-in, el contrato §8 está roto.
      const ctx2 = await browser.newContext()
      await ctx2.addCookies([
        {
          name: SESSION_COOKIE,
          value: session!.value,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
          expires: Math.floor((session!.expires ?? Date.now() / 1000 + 86400) as number),
        },
      ])
      const page2 = await ctx2.newPage()
      await page2.goto('/account')
      await page2.waitForLoadState('domcontentloaded')
      // No-org user is redirected by requireVerifiedCustomer a /onboarding.
      // Lo importante: NUNCA a /sign-in (eso sería anonymous).
      expect(
        page2.url(),
        `auth() no resolvió la cookie de createDbSession (url=${page2.url()})`
      ).not.toMatch(/\/sign-in/)
      await ctx.close()
      await ctx2.close()
    } finally {
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })

  test('flujos: wrong password, forgot-password toggle, signup happy path', async ({
    browser,
  }) => {
    // ── (a) Wrong password ───────────────────────────────────────────────
    const emailLogin = uniqueEmail('wrong')
    const userLogin = await prisma.user.create({
      data: {
        email: emailLogin,
        emailVerified: new Date(),
        hashedPassword: bcrypt.hashSync('Abcd1234', 12),
      },
    })

    try {
      const ctxA = await browser.newContext()
      const pageA = await ctxA.newPage()
      await pageA.goto('/sign-in')
      await pageA.locator('input[name="email"]').first().fill(emailLogin)
      await pageA
        .locator('input[name="password"][autocomplete="current-password"]')
        .first()
        .fill('WRONGpass1')
      await pageA.getByRole('button', { name: /entrar|sign in$/i }).click()
      // Esperamos a que el server action termine y la UI reaccione.
      // No debe navegar fuera de /sign-in.
      await pageA.waitForTimeout(1500)
      expect(pageA.url()).toMatch(/\/sign-in/)
      const sessionsAfterFail = await prisma.session.count({
        where: { userId: userLogin.id },
      })
      expect(sessionsAfterFail).toBe(0)

      // ── (b) Forgot-password toggle muestra el form de magic link ─────────
      // Texto i18n es-419: "¿Olvidaste tu contraseña?"
      const forgotBtn = pageA.getByRole('button', {
        name: /olvidaste tu contraseña|forgot your password/i,
      })
      await expect(forgotBtn).toBeVisible()
      await forgotBtn.click()
      // El bloque del magic-link aparece: nuevo input email + botón "Enviar link mágico".
      const emailInputs = pageA.locator('input[name="email"]')
      await expect(emailInputs).toHaveCount(2)
      await expect(
        pageA.getByRole('button', { name: /enviar link mágico|send magic link/i })
      ).toBeVisible()
      await ctxA.close()
    } finally {
      await prisma.session.deleteMany({ where: { userId: userLogin.id } })
      await prisma.user.delete({ where: { id: userLogin.id } }).catch(() => {})
    }

    // ── (c) Sign-up happy path ──────────────────────────────────────────
    const emailSignup = uniqueEmail('newsignup')

    try {
      const ctxB = await browser.newContext()
      const pageB = await ctxB.newPage()
      await pageB.goto('/sign-up')
      await pageB.locator('input[name="email"]').first().fill(emailSignup)
      await pageB.locator('input[name="password"]').first().fill('Abcd1234')
      // Confirm es el segundo input type=password (no tiene name).
      await pageB.locator('input[type="password"]').nth(1).fill('Abcd1234')
      await pageB.getByRole('button', { name: /registrarme|sign up|create account/i }).click()

      // El user se crea en DB ANTES del signIn('resend'). Si Resend tira por
      // API key inválida la action throw — pero el row existe igual.
      // Lo que importa de cara al spec: hashedPassword!=null + emailVerified=null.
      await pageB.waitForTimeout(2500)
      const created = await prisma.user.findUnique({ where: { email: emailSignup } })
      expect(created, 'sign-up debe crear el usuario en DB').not.toBeNull()
      expect(created?.hashedPassword).not.toBeNull()
      expect(created?.emailVerified).toBeNull()

      // Best-effort: si Resend pegó OK, el form renderiza el "check email"
      // success state con confirmHint. Si Resend rompió, lo permitimos —
      // pero NO toleramos que el form siga visible sin haber creado al user
      // (ya lo verificamos arriba).
      const successText = pageB.getByText(/revisá tu email|check your email|reenviar/i)
      const visible = await successText.first().isVisible().catch(() => false)
      // Soft check: registramos pero no fallamos si el provider Resend rompió.
      if (!visible) {
        // eslint-disable-next-line no-console
        console.log('[password-auth.spec] sign-up success screen no visible (Resend dev key?)')
      }
      await ctxB.close()
    } finally {
      await prisma.user.deleteMany({ where: { email: emailSignup } })
    }
  })

  test('seguridad: signup con email existente no pisa la row + change-password invalida otras sesiones', async ({
    browser,
  }) => {
    // ── (a) Signup con email YA registrado: no pisa hashedPassword ───────
    const takenEmail = uniqueEmail('taken')
    const seeded = await prisma.user.create({
      data: {
        email: takenEmail,
        // Magic-link-only user → hashedPassword null.
        emailVerified: new Date(),
        hashedPassword: null,
      },
    })

    try {
      const ctxA = await browser.newContext()
      const pageA = await ctxA.newPage()
      await pageA.goto('/sign-up')
      await pageA.locator('input[name="email"]').first().fill(takenEmail)
      await pageA.locator('input[name="password"]').first().fill('Abcd1234')
      await pageA.locator('input[type="password"]').nth(1).fill('Abcd1234')
      await pageA.getByRole('button', { name: /registrarme|sign up|create account/i }).click()
      await pageA.waitForTimeout(2000)

      // El user debe seguir siendo UNO, sin password (no pisado).
      const count = await prisma.user.count({ where: { email: takenEmail } })
      expect(count).toBe(1)
      const fresh = await prisma.user.findUnique({ where: { email: takenEmail } })
      expect(fresh?.id).toBe(seeded.id)
      expect(fresh?.hashedPassword).toBeNull()
      await ctxA.close()
    } finally {
      await prisma.user.deleteMany({ where: { email: takenEmail } })
    }

    // ── (b) Change-password invalida la OTRA sesión, conserva la actual ──
    const emailCp = uniqueEmail('changepw')
    const userCp = await prisma.user.create({
      data: {
        email: emailCp,
        emailVerified: new Date(),
        hashedPassword: bcrypt.hashSync('Old1234A', 12),
      },
    })

    const tokenCurrent = randomUUID()
    const tokenOther = randomUUID()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.session.createMany({
      data: [
        { sessionToken: tokenCurrent, userId: userCp.id, expires },
        { sessionToken: tokenOther, userId: userCp.id, expires },
      ],
    })

    try {
      const ctxB = await browser.newContext()
      // Cookie = sesión "current" → es la que sobrevive.
      await ctxB.addCookies([
        {
          name: SESSION_COOKIE,
          value: tokenCurrent,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
          expires: Math.floor(expires.getTime() / 1000),
        },
      ])
      const pageB = await ctxB.newPage()
      await pageB.goto('/account')
      // requireVerifiedCustomer rebota a /onboarding (no-org). Para
      // ejercer el form, navegamos directo o seguimos el redirect — el
      // form de cambio de contraseña vive en /account, que sólo renderiza
      // si el usuario es verified. Necesitamos darle una org verificada.
      // Lo hacemos antes de continuar.
      const org = await prisma.organization.create({
        data: {
          name: 'Acme CP',
          slug: `acme-cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      })
      await prisma.organizationMember.create({
        data: { organizationId: org.id, userId: userCp.id, role: 'OWNER' },
      })
      // Bind activeOrgId a la session actual para que requireVerifiedCustomer
      // devuelva verified directamente.
      await prisma.session.update({
        where: { sessionToken: tokenCurrent },
        data: { activeOrgId: org.id },
      })

      await pageB.goto('/account')
      await expect(pageB.locator('input[name="currentPassword"]')).toBeVisible({ timeout: 10_000 })

      await pageB.locator('input[name="currentPassword"]').fill('Old1234A')
      await pageB.locator('input[name="newPassword"]').fill('New1234A')
      // El confirm input no tiene name; es el tercer input type=password.
      await pageB.locator('input[type="password"]').nth(2).fill('New1234A')

      // submit y esperá una respuesta del action (toast / state update).
      await pageB.getByRole('button', { name: /actualizar contraseña|update password/i }).click()
      // Le damos tiempo al action a deletear las otras sesiones.
      await pageB.waitForTimeout(2500)

      const remaining = await prisma.session.findMany({
        where: { userId: userCp.id },
        select: { sessionToken: true },
      })
      const tokens = remaining.map((s) => s.sessionToken).sort()
      expect(tokens).toEqual([tokenCurrent])
      // Y la password efectivamente cambió.
      const after = await prisma.user.findUnique({ where: { id: userCp.id } })
      expect(after?.passwordUpdatedAt).not.toBeNull()
      expect(bcrypt.compareSync('New1234A', after!.hashedPassword!)).toBe(true)
      await ctxB.close()

      await prisma.organizationMember.deleteMany({ where: { userId: userCp.id } })
      await prisma.organization.delete({ where: { id: org.id } }).catch(() => {})
    } finally {
      await prisma.session.deleteMany({ where: { userId: userCp.id } })
      await prisma.user.delete({ where: { id: userCp.id } }).catch(() => {})
    }
  })
})
