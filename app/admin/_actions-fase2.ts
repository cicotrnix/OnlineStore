'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { markPaid } from '@/modules/accounts'
import { grantAccess, revokeAccess } from '@/modules/catalog'
import { upsertTier } from '@/modules/pricing'
import { quote, revise } from '@/modules/quotes'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

async function requirePlatformAdmin() {
  const user = await requireAuth()
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  })
  if (!u?.isPlatformAdmin) throw new Error('Forbidden')
  return user
}

export async function quoteOrReviseAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const quoteId = String(formData.get('quoteId'))
  const action = String(formData.get('action')) as 'quote' | 'revise'
  const validUntilStr = String(formData.get('validUntil'))
  const adminNotes = formData.get('adminNotes')?.toString().trim() || undefined

  const linesData: Array<{ lineId: string; unitPriceQuoted: number }> = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('price[')) {
      const lineId = key.slice(6, -1)
      const price = Number(value)
      if (Number.isFinite(price) && price > 0) {
        linesData.push({ lineId, unitPriceQuoted: price })
      }
    }
  }

  const fn = action === 'revise' ? revise : quote
  await fn({
    quoteId,
    adminUserId: admin.id,
    lines: linesData,
    validUntil: new Date(validUntilStr),
    adminNotes,
  })
  revalidatePath(`/admin/quotes/${quoteId}`)
}

export async function markInvoicePaidAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const invoiceId = String(formData.get('invoiceId'))
  const paidNote = String(formData.get('paidNote') ?? '')
  await markPaid({ invoiceId, paidById: admin.id, paidNote })
  revalidatePath('/admin/invoices')
}

export async function setCreditAction(formData: FormData) {
  await requirePlatformAdmin()
  const orgId = String(formData.get('orgId'))
  const creditLimitStr = formData.get('creditLimit')?.toString().trim()
  const paymentTerms = String(formData.get('paymentTerms') ?? 'PREPAID') as
    | 'PREPAID'
    | 'NET_15'
    | 'NET_30'
    | 'NET_60'
  const thresholdStr = formData.get('approvalThreshold')?.toString().trim()

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      creditLimit: creditLimitStr ? new Decimal(creditLimitStr) : null,
      paymentTerms,
      approvalThreshold: thresholdStr ? new Decimal(thresholdStr) : null,
    },
  })
  revalidatePath(`/admin/customers/${orgId}`)
}

export async function upsertProductTierAction(formData: FormData) {
  await requirePlatformAdmin()
  const productId = String(formData.get('productId'))
  const minQty = Number(formData.get('minQty'))
  const unitPrice = Number(formData.get('unitPrice'))
  await upsertTier({ productId, minQty, unitPrice })
  revalidatePath(`/admin/products`)
}

export async function grantCatalogAccessAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const organizationId = String(formData.get('orgId'))
  const productId = formData.get('productId')?.toString().trim() || undefined
  const categoryId = formData.get('categoryId')?.toString().trim() || undefined
  await grantAccess({ organizationId, productId, categoryId, grantedById: admin.id })
  revalidatePath(`/admin/customers/${organizationId}`)
}

export async function revokeCatalogAccessAction(formData: FormData) {
  await requirePlatformAdmin()
  const organizationId = String(formData.get('orgId'))
  const productId = formData.get('productId')?.toString().trim() || undefined
  const categoryId = formData.get('categoryId')?.toString().trim() || undefined
  await revokeAccess({ organizationId, productId, categoryId })
  revalidatePath(`/admin/customers/${organizationId}`)
}

export async function toggleProductPrivateAction(formData: FormData) {
  await requirePlatformAdmin()
  const id = String(formData.get('id'))
  const current = formData.get('isPrivate') === 'true'
  await prisma.product.update({ where: { id }, data: { isPrivate: !current } })
  revalidatePath('/admin/products')
}
