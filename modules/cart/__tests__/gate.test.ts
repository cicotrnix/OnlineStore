import { prisma } from '@/lib/db/client'
import { cartService } from '@/modules/cart'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

async function setup(opts: { orgStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' }) {
  const user = await prisma.user.create({ data: { email: `c-${Date.now()}@t.com` } })
  const org = await prisma.organization.create({
    data: {
      name: 'O',
      slug: `o-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      verificationStatus: opts.orgStatus,
    },
  })
  const cat = await prisma.category.create({
    data: { slug: `c-${Date.now()}-${Math.random()}`, name: 'C' },
  })
  const product = await prisma.product.create({
    data: {
      sku: `S-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slug: `s-${Date.now()}-${Math.random()}`,
      name: 'P',
      basePrice: new Decimal('10.00'),
      stockQuantity: 5,
      categoryId: cat.id,
    },
  })
  return { user, org, product }
}

beforeEach(async () => {
  await cleanDb()
})

describe('cart gate (Onboarding B2B 2026-06-02)', () => {
  it('addItem en org PENDING → throw ORG_NOT_VERIFIED', async () => {
    const { user, org, product } = await setup({ orgStatus: 'PENDING' })
    await expect(
      cartService.addItem({
        userId: user.id,
        productId: product.id,
        quantity: 1,
        orgId: org.id,
      })
    ).rejects.toThrow('ORG_NOT_VERIFIED')
  })

  it('addItem en org REJECTED → throw ORG_NOT_VERIFIED', async () => {
    const { user, org, product } = await setup({ orgStatus: 'REJECTED' })
    await expect(
      cartService.addItem({
        userId: user.id,
        productId: product.id,
        quantity: 1,
        orgId: org.id,
      })
    ).rejects.toThrow('ORG_NOT_VERIFIED')
  })

  it('addItem en org VERIFIED → ok', async () => {
    const { user, org, product } = await setup({ orgStatus: 'VERIFIED' })
    const cart = await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 2,
      orgId: org.id,
    })
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]?.quantity).toBe(2)
  })
})
