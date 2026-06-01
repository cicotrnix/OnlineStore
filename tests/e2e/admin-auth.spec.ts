import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

// Cookie name Auth.js v5 en HTTP (Playwright dev server = http://localhost:3000)
const SESSION_COOKIE = 'authjs.session-token'

const prisma = new PrismaClient()

test.afterAll(async () => {
  await prisma.$disconnect()
})

test.describe('/admin auth gate (database sessions)', () => {
  test('platform admin con sesión válida NO es redirigido a /sign-in', async ({ browser }) => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } })
    if (!admin) throw new Error('Seed missing admin@example.com — run pnpm db:seed')

    const sessionToken = randomUUID()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { sessionToken, userId: admin.id, expires },
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
      const res = await page.goto('/admin')
      expect(res?.status()).toBe(200)
      await expect(page).toHaveURL(/\/admin$/)
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
      await ctx.close()
    } finally {
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('anónimo sigue siendo redirigido a /sign-in desde /admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('user logueado sin isPlatformAdmin es redirigido a /', async ({ browser }) => {
    const user = await prisma.user.findFirst({
      where: { isPlatformAdmin: false },
    })
    if (!user) throw new Error('Seed missing non-admin user')

    const sessionToken = randomUUID()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { sessionToken, userId: user.id, expires },
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
      await page.goto('/admin')
      await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/)
      await ctx.close()
    } finally {
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('/sign-in redirige a / si ya hay sesión', async ({ browser }) => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } })
    if (!admin) throw new Error('Seed missing admin@example.com')

    const sessionToken = randomUUID()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { sessionToken, userId: admin.id, expires },
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
      await page.goto('/sign-in')
      await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/)
      await ctx.close()
    } finally {
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })
})
