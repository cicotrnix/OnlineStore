'use server'

import { auth } from '@/lib/auth/config'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { toastUrl } from '@/lib/feedback/action-result'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isSupportedLocale } from '@/lib/i18n'
import { cartService } from '@/modules/cart'
import { checkoutService } from '@/modules/checkout'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

function safeReturnTo(raw: FormDataEntryValue | null, fallback: string): string {
  const v = typeof raw === 'string' ? raw : ''
  // Solo paths relativos internos. Bloquea // o http(s)://.
  if (v.startsWith('/') && !v.startsWith('//')) return v
  return fallback
}

async function getEffectiveOrgId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.impersonatingOrgId ?? session.activeOrgId
}

export async function addToCartAction(formData: FormData) {
  const user = await requireAuth()
  const session = await auth()
  const returnTo = safeReturnTo(formData.get('returnTo'), '/catalog')
  if (session?.impersonatingOrgId) {
    redirect(toastUrl(returnTo, 'error', 'cart.toast.failed'))
  }
  const orgId = await getEffectiveOrgId()
  if (!orgId) {
    redirect(toastUrl(returnTo, 'error', 'cart.toast.failed'))
  }
  const productId = String(formData.get('productId'))
  const quantity = Number(formData.get('quantity') ?? 1)
  try {
    await cartService.addItem({ userId: user.id, productId, quantity, orgId: orgId! })
  } catch {
    redirect(toastUrl(returnTo, 'error', 'cart.toast.failed'))
  }
  revalidatePath('/cart')
  revalidatePath('/catalog')
  redirect(toastUrl(returnTo, 'success', 'cart.toast.added'))
}

export async function updateCartQuantityAction(formData: FormData) {
  const user = await requireAuth()
  const productId = String(formData.get('productId'))
  const quantity = Number(formData.get('quantity'))
  try {
    await cartService.updateQuantity({ userId: user.id, productId, quantity })
  } catch {
    redirect(toastUrl('/cart', 'error', 'cart.toast.failed'))
  }
  revalidatePath('/cart')
  redirect(toastUrl('/cart', 'success', 'cart.toast.updated'))
}

export async function removeCartItemAction(formData: FormData) {
  const user = await requireAuth()
  const productId = String(formData.get('productId'))
  try {
    await cartService.removeItem(user.id, productId)
  } catch {
    redirect(toastUrl('/cart', 'error', 'cart.toast.failed'))
  }
  revalidatePath('/cart')
  redirect(toastUrl('/cart', 'success', 'cart.toast.removed'))
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
  if (!orgId) {
    redirect(toastUrl('/cart', 'error', 'checkout.toast.failed'))
  }
  const billingAddressId = String(formData.get('billingAddressId'))
  const shippingAddressId = String(formData.get('shippingAddressId'))
  const poNumber = formData.get('poNumber')?.toString().trim() || null
  const notes = formData.get('notes')?.toString().trim() || null

  let order: { id: string }
  try {
    order = await checkoutService.confirm({
      userId: user.id,
      orgId: orgId!,
      billingAddressId,
      shippingAddressId,
      poNumber,
      notes,
    })
  } catch {
    redirect(toastUrl('/checkout', 'error', 'checkout.toast.failed'))
  }
  redirect(toastUrl(`/orders/${order!.id}`, 'success', 'checkout.toast.orderPlaced'))
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
