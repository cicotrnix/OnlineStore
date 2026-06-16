import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import { AddressInUseError } from '../errors'
import { customersService } from '../service'

beforeEach(async () => {
  await cleanDb()
})

async function setup() {
  const user = await prisma.user.create({
    data: { email: `addr-${Date.now()}-${Math.random()}@t.com` },
  })
  const org = await customersService.createOrganizationWithOwner({
    userId: user.id,
    name: 'Acme Wholesale',
    country: 'US',
    address: { recipient: 'Receiving', line1: '1 Main', city: 'Miami', postalCode: '33101' },
  })
  return { user, org }
}

const NEW_ADDR = {
  label: 'Warehouse',
  recipient: 'Dock',
  line1: '2 Side',
  city: 'Doral',
  postalCode: '33122',
  country: 'US',
}

describe('address CRUD (net-new)', () => {
  it('updateAddress edits fields', async () => {
    const { org } = await setup()
    const addr = (await customersService.listAddresses(org.id))[0]
    await customersService.updateAddress({
      id: addr!.id,
      label: 'HQ',
      recipient: 'New Recipient',
      line1: 'New Line',
      city: 'New York',
      postalCode: '10001',
      country: 'US',
    })
    const fresh = await customersService.findAddressById(addr!.id)
    expect(fresh?.label).toBe('HQ')
    expect(fresh?.city).toBe('New York')
  })

  it('setDefaultBilling enforces uniqueness (unmarks previous)', async () => {
    const { org } = await setup()
    const a2 = await customersService.createAddress({ organizationId: org.id, ...NEW_ADDR })
    await customersService.setDefaultBilling(org.id, a2.id)
    const billings = (await customersService.listAddresses(org.id)).filter(
      (a) => a.isDefaultBilling
    )
    expect(billings).toHaveLength(1)
    expect(billings[0]?.id).toBe(a2.id)
  })

  it('setDefaultShipping enforces uniqueness (unmarks previous)', async () => {
    const { org } = await setup()
    const a2 = await customersService.createAddress({ organizationId: org.id, ...NEW_ADDR })
    await customersService.setDefaultShipping(org.id, a2.id)
    const shipping = (await customersService.listAddresses(org.id)).filter(
      (a) => a.isDefaultShipping
    )
    expect(shipping).toHaveLength(1)
    expect(shipping[0]?.id).toBe(a2.id)
  })

  it('setDefault rejects an address from another org', async () => {
    const { org } = await setup()
    const other = await setup()
    const otherAddr = (await customersService.listAddresses(other.org.id))[0]
    await expect(customersService.setDefaultBilling(org.id, otherAddr!.id)).rejects.toThrow()
  })

  it('deleteAddress removes when not used by any order', async () => {
    const { org } = await setup()
    const a2 = await customersService.createAddress({ organizationId: org.id, ...NEW_ADDR })
    await customersService.deleteAddress(org.id, a2.id)
    expect(await customersService.findAddressById(a2.id)).toBeNull()
  })

  it('deleteAddress blocks (AddressInUseError) when an order references it', async () => {
    const { user, org } = await setup()
    const addr = (await customersService.listAddresses(org.id))[0]
    await prisma.order.create({
      data: {
        orderNumber: `O-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organizationId: org.id,
        placedByUserId: user.id,
        billingAddressId: addr!.id,
        shippingAddressId: addr!.id,
        subtotal: 0,
        total: 0,
        currency: 'USD',
      },
    })
    await expect(customersService.deleteAddress(org.id, addr!.id)).rejects.toBeInstanceOf(
      AddressInUseError
    )
    expect(await customersService.findAddressById(addr!.id)).not.toBeNull()
  })

  it('getMemberRole returns the role, or null for non-members', async () => {
    const { user, org } = await setup()
    expect(await customersService.getMemberRole(org.id, user.id)).toBe('OWNER')
    const stranger = await prisma.user.create({ data: { email: `s-${Date.now()}@t.com` } })
    expect(await customersService.getMemberRole(org.id, stranger.id)).toBeNull()
  })
})
