import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../service'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }),
}))

beforeEach(cleanDb)

describe('approvals.request', () => {
  it('returns null if org has no threshold', async () => {
    const org = await prisma.organization.create({
      data: { name: 'NoThreshold', slug: 'no-threshold', approvalThreshold: null },
    })
    const user = await prisma.user.create({ data: { email: 'ar1@test.com', name: 'U' } })

    const result = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'order-123',
      amount: 1000,
      requestedById: user.id,
    })

    expect(result).toBeNull()
  })

  it('returns null if amount <= threshold', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Org', slug: 'org-lte', approvalThreshold: new Decimal('5000') },
    })
    const user = await prisma.user.create({ data: { email: 'ar2@test.com', name: 'U' } })

    const result = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'order-456',
      amount: 4999,
      requestedById: user.id,
    })

    expect(result).toBeNull()
  })

  it('creates ApprovalRequest if amount > threshold', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Org', slug: 'org-gt', approvalThreshold: new Decimal('5000') },
    })
    const user = await prisma.user.create({ data: { email: 'ar3@test.com', name: 'U' } })

    const result = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'order-789',
      amount: 5001,
      requestedById: user.id,
    })

    expect(result).not.toBeNull()
    const req = await prisma.approvalRequest.findUnique({ where: { id: result?.id } })
    expect(req?.status).toBe('PENDING')
    expect(req?.threshold.toString()).toBe('5000')
    expect(req?.amount.toString()).toBe('5001')
  })

  it('notifies approvers when request is created', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Org', slug: 'org-notif', approvalThreshold: new Decimal('100') },
    })
    const requester = await prisma.user.create({
      data: { email: 'rq@test.com', name: 'Req' },
    })
    const owner = await prisma.user.create({
      data: { email: 'own@test.com', name: 'Owner' },
    })
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'OWNER' },
    })

    await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'order-n',
      amount: 500,
      requestedById: requester.id,
    })

    const notifs = await prisma.notification.findMany({ where: { userId: owner.id } })
    expect(notifs).toHaveLength(1)
    expect(notifs[0]?.type).toBe('APPROVAL_REQUESTED')
  })
})
