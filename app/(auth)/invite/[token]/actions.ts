'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'
import { redirect } from 'next/navigation'

export async function acceptInvitationAction(token: string) {
  const user = await requireAuth()
  await customersService.acceptInvitation({ token, userId: user.id })
  redirect('/admin/settings?accepted=1')
}
