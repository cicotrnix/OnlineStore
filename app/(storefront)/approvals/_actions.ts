'use server'

import { auth } from '@/lib/auth/config'
import { ApprovalAlreadyDecidedError } from '@/lib/errors'
import { canApprove, decide } from '@/modules/approvals'
import { revalidatePath } from 'next/cache'

async function ensureCanDecide(orgId: string, requestId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const allowed = await canApprove(session.user.id, orgId)
  if (!allowed) throw new Error('Not an approver')
  return session.user.id
}

export async function approveAction(formData: FormData) {
  const requestId = String(formData.get('requestId'))
  const orgId = String(formData.get('orgId'))
  const decidedById = await ensureCanDecide(orgId, requestId)
  try {
    await decide({ requestId, action: 'APPROVED', decidedById })
  } catch (e) {
    if (!(e instanceof ApprovalAlreadyDecidedError)) throw e
  }
  revalidatePath('/approvals')
}

export async function rejectAction(formData: FormData) {
  const requestId = String(formData.get('requestId'))
  const orgId = String(formData.get('orgId'))
  const reason = formData.get('reason')?.toString().trim() || undefined
  const decidedById = await ensureCanDecide(orgId, requestId)
  try {
    await decide({ requestId, action: 'REJECTED', decidedById, reason })
  } catch (e) {
    if (!(e instanceof ApprovalAlreadyDecidedError)) throw e
  }
  revalidatePath('/approvals')
}
