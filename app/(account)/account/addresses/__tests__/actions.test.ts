import { prisma } from '@/lib/db/client'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { customersService } from '@/modules/customers'
import { cleanDb } from '@/tests/helpers/cleanDb'
import type { OrgRole } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.fn()
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeEach(async () => {
  await cleanDb()
})

async function seedVerified(role: OrgRole) {
  const user = await prisma.user.create({
    data: { email: `act-${Date.now()}-${Math.random()}@t.com` },
  })
  const org = await prisma.organization.create({
    data: {
      name: 'Acme',
      slug: `acme-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      members: { create: { userId: user.id, role } },
      addresses: {
        create: {
          label: 'Default',
          recipient: 'R',
          line1: 'L1',
          city: 'C',
          postalCode: '1',
          country: 'US',
          isDefaultBilling: true,
          isDefaultShipping: true,
        },
      },
    },
    include: { addresses: true },
  })
  authMock.mockResolvedValue({ user: { id: user.id }, activeOrgId: org.id })
  return { user, org, addr: org.addresses[0]! }
}

function addressFd(extra: Record<string, string> = {}) {
  const fd = new FormData()
  fd.set('label', 'Warehouse')
  fd.set('recipient', 'Dock')
  fd.set('line1', '2 Side St')
  fd.set('city', 'Doral')
  fd.set('postalCode', '33122')
  fd.set('country', 'US')
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return fd
}

describe('address actions — role gating', () => {
  it('OWNER can create an address', async () => {
    const { org } = await seedVerified('OWNER')
    const { createAddressAction } = await import('../actions')
    const r = await createAddressAction(INITIAL_ACTION_RESULT, addressFd())
    expect(r.ok).toBe(true)
    expect(await customersService.listAddresses(org.id)).toHaveLength(2)
  })

  it('ADMIN can create an address', async () => {
    const { org } = await seedVerified('ADMIN')
    const { createAddressAction } = await import('../actions')
    const r = await createAddressAction(INITIAL_ACTION_RESULT, addressFd())
    expect(r.ok).toBe(true)
    expect(await customersService.listAddresses(org.id)).toHaveLength(2)
  })

  it('BUYER is forbidden from creating (no mutation)', async () => {
    const { org } = await seedVerified('BUYER')
    const { createAddressAction } = await import('../actions')
    const r = await createAddressAction(INITIAL_ACTION_RESULT, addressFd())
    expect(r.ok).toBe(false)
    expect(r.messageKey).toBe('account.toast.addressForbidden')
    expect(await customersService.listAddresses(org.id)).toHaveLength(1)
  })

  it('BUYER is forbidden from deleting', async () => {
    const { org, addr } = await seedVerified('BUYER')
    const a2 = await customersService.createAddress({
      organizationId: org.id,
      label: 'Two',
      recipient: 'R',
      line1: 'L',
      city: 'C',
      postalCode: '1',
      country: 'US',
    })
    const { deleteAddressAction } = await import('../actions')
    const fd = new FormData()
    fd.set('id', a2.id)
    const r = await deleteAddressAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(false)
    expect(r.messageKey).toBe('account.toast.addressForbidden')
    expect(await customersService.findAddressById(a2.id)).not.toBeNull()
    void addr
  })

  it('OWNER delete of an in-use address → addressInUse error (soft-guard)', async () => {
    const { user, org, addr } = await seedVerified('OWNER')
    await prisma.order.create({
      data: {
        orderNumber: `O-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organizationId: org.id,
        placedByUserId: user.id,
        billingAddressId: addr.id,
        shippingAddressId: addr.id,
        subtotal: 0,
        total: 0,
        currency: 'USD',
      },
    })
    const { deleteAddressAction } = await import('../actions')
    const fd = new FormData()
    fd.set('id', addr.id)
    const r = await deleteAddressAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(false)
    expect(r.messageKey).toBe('account.toast.addressInUse')
    expect(await customersService.findAddressById(addr.id)).not.toBeNull()
  })

  it('OWNER can set a new default billing (uniqueness holds)', async () => {
    const { org } = await seedVerified('OWNER')
    const a2 = await customersService.createAddress({
      organizationId: org.id,
      label: 'Two',
      recipient: 'R',
      line1: 'L',
      city: 'C',
      postalCode: '1',
      country: 'US',
    })
    const { setDefaultBillingAction } = await import('../actions')
    const fd = new FormData()
    fd.set('id', a2.id)
    const r = await setDefaultBillingAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(true)
    const billings = (await customersService.listAddresses(org.id)).filter(
      (a) => a.isDefaultBilling
    )
    expect(billings).toHaveLength(1)
    expect(billings[0]?.id).toBe(a2.id)
  })
})
