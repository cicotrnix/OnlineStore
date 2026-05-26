import { prisma } from '@/lib/db/client'
import { ApprovalAlreadyDecidedError } from '@/lib/errors'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decide, request } from '../service'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }),
}))

beforeEach(cleanDb)

async function makeOrgWithApproval(slug: string) {
  const org = await prisma.organization.create({
    data: { name: 'Org', slug, approvalThreshold: new Decimal('100') },
  })
  const requester = await prisma.user.create({
    data: { email: `${slug}-req@test.com`, name: 'R' },
  })
  const approver = await prisma.user.create({
    data: { email: `${slug}-app@test.com`, name: 'A' },
  })
  return { org, requester, approver }
}

describe('approvals.decide', () => {
  it('approves a pending request', async () => {
    const { org, requester, approver } = await makeOrgWithApproval('dec-1')
    const req = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'o1',
      amount: 200,
      requestedById: requester.id,
    })

    const decided = await decide({
      requestId: req?.id ?? '',
      action: 'APPROVED',
      decidedById: approver.id,
    })

    expect(decided.status).toBe('APPROVED')
    expect(decided.decidedById).toBe(approver.id)
    expect(decided.decidedAt).not.toBeNull()
  })

  it('rejects with reason', async () => {
    const { org, requester, approver } = await makeOrgWithApproval('dec-2')
    const req = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'o2',
      amount: 200,
      requestedById: requester.id,
    })

    const decided = await decide({
      requestId: req?.id ?? '',
      action: 'REJECTED',
      decidedById: approver.id,
      reason: 'budget',
    })

    expect(decided.status).toBe('REJECTED')
    expect(decided.reason).toBe('budget')
  })

  it('notifies requester of the decision', async () => {
    const { org, requester, approver } = await makeOrgWithApproval('dec-3')
    const req = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'o3',
      amount: 200,
      requestedById: requester.id,
    })

    await prisma.notification.deleteMany()
    await prisma.invoice.deleteMany()

    await decide({
      requestId: req?.id ?? '',
      action: 'APPROVED',
      decidedById: approver.id,
    })

    const notifs = await prisma.notification.findMany({ where: { userId: requester.id } })
    expect(notifs).toHaveLength(1)
    expect(notifs[0]?.type).toBe('APPROVAL_GRANTED')
  })
})

describe('approvals.decide idempotency', () => {
  it('throws ApprovalAlreadyDecidedError on second decide', async () => {
    const { org, requester, approver } = await makeOrgWithApproval('idem-1')
    const req = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'oi',
      amount: 200,
      requestedById: requester.id,
    })

    await decide({
      requestId: req?.id ?? '',
      action: 'APPROVED',
      decidedById: approver.id,
    })

    await expect(
      decide({
        requestId: req?.id ?? '',
        action: 'REJECTED',
        decidedById: approver.id,
      })
    ).rejects.toThrow(ApprovalAlreadyDecidedError)
  })
})
