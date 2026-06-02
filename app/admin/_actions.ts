'use server'

import { impersonationStart } from '@/lib/auth/actions'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { catalogService } from '@/modules/catalog'
import { ordersService } from '@/modules/orders'
import { pricingService } from '@/modules/pricing'
import { enqueueIndex } from '@/modules/search'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
}

export async function toggleProductActiveAction(formData: FormData) {
  await requirePlatformAdmin()
  const id = String(formData.get('id'))
  const isActive = formData.get('isActive') === 'true'
  await catalogService.updateProduct({ id, isActive: !isActive })
  await enqueueIndex(id, isActive ? 'DELETE' : 'UPSERT')
  revalidatePath('/admin/products')
}

export async function createCategoryAction(formData: FormData) {
  await requirePlatformAdmin()
  const slug = String(formData.get('slug')).toLowerCase()
  const name = String(formData.get('name'))
  const sortOrder = Number(formData.get('sortOrder') ?? 0)
  await catalogService.createCategory({ slug, name, sortOrder })
  revalidatePath('/admin/categories')
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
}

export async function transitionOrderStatusAction(formData: FormData) {
  await requirePlatformAdmin()
  const orderId = String(formData.get('orderId'))
  const newStatus = String(formData.get('newStatus')) as 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'
  await ordersService.transitionStatus({ orderId, newStatus })
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
}

export async function cancelOrderAction(formData: FormData) {
  const user = await requirePlatformAdmin()
  const orderId = String(formData.get('orderId'))
  await ordersService.cancel({ orderId, byUserId: user.id })
  revalidatePath('/admin/orders')
}

export async function approveOrganizationAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const organizationId = String(formData.get('organizationId'))
  const { approveOrganization } = await import('@/modules/verification')
  await approveOrganization({ organizationId, byAdminId: admin.id })
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${organizationId}`)
}

export async function rejectOrganizationAction(formData: FormData) {
  const admin = await requirePlatformAdmin()
  const organizationId = String(formData.get('organizationId'))
  const reason = String(formData.get('reason') ?? '').trim()
  if (!reason) throw new Error('motivo obligatorio')
  const { rejectOrganization } = await import('@/modules/verification')
  await rejectOrganization({ organizationId, byAdminId: admin.id, reason })
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${organizationId}`)
}

export async function uploadTaxCertificateAction(formData: FormData) {
  await requirePlatformAdmin()
  const organizationId = String(formData.get('organizationId'))
  const type = String(formData.get('type')) as 'US_RESALE_CERT' | 'FOREIGN_EQUIV'
  const number = String(formData.get('number')).trim()
  const jurisdiction = String(formData.get('jurisdiction')).trim()
  const country = String(formData.get('country') ?? '').trim() || undefined
  if (!number || !jurisdiction) throw new Error('number y jurisdiction obligatorios')
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) throw new Error('archivo obligatorio')
  if (file.size > 10 * 1024 * 1024) throw new Error('archivo > 10 MB')
  const fileBytes = new Uint8Array(await file.arrayBuffer())
  const { uploadAndAutoApprove } = await import('@/modules/verification')
  await uploadAndAutoApprove({
    organizationId,
    type,
    number,
    jurisdiction,
    fileName: file.name,
    fileBytes,
    country,
  })
  revalidatePath(`/admin/customers/${organizationId}`)
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

export async function reconcileWireAction(formData: FormData) {
  const user = await requirePlatformAdmin()
  const orderId = String(formData.get('orderId'))
  const amountStr = String(formData.get('amount'))
  const wireReference = String(formData.get('wireReference')).trim()
  if (!wireReference) throw new Error('wireReference es obligatorio')
  // amount viene en USD; el módulo de pagos trabaja en cents.
  const amount = Number(amountStr)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Monto inválido')
  const amountCents = Math.round(amount * 100)
  const { reconcileWire } = await import('@/modules/payments')
  await reconcileWire({ orderId, amountCents, wireReference, adminUserId: user.id })
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
}

export async function setCustomerPriceAction(formData: FormData) {
  await requirePlatformAdmin()
  const organizationId = String(formData.get('organizationId'))
  const productId = String(formData.get('productId'))
  const price = Number(formData.get('price'))
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Precio inválido')
  }
  await pricingService.setCustomerPrice({
    organizationId,
    productId,
    price,
  })
  revalidatePath(`/admin/customers/${organizationId}/prices`)
}

export async function startImpersonationAction(formData: FormData) {
  await requirePlatformAdmin()
  const orgId = String(formData.get('orgId'))
  const reason = formData.get('reason')?.toString().trim() || undefined
  await impersonationStart(orgId, reason)
  redirect('/catalog')
}
