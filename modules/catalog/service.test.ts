import { prisma } from '@/lib/db/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { catalogService } from './service'

beforeEach(async () => {
  await prisma.cartItem.deleteMany()
  await prisma.orderLine.deleteMany()
  await prisma.customerPrice.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
})

describe('catalogService — categories', () => {
  it('creates category', async () => {
    const cat = await catalogService.createCategory({
      slug: 'cosmeticos',
      name: 'Cosméticos',
      sortOrder: 1,
    })
    expect(cat.id).toBeTruthy()
    expect(cat.slug).toBe('cosmeticos')
  })

  it('rejects duplicate slug', async () => {
    await catalogService.createCategory({ slug: 'limpieza', name: 'Limpieza' })
    await expect(
      catalogService.createCategory({ slug: 'limpieza', name: 'Otro' })
    ).rejects.toThrow()
  })

  it('lists active categories sorted', async () => {
    await catalogService.createCategory({ slug: 'a', name: 'A', sortOrder: 2 })
    await catalogService.createCategory({ slug: 'b', name: 'B', sortOrder: 1 })
    const cats = await catalogService.listCategories()
    expect(cats.map((c) => c.slug)).toEqual(['b', 'a'])
  })
})

describe('catalogService — products', () => {
  async function makeCategory() {
    return catalogService.createCategory({ slug: 'cat-1', name: 'Cat 1' })
  }

  it('creates product', async () => {
    const cat = await makeCategory()
    const p = await catalogService.createProduct({
      sku: 'SKU-001',
      slug: 'producto-1',
      name: 'Producto 1',
      basePrice: 10.5,
      stockQuantity: 100,
      categoryId: cat.id,
    })
    expect(p.id).toBeTruthy()
    expect(p.basePrice.toString()).toBe('10.5')
  })

  it('rejects negative price', async () => {
    const cat = await makeCategory()
    await expect(
      catalogService.createProduct({
        sku: 'SKU-X',
        slug: 'p-x',
        name: 'X',
        basePrice: -1,
        categoryId: cat.id,
      })
    ).rejects.toThrow()
  })

  it('lists products by category, active only by default', async () => {
    const cat = await makeCategory()
    await catalogService.createProduct({
      sku: 'A1',
      slug: 'a-1',
      name: 'A',
      basePrice: 1,
      categoryId: cat.id,
    })
    const inactive = await catalogService.createProduct({
      sku: 'B1',
      slug: 'b-1',
      name: 'B',
      basePrice: 1,
      categoryId: cat.id,
    })
    await catalogService.updateProduct({ id: inactive.id, isActive: false })

    const products = await catalogService.listProducts({ categoryId: cat.id })
    expect(products.map((p) => p.sku)).toEqual(['A1'])
  })

  it('finds product by slug includes category', async () => {
    const cat = await makeCategory()
    await catalogService.createProduct({
      sku: 'SKU-Z',
      slug: 'producto-z',
      name: 'Z',
      basePrice: 5,
      categoryId: cat.id,
    })
    const p = await catalogService.findProductBySlug('producto-z')
    expect(p?.category.slug).toBe('cat-1')
  })
})
