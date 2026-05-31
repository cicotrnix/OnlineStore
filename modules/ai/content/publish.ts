import { prisma } from '@/lib/db/client'
import type { Locale } from '@/lib/i18n'
import { enqueueIndex } from '@/modules/search'

export interface PublishInput {
  productId: string
  locale: Locale
  byUserId: string
}

export async function publishContent(input: PublishInput): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: input.byUserId },
    select: { isPlatformAdmin: true },
  })
  if (!u?.isPlatformAdmin) {
    throw new Error('Forbidden — only platform admins can publish content')
  }

  await prisma.productContent.update({
    where: { productId_locale: { productId: input.productId, locale: input.locale } },
    data: { status: 'PUBLISHED' },
  })

  await enqueueIndex(input.productId, 'UPSERT')
}
