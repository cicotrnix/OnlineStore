'use server'

import { auth } from '@/lib/auth/config'
import { markAllAsRead, markAsRead } from '@/modules/notifications'
import { revalidatePath } from 'next/cache'

export async function markAllReadAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await markAllAsRead(session.user.id)
  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
}

export async function markOneReadAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const id = String(formData.get('id'))
  await markAsRead(session.user.id, [id])
  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
}
