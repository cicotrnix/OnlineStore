'use server'

import { requireActiveOrgId } from '@/lib/auth/active-org'
import { auth } from '@/lib/auth/config'
import { assertFeature } from '@/lib/features'
import { accept, addLineToDraft, reject, submit } from '@/modules/quotes'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addToQuoteDraftAction(formData: FormData) {
  assertFeature('rfq')
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const orgId = await requireActiveOrgId()
  const productId = String(formData.get('productId'))
  const qty = Number(formData.get('qty') ?? 1)
  await addLineToDraft({
    userId: session.user.id,
    organizationId: orgId,
    productId,
    qty,
  })
  revalidatePath('/quotes/draft')
}

export async function submitDraftAction(formData: FormData) {
  assertFeature('rfq')
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const quoteId = String(formData.get('quoteId'))
  const notes = formData.get('notes')?.toString().trim() || undefined
  const submitted = await submit({ quoteId, userId: session.user.id, notes })
  revalidatePath('/quotes')
  redirect(`/quotes/${submitted.id}`)
}

export async function acceptQuoteAction(formData: FormData) {
  assertFeature('rfq')
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const quoteId = String(formData.get('quoteId'))
  const paymentMethod = String(formData.get('paymentMethod')) as 'PREPAID' | 'NET_TERMS'
  const billingAddressId = String(formData.get('billingAddressId'))
  const shippingAddressId = String(formData.get('shippingAddressId'))
  const result = await accept({
    quoteId,
    userId: session.user.id,
    paymentMethod,
    billingAddressId,
    shippingAddressId,
  })
  revalidatePath('/quotes')
  redirect(`/orders/${result.orderId}`)
}

export async function rejectQuoteAction(formData: FormData) {
  assertFeature('rfq')
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const quoteId = String(formData.get('quoteId'))
  await reject({ quoteId, userId: session.user.id })
  revalidatePath('/quotes')
  redirect('/quotes')
}
