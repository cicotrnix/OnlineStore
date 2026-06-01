import { prisma } from '@/lib/db/client'
import { cartService } from '@/modules/cart'
import { catalogService } from '@/modules/catalog'
import { checkoutService } from '@/modules/checkout'
import { customersService } from '@/modules/customers'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'

beforeEach(async () => {
  await cleanDb()
})

async function setupWithVerified(verified: boolean) {
  const user = await prisma.user.create({ data: { email: `g-${Date.now()}@t.com` } })
  const org = await customersService.createOrganization({
    name: 'Gate',
    slug: `g-${Date.now()}`,
    ownerUserId: user.id,
  })
  if (verified) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { verificationStatus: 'VERIFIED', verifiedAt: new Date(), taxExempt: true },
    })
  }
  const cat = await catalogService.createCategory({ slug: `g-${Date.now()}`, name: 'C' })
  const product = await catalogService.createProduct({
    sku: `GP-${Date.now()}`,
    slug: `gp-${Date.now()}`,
    name: 'GP',
    basePrice: 10,
    stockQuantity: 5,
    categoryId: cat.id,
  })
  const addr = await customersService.createAddress({
    organizationId: org.id,
    label: 'Main',
    recipient: 'R',
    line1: '1 St',
    city: 'X',
    postalCode: '0',
    country: 'US',
    isDefaultBilling: true,
    isDefaultShipping: true,
  })
  await cartService.addItem({
    userId: user.id,
    orgId: org.id,
    productId: product.id,
    quantity: 1,
  })
  return { user, org, addr }
}

describe('checkout verification gate (Fase 5)', () => {
  it('rechaza confirm cuando la org no está VERIFIED', async () => {
    const { user, org, addr } = await setupWithVerified(false)
    await expect(
      checkoutService.confirm({
        userId: user.id,
        orgId: org.id,
        billingAddressId: addr.id,
        shippingAddressId: addr.id,
      })
    ).rejects.toThrow('ORG_NOT_VERIFIED')
  })

  it('confirma cuando la org está VERIFIED', async () => {
    const { user, org, addr } = await setupWithVerified(true)
    const order = await checkoutService.confirm({
      userId: user.id,
      orgId: org.id,
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
    })
    expect(order.id).toBeTruthy()
  })
})
