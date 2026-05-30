'use server'

import { auth } from '@/lib/auth/config'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isSupportedLocale } from '@/lib/i18n'
import { cartService } from '@/modules/cart'
import { checkoutService } from '@/modules/checkout'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function getEffectiveOrgId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.impersonatingOrgId ?? session.activeOrgId
}

export async function addToCartAction(formData: FormData) {
  const user = await requireAuth()
  const session = await auth()
  if (session?.impersonatingOrgId) {
    throw new Error('Cannot modify cart while impersonating')
  }
  const orgId = await getEffectiveOrgId()
  if (!orgId) throw new Error('No active organization')
  const productId = String(formData.get('productId'))
  const quantity = Number(formData.get('quantity') ?? 1)
  await cartService.addItem({ userId: user.id, productId, quantity, orgId })
  revalidatePath('/cart')
  revalidatePath('/catalog')
}

export async function updateCartQuantityAction(formData: FormData) {
  const user = await requireAuth()
  const productId = String(formData.get('productId'))
  const quantity = Number(formData.get('quantity'))
  await cartService.updateQuantity({ userId: user.id, productId, quantity })
  revalidatePath('/cart')
}

export async function removeCartItemAction(formData: FormData) {
  const user = await requireAuth()
  const productId = String(formData.get('productId'))
  await cartService.removeItem(user.id, productId)
  revalidatePath('/cart')
}

export async function setCatalogViewAction(view: 'CARDS' | 'LIST') {
  const user = await requireAuth()
  await prisma.user.update({
    where: { id: user.id },
    data: { preferredCatalogView: view },
  })
  revalidatePath('/catalog')
}

export async function placeOrderAction(formData: FormData) {
  const user = await requireAuth()
  const orgId = await getEffectiveOrgId()
  if (!orgId) throw new Error('No active organization')
  const billingAddressId = String(formData.get('billingAddressId'))
  const shippingAddressId = String(formData.get('shippingAddressId'))
  const poNumber = formData.get('poNumber')?.toString().trim() || null
  const notes = formData.get('notes')?.toString().trim() || null

  const order = await checkoutService.confirm({
    userId: user.id,
    orgId,
    billingAddressId,
    shippingAddressId,
    poNumber,
    notes,
  })
  redirect(`/orders/${order.id}`)
}

export async function setLocaleAction(formData: FormData): Promise<void> {
  const raw = String(formData.get('locale'))
  if (!isSupportedLocale(raw)) return

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, raw, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  })

  const session = await auth()
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredLocale: raw },
    })
  }

  revalidatePath('/', 'layout')
}
