import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = { id: 'placeholder', email: 'admin@t.com' }
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(async () => authUser),
  getCurrentUser: vi.fn(async () => authUser),
}))
vi.mock('@/lib/auth/actions', () => ({
  impersonationStart: vi.fn(),
  impersonationStop: vi.fn(),
  switchActiveOrg: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
// El enqueue de búsqueda no es relevante para este test; lo neutralizamos.
vi.mock('@/modules/search', () => ({
  enqueueIndex: vi.fn(async () => {}),
}))

async function makeAdmin(): Promise<string> {
  const admin = await prisma.user.create({
    data: { email: `adm-${Date.now()}@t.com`, isPlatformAdmin: true },
  })
  authUser.id = admin.id
  authUser.email = admin.email
  return admin.id
}

async function makeProduct(stock: number): Promise<string> {
  const cat = await prisma.category.create({
    data: { slug: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: 'C' },
  })
  const product = await prisma.product.create({
    data: {
      sku: `S-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      slug: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'P',
      basePrice: '10.00',
      stockQuantity: stock,
      categoryId: cat.id,
    },
  })
  return product.id
}

beforeEach(async () => {
  await cleanDb()
})

describe('updateProductStockAction', () => {
  it('actualiza el stock absoluto de un producto existente → redirect success', async () => {
    await makeAdmin()
    const productId = await makeProduct(5)
    const fd = new FormData()
    fd.set('id', productId)
    fd.set('stockQuantity', '42')

    const { updateProductStockAction } = await import('../_actions')
    await expect(updateProductStockAction(fd)).rejects.toThrow(
      /REDIRECT:.+toast=success&msg=admin\.toast\.stockUpdated/
    )

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stockQuantity).toBe(42)
  })

  it('aplica un delta relativo cuando se envía delta (clamp ≥ 0)', async () => {
    await makeAdmin()
    const productId = await makeProduct(10)
    const fd = new FormData()
    fd.set('id', productId)
    fd.set('delta', '-15')

    const { updateProductStockAction } = await import('../_actions')
    await expect(updateProductStockAction(fd)).rejects.toThrow(
      /REDIRECT:.+toast=success&msg=admin\.toast\.stockUpdated/
    )

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stockQuantity).toBe(0)
  })

  it('rechaza stock negativo → redirect error invalidStock, sin mutar', async () => {
    await makeAdmin()
    const productId = await makeProduct(7)
    const fd = new FormData()
    fd.set('id', productId)
    fd.set('stockQuantity', '-3')

    const { updateProductStockAction } = await import('../_actions')
    await expect(updateProductStockAction(fd)).rejects.toThrow(
      /REDIRECT:.+toast=error&msg=admin\.toast\.invalidStock/
    )

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stockQuantity).toBe(7)
  })

  it('rechaza stock NaN → redirect error invalidStock', async () => {
    await makeAdmin()
    const productId = await makeProduct(7)
    const fd = new FormData()
    fd.set('id', productId)
    fd.set('stockQuantity', 'abc')

    const { updateProductStockAction } = await import('../_actions')
    await expect(updateProductStockAction(fd)).rejects.toThrow(
      /REDIRECT:.+toast=error&msg=admin\.toast\.invalidStock/
    )

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stockQuantity).toBe(7)
  })

  it('non-admin no puede editar stock → Forbidden', async () => {
    const productId = await makeProduct(7)
    const buyer = await prisma.user.create({
      data: { email: `b-${Date.now()}@t.com`, isPlatformAdmin: false },
    })
    authUser.id = buyer.id
    authUser.email = buyer.email
    const fd = new FormData()
    fd.set('id', productId)
    fd.set('stockQuantity', '99')

    const { updateProductStockAction } = await import('../_actions')
    await expect(updateProductStockAction(fd)).rejects.toThrow(/Forbidden/)

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stockQuantity).toBe(7)
  })
})
