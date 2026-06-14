/**
 * E2E (catálogo rediseñado) — contra el BUILD DE PRODUCCIÓN.
 * Cubre el catálogo con datos+imágenes reales del seed Pi-Power (cierra el gap
 * de FU-011 que dejó invisible el 500), el toggle Cards/List persistente, el
 * filtro por tabs de categoría, el stepper → carrito, y un smoke de que el card
 * único nuevo (sello "0-cycle") aparece en /search (PDP-related usa el mismo card
 * pero depende de embeddings ausentes en local — cubierto por build + unit).
 *
 * Nota: el home-featured NO usa este card — ya fue rediseñado en PR #30 con sus
 * propias cards "Back to 100%"; por eso no se le aplica el ProductCard del
 * catálogo (lo degradaría). El smoke del card nuevo va donde sí se aplicó.
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
  const user = await prisma.user.create({ data: { email: `cat-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: {
      name: `CatOrg-${s}`,
      slug: `cat-org-${s}`,
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

test.describe('catálogo rediseñado (prod build)', () => {
  test('/catalog renderiza con datos e imágenes reales del seed (cierra FU-011)', async ({
    page,
  }) => {
    await page.goto('/catalog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /catalog/i })).toBeVisible()
    // Una batería real visible + su imagen local (si next/image rechazara el host
    // remoto, /catalog daría 500 y esto no cargaría — el caso que FU-011 ocultaba).
    await expect(page.getByText(/iPhone 13/i).first()).toBeVisible()
    await expect(page.locator('img[alt*="iPhone"]').first()).toBeVisible()
  })

  test('tabs de categoría filtran el listado', async ({ page }) => {
    await page.goto('/catalog', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: /^Battery Cell$/ }).click()
    await expect(page).toHaveURL(/category=battery-cell/)
    await expect(page.getByText(/iPhone 14/i).first()).toBeVisible()

    await page.getByRole('link', { name: /^Tag-on Flex$/ }).click()
    await expect(page).toHaveURL(/category=tag-on-flex/)
    // Tag-on = un producto por modelo: "Tag-on Flex — iPhone X" (el em-dash evita
    // matchear la tab "Tag-on Flex").
    await expect(page.getByText(/Tag-on Flex — iPhone/i).first()).toBeVisible()
  })

  test('toggle Cards/List persiste por usuario', async ({ browser }) => {
    const { sessionToken } = await seedVerifiedBuyer()
    const ctx = await buyerContext(browser, sessionToken)
    const page = await ctx.newPage()
    try {
      await page.goto('/catalog', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /^list$/i }).click()
      // revalidatePath('/catalog') → la vista densa (tabla) aparece.
      await expect(page.getByRole('table')).toBeVisible()
      // Persistencia real: tras reload sigue en LIST (preferredCatalogView en DB).
      await page.reload({ waitUntil: 'networkidle' })
      await expect(page.getByRole('table')).toBeVisible()
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('stepper: elegir cantidad N → Add → el carrito suma N', async ({ browser }) => {
    const { sessionToken } = await seedVerifiedBuyer()
    const ctx = await buyerContext(browser, sessionToken)
    const page = await ctx.newPage()
    try {
      await page.goto('/catalog', { waitUntil: 'networkidle' })
      // Filtra por SKU (único en el card): "iPhone 13 Pro Max" aparece en battery
      // cell + tag-on + plug&play; el SKU desambigua la celda en stock.
      const card = page.locator('article').filter({ hasText: 'PP-BC-13PM' })
      await card.getByRole('button', { name: /increase quantity/i }).click()
      await expect(card.getByRole('spinbutton')).toHaveValue('2')
      await card.getByRole('button', { name: /^add$/i }).click()
      await page.waitForURL(/\/catalog/)
      // El contador del header (autoritativo) refleja la cantidad elegida (2).
      // Se evita leer /cart por la race conocida de getOrCreateCart (FU-007).
      await expect(page.getByRole('link', { name: /2 items/i })).toBeVisible()
    } finally {
      await ctx.close()
      await prisma.session.deleteMany({ where: { sessionToken } })
    }
  })

  test('card único nuevo (sello 0-cycle) aparece en /search', async ({ page }) => {
    // /search usa SearchResults → ProductCard. (PDP-related usa el MISMO card,
    // pero su data depende de embeddings pgvector/Voyage, ausentes en local →
    // no e2e-smokeable acá; queda cubierto por build + el unit del card.)
    await page.goto('/search?q=iphone', { waitUntil: 'networkidle' })
    await expect(page.getByText(/0-cycle/i).first()).toBeVisible()
  })

  test('home sigue renderizando su sección featured tras el swap de seed', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    // El home ya está rediseñado (PR #30, no usa el card del catálogo). data-reveal
    // (GSAP) lo mantiene oculto hasta el scroll, así que se valida presencia en DOM.
    await expect(page.locator('#featured-title')).toBeAttached()
    await expect(page.locator('a[href^="/products/"]').first()).toBeAttached()
  })
})
