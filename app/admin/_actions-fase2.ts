'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { toastUrl } from '@/lib/feedback/action-result'
import type { MessageKey } from '@/lib/i18n/messages'
import { grantAccess, revokeAccess } from '@/modules/catalog'
import { decimalToCents, reconcileWire } from '@/modules/payments'
import { upsertTier } from '@/modules/pricing'
import { quote, revise } from '@/modules/quotes'
import { enqueueIndex } from '@/modules/search'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function safeReturnTo(raw: FormDataEntryValue | null, fallback: string): string {
  const v = typeof raw === 'string' ? raw : ''
  if (v.startsWith('/') && !v.startsWith('//')) return v
  return fallback
}

function adminToast(
  formData: FormData,
  fallback: string,
  variant: 'success' | 'error' | 'info',
  msg: MessageKey
): never {
  const returnTo = safeReturnTo(formData.get('returnTo'), fallback)
  redirect(toastUrl(returnTo, variant, msg))
}

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
  adminToast(
    formData,
    `/admin/quotes/${quoteId}`,
    'success',
    action === 'revise' ? 'admin.toast.quoteRevised' : 'admin.toast.quoteSent'
  )
}

export async function markInvoicePaidAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const invoiceId = String(formData.get('invoiceId'))
  const reference = String(formData.get('paidNote') ?? '')
    .trim()
    .slice(0, 255)
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { orderId: true, amount: true },
  })
  await reconcileWire({
    orderId: invoice.orderId,
    amountCents: decimalToCents(invoice.amount),
    wireReference: reference,
    adminUserId: admin.id,
  })
  revalidatePath('/admin/invoices')
  adminToast(formData, '/admin/invoices', 'success', 'admin.toast.invoicePaid')
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
  adminToast(formData, `/admin/customers/${orgId}/credit`, 'success', 'admin.toast.creditSaved')
}

export async function upsertProductTierAction(formData: FormData) {
  await requirePlatformAdmin()
  const productId = String(formData.get('productId'))
  const minQty = Number(formData.get('minQty'))
  const unitPrice = Number(formData.get('unitPrice'))
  await upsertTier({ productId, minQty, unitPrice })
  revalidatePath('/admin/products')
  adminToast(formData, `/admin/products/${productId}`, 'success', 'admin.toast.tierUpserted')
}

export async function grantCatalogAccessAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const organizationId = String(formData.get('orgId'))
  const productId = formData.get('productId')?.toString().trim() || undefined
  const categoryId = formData.get('categoryId')?.toString().trim() || undefined
  await grantAccess({ organizationId, productId, categoryId, grantedById: admin.id })
  revalidatePath(`/admin/customers/${organizationId}`)
  adminToast(formData, `/admin/customers/${organizationId}`, 'success', 'admin.toast.accessGranted')
}

export async function revokeCatalogAccessAction(formData: FormData) {
  await requirePlatformAdmin()
  const organizationId = String(formData.get('orgId'))
  const productId = formData.get('productId')?.toString().trim() || undefined
  const categoryId = formData.get('categoryId')?.toString().trim() || undefined
  await revokeAccess({ organizationId, productId, categoryId })
  revalidatePath(`/admin/customers/${organizationId}`)
  adminToast(formData, `/admin/customers/${organizationId}`, 'success', 'admin.toast.accessRevoked')
}

export async function toggleProductPrivateAction(formData: FormData) {
  await requirePlatformAdmin()
  const id = String(formData.get('id'))
  const current = formData.get('isPrivate') === 'true'
  await prisma.product.update({ where: { id }, data: { isPrivate: !current } })
  await enqueueIndex(id, 'UPSERT')
  revalidatePath('/admin/products')
  adminToast(formData, '/admin/products', 'success', 'admin.toast.productPrivacyToggled')
}
