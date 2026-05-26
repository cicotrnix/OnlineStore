import { prisma } from '@/lib/db/client'
import { ApprovalAlreadyDecidedError } from '@/lib/errors'
import { dispatch } from '@/modules/notifications'
import type { ApprovalRequest, ApprovalStatus, ApprovalSubject, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { registry } from './registry'

export interface RequestInput {
  organizationId: string
  subjectType: ApprovalSubject
  subjectId: string
  amount: number | string | Decimal
  requestedById: string
}

export async function request(input: RequestInput): Promise<ApprovalRequest | null> {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } })
  if (!org) throw new Error(`Organization not found: ${input.organizationId}`)
  if (!org.approvalThreshold) return null

  const amount = new Decimal(input.amount as Decimal.Value)
  if (amount.lte(org.approvalThreshold)) return null

  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      organizationId: input.organizationId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      amount,
      threshold: org.approvalThreshold,
      requestedById: input.requestedById,
      status: 'PENDING',
    },
  })

  const approvers = await prisma.organizationMember.findMany({
    where: { organizationId: input.organizationId, role: { in: org.approvalRoles as never } },
    select: { userId: true },
  })

  if (approvers.length > 0) {
    await dispatch({
      userIds: approvers.map((a) => a.userId),
      type: 'APPROVAL_REQUESTED',
      title: `Aprobación requerida: ${input.subjectType.toLowerCase()} de $${amount.toFixed(2)}`,
      body: `Un miembro de tu organización envió un ${input.subjectType.toLowerCase()} por $${amount.toFixed(2)} que excede el threshold de $${org.approvalThreshold.toFixed(2)}.`,
      link: `/approvals/${approvalRequest.id}`,
      subjectType: 'APPROVAL_REQUEST',
      subjectId: approvalRequest.id,
    })
  }

  return approvalRequest
}

export interface DecideInput {
  requestId: string
  action: Exclude<ApprovalStatus, 'PENDING'>
  decidedById: string
  reason?: string
}

export async function decide(input: DecideInput): Promise<ApprovalRequest> {
  return prisma.$transaction(async (tx) => {
    const result = await tx.approvalRequest.updateMany({
      where: { id: input.requestId, status: 'PENDING' },
      data: {
        status: input.action,
        decidedById: input.decidedById,
        decidedAt: new Date(),
        reason: input.reason ?? null,
      },
    })

    if (result.count === 0) {
      const existing = await tx.approvalRequest.findUnique({ where: { id: input.requestId } })
      if (!existing) throw new Error(`ApprovalRequest not found: ${input.requestId}`)
      throw new ApprovalAlreadyDecidedError(
        `Request ${input.requestId} already in status ${existing.status}`
      )
    }

    const updated = await tx.approvalRequest.findUniqueOrThrow({
      where: { id: input.requestId },
    })

    const handler = registry.get(updated.subjectType)
    if (handler) await handler(updated, tx as Prisma.TransactionClient)

    await dispatch({
      userIds: [updated.requestedById],
      type: input.action === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      title:
        input.action === 'APPROVED' ? 'Tu solicitud fue aprobada' : 'Tu solicitud fue rechazada',
      body:
        input.action === 'APPROVED'
          ? `Tu ${updated.subjectType.toLowerCase()} fue aprobada.`
          : `Tu ${updated.subjectType.toLowerCase()} fue rechazada${input.reason ? `: ${input.reason}` : ''}.`,
      link:
        updated.subjectType === 'ORDER'
          ? `/orders/${updated.subjectId}`
          : `/quotes/${updated.subjectId}`,
      subjectType: 'APPROVAL_REQUEST',
      subjectId: updated.id,
    })

    return updated
  })
}
