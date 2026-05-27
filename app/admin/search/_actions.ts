'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { enqueueIndex } from '@/modules/search'
import { revalidatePath } from 'next/cache'

async function requirePlatformAdmin() {
  const user = await requireAuth()
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  })
  if (!u?.isPlatformAdmin) throw new Error('Forbidden — platform admin only')
  return user
}

export async function reindexAllAction(): Promise<void> {
  await requirePlatformAdmin()
  const products = await prisma.product.findMany({ select: { id: true } })
  for (const p of products) {
    await enqueueIndex(p.id, 'UPSERT')
  }
  revalidatePath('/admin/search')
}

export async function retryFailedAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin()
  const queueItemId = String(formData.get('queueItemId'))
  await prisma.searchIndexQueue.update({
    where: { id: queueItemId },
    data: { status: 'PENDING', attempts: 0, lastError: null },
  })
  revalidatePath('/admin/search')
}
