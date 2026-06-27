'use server'

import { impersonationStart } from '@/lib/auth/actions'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { toastUrl } from '@/lib/feedback/action-result'
import type { MessageKey } from '@/lib/i18n/messages'
import { catalogService } from '@/modules/catalog'
import { ordersService } from '@/modules/orders'
import { pricingService } from '@/modules/pricing'
import { enqueueIndex } from '@/modules/search'
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
  if (!u?.isPlatformAdmin) throw new Error('Forbidden — platform admin only')
  return user
}

export async function createProductAction(formData: FormData) {
  await requirePlatformAdmin()
  const sku = String(formData.get('sku')).toUpperCase()
  const slug = String(formData.get('slug')).toLowerCase()
  const name = String(formData.get('name'))
  const description = formData.get('description')?.toString().trim() || null
  const basePrice = Number(formData.get('basePrice'))
  const stockQuantity = Number(formData.get('stockQuantity') ?? 0)
  const imageUrl = formData.get('imageUrl')?.toString().trim() || null
  const categoryId = String(formData.get('categoryId'))
  const product = await catalogService.createProduct({
    sku,
    slug,
    name,
    description,
    basePrice,
    stockQuantity,
    imageUrl,
    categoryId,
  })
  await enqueueIndex(product.id, 'UPSERT')
  revalidatePath('/admin/products')
  adminToast(formData, '/admin/products', 'success', 'admin.toast.productCreated')
}

export async function toggleProductActiveAction(formData: FormData) {
  await requirePlatformAdmin()
  const id = String(formData.get('id'))
  const isActive = formData.get('isActive') === 'true'
  await catalogService.updateProduct({ id, isActive: !isActive })
  await enqueueIndex(id, isActive ? 'DELETE' : 'UPSERT')
  revalidatePath('/admin/products')
  adminToast(
    formData,
    '/admin/products',
    'success',
    isActive ? 'admin.toast.productDisabled' : 'admin.toast.productEnabled'
  )
}

export async function updateProductStockAction(formData: FormData) {
  await requirePlatformAdmin()
  const id = String(formData.get('id'))
  const deltaRaw = formData.get('delta')

  let nextStock: number
  if (deltaRaw !== null && String(deltaRaw).trim() !== '') {
    // Ajuste relativo: stock actual + delta, con clamp ≥ 0.
    const delta = Number(deltaRaw)
    if (!Number.isInteger(delta)) {
      adminToast(formData, '/admin/products', 'error', 'admin.toast.invalidStock')
    }
    const product = await catalogService.findProductById(id)
    if (!product) {
      adminToast(formData, '/admin/products', 'error', 'admin.toast.invalidStock')
    }
    nextStock = Math.max(0, (product?.stockQuantity ?? 0) + delta)
  } else {
    // Set absoluto: entero ≥ 0.
    nextStock = Number(formData.get('stockQuantity'))
    if (!Number.isInteger(nextStock) || nextStock < 0) {
      adminToast(formData, '/admin/products', 'error', 'admin.toast.invalidStock')
    }
  }

  await catalogService.updateProduct({ id, stockQuantity: nextStock })
  await enqueueIndex(id, 'UPSERT')
  revalidatePath('/admin/products')
  adminToast(formData, '/admin/products', 'success', 'admin.toast.stockUpdated')
}

export async function createCategoryAction(formData: FormData) {
  await requirePlatformAdmin()
  const slug = String(formData.get('slug')).toLowerCase()
  const name = String(formData.get('name'))
  const sortOrder = Number(formData.get('sortOrder') ?? 0)
  await catalogService.createCategory({ slug, name, sortOrder })
  revalidatePath('/admin/categories')
  adminToast(formData, '/admin/categories', 'success', 'admin.toast.categoryCreated')
}

export async function toggleCategoryPrivacyAction(formData: FormData) {
  await requirePlatformAdmin()
  const categoryId = String(formData.get('categoryId'))
  const isPrivate = formData.get('isPrivate') === 'true'
  await prisma.category.update({ where: { id: categoryId }, data: { isPrivate } })
  const products = await prisma.product.findMany({
    where: { categoryId },
    select: { id: true },
  })
  for (const p of products) {
    await enqueueIndex(p.id, 'UPSERT')
  }
  revalidatePath('/admin/categories')
  adminToast(formData, '/admin/categories', 'success', 'admin.toast.categoryPrivacyToggled')
}

export async function transitionOrderStatusAction(formData: FormData) {
  await requirePlatformAdmin()
  const orderId = String(formData.get('orderId'))
  const newStatus = String(formData.get('newStatus')) as 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'
  await ordersService.transitionStatus({ orderId, newStatus })
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  adminToast(formData, `/admin/orders/${orderId}`, 'success', 'admin.toast.orderStatusChanged')
}

export async function cancelOrderAction(formData: FormData) {
  const user = await requirePlatformAdmin()
  const orderId = String(formData.get('orderId'))
  await ordersService.cancel({ orderId, byUserId: user.id })
  revalidatePath('/admin/orders')
  adminToast(formData, '/admin/orders', 'success', 'admin.toast.orderCancelled')
}

// OPS-1 (ADR 0036): el admin pospone el vencimiento de pago de una orden wire
// cuando el comprador avisa que su transferencia viene en camino, para que el
// cron cancel-stale-pending-orders no libere su stock reservado.
export async function extendPaymentDueAction(formData: FormData) {
  await requirePlatformAdmin()
  const orderId = String(formData.get('orderId'))
  const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await ordersService.extendPaymentDue({ orderId, dueAt })
  revalidatePath(`/admin/orders/${orderId}`)
  adminToast(formData, `/admin/orders/${orderId}`, 'success', 'admin.toast.paymentDueExtended')
}

export async function approveOrganizationAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const organizationId = String(formData.get('organizationId'))
  const { approveOrganization } = await import('@/modules/verification')
  const result = await approveOrganization({ organizationId, byAdminId: admin.id })
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${organizationId}`)
  const { toastUrl } = await import('@/lib/feedback/action-result')
  redirect(
    toastUrl(
      `/admin/customers/${organizationId}`,
      result.changed ? 'success' : 'info',
      result.changed ? 'admin.toast.approved' : 'admin.toast.approvedNoop'
    )
  )
}

export async function rejectOrganizationAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const organizationId = String(formData.get('organizationId'))
  const reason = String(formData.get('reason') ?? '').trim()
  const { toastUrl } = await import('@/lib/feedback/action-result')
  if (!reason) {
    redirect(toastUrl(`/admin/customers/${organizationId}`, 'error', 'admin.toast.reasonRequired'))
  }
  const { rejectOrganization } = await import('@/modules/verification')
  const result = await rejectOrganization({ organizationId, byAdminId: admin.id, reason })
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${organizationId}`)
  redirect(
    toastUrl(
      `/admin/customers/${organizationId}`,
      result.changed ? 'success' : 'info',
      result.changed ? 'admin.toast.rejected' : 'admin.toast.rejectedNoop'
    )
  )
}

export async function verifyOrganizationAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const organizationId = String(formData.get('organizationId'))
  const fallback = `/admin/customers/${organizationId}`
  const docType = String(formData.get('docType')) as
    | 'US_RESALE_CERT'
    | 'FOREIGN_EQUIV'
    | 'BUSINESS_REGISTRY_PROOF'
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    adminToast(formData, fallback, 'error', 'admin.toast.evidenceRequired')
  }
  if (file!.size > 10 * 1024 * 1024) {
    adminToast(formData, fallback, 'error', 'admin.toast.certFailed')
  }
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { taxId: true, taxIdCountry: true },
  })
  const fileBytes = new Uint8Array(await file!.arrayBuffer())
  const { approveOrganizationWithEvidence } = await import('@/modules/verification')
  try {
    await approveOrganizationWithEvidence({
      organizationId,
      byAdminId: admin.id,
      evidence: {
        fileName: file!.name,
        fileBytes,
        docType,
        taxIdNumber: org.taxId ?? '',
        country: org.taxIdCountry ?? '',
      },
    })
  } catch {
    adminToast(formData, fallback, 'error', 'admin.toast.certFailed')
  }
  revalidatePath(fallback)
  adminToast(formData, fallback, 'success', 'admin.toast.verified')
}

export async function getTaxCertificateUrlAction(formData: FormData): Promise<string> {
  await requirePlatformAdmin()
  const taxDocumentId = String(formData.get('taxDocumentId'))
  const doc = await prisma.taxDocument.findUniqueOrThrow({
    where: { id: taxDocumentId },
    select: { fileKey: true },
  })
  const { getStorage } = await import('@/lib/storage')
  return getStorage().signedUrl(doc.fileKey, 900) // 15 min
}

export async function setCustomerPriceAction(formData: FormData) {
  await requirePlatformAdmin()
  const organizationId = String(formData.get('organizationId'))
  const fallback = `/admin/customers/${organizationId}/prices`
  const productId = String(formData.get('productId'))
  const price = Number(formData.get('price'))
  if (!Number.isFinite(price) || price <= 0) {
    adminToast(formData, fallback, 'error', 'admin.toast.invalidInput')
  }
  await pricingService.setCustomerPrice({
    organizationId,
    productId,
    price,
  })
  revalidatePath(fallback)
  adminToast(formData, fallback, 'success', 'admin.toast.customerPriceSaved')
}

export async function startImpersonationAction(formData: FormData) {
  await requirePlatformAdmin()
  const orgId = String(formData.get('orgId'))
  const reason = formData.get('reason')?.toString().trim() || undefined
  await impersonationStart(orgId, reason)
  redirect('/catalog')
}
