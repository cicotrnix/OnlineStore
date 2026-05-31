'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { LOCALES, isSupportedLocale } from '@/lib/i18n'
import { enqueueContentJob } from '@/modules/ai'
import { publishContent } from '@/modules/ai/content'
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

export async function enqueueContentGenAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin()
  const productId = String(formData.get('productId'))
  for (const locale of LOCALES) {
    await enqueueContentJob(productId, locale)
  }
  revalidatePath(`/admin/products/${productId}`)
  revalidatePath('/admin/products')
}

export async function enqueueBulkContentGenAction(): Promise<void> {
  await requirePlatformAdmin()
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true },
  })
  for (const p of products) {
    for (const locale of LOCALES) {
      await enqueueContentJob(p.id, locale)
    }
  }
  revalidatePath('/admin/products')
}

export async function publishContentAction(formData: FormData): Promise<void> {
  const user = await requirePlatformAdmin()
  const productId = String(formData.get('productId'))
  const locale = String(formData.get('locale'))
  if (!isSupportedLocale(locale)) throw new Error('Invalid locale')
  await publishContent({ productId, locale, byUserId: user.id })
  revalidatePath(`/admin/products/${productId}`)
}
