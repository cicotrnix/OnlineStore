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
