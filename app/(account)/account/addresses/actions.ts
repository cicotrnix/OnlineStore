'use server'

import { requireVerifiedCustomer } from '@/lib/auth/customer'
import type { ActionResult } from '@/lib/feedback/action-result'
import { AddressInUseError, customersService } from '@/modules/customers'
import { revalidatePath } from 'next/cache'

/**
 * Server actions de direcciones (org-level). Gateadas por rol: solo OWNER/ADMIN
 * editan; BUYER/VIEWER reciben addressForbidden (defensa en profundidad — la UI
 * además oculta los controles). Todas verifican pertenencia a la org activa.
 */
const EDIT_ROLES = new Set(['OWNER', 'ADMIN'])

async function requireEditor(): Promise<{ orgId: string; userId: string } | null> {
  const state = await requireVerifiedCustomer()
  const role = await customersService.getMemberRole(state.orgId, state.userId)
  if (!role || !EDIT_ROLES.has(role)) return null
  return { orgId: state.orgId, userId: state.userId }
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? '').trim()
  return v === '' ? null : v
}

function readAddressFields(fd: FormData) {
  return {
    label: String(fd.get('label') ?? '').trim(),
    recipient: String(fd.get('recipient') ?? '').trim(),
    line1: String(fd.get('line1') ?? '').trim(),
    line2: emptyToNull(fd.get('line2')),
    city: String(fd.get('city') ?? '').trim(),
    state: emptyToNull(fd.get('state')),
    postalCode: String(fd.get('postalCode') ?? '').trim(),
    country: String(fd.get('country') ?? '')
      .trim()
      .toUpperCase(),
    phone: emptyToNull(fd.get('phone')),
  }
}

const FORBIDDEN: ActionResult = { ok: false, messageKey: 'account.toast.addressForbidden' }

export async function createAddressAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const editor = await requireEditor()
  if (!editor) return FORBIDDEN
  try {
    await customersService.createAddress({ organizationId: editor.orgId, ...readAddressFields(fd) })
  } catch {
    return { ok: false, messageKey: 'account.toast.addressInvalid' }
  }
  revalidatePath('/account/addresses')
  return { ok: true, messageKey: 'account.toast.addressSaved' }
}

export async function updateAddressAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const editor = await requireEditor()
  if (!editor) return FORBIDDEN
  const id = String(fd.get('id') ?? '')
  const addr = await customersService.findAddressById(id)
  if (!addr || addr.organizationId !== editor.orgId) return FORBIDDEN
  try {
    await customersService.updateAddress({ id, ...readAddressFields(fd) })
  } catch {
    return { ok: false, messageKey: 'account.toast.addressInvalid' }
  }
  revalidatePath('/account/addresses')
  return { ok: true, messageKey: 'account.toast.addressSaved' }
}

export async function deleteAddressAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const editor = await requireEditor()
  if (!editor) return FORBIDDEN
  const id = String(fd.get('id') ?? '')
  try {
    await customersService.deleteAddress(editor.orgId, id)
  } catch (e) {
    if (e instanceof AddressInUseError) {
      return { ok: false, messageKey: 'account.toast.addressInUse' }
    }
    return FORBIDDEN
  }
  revalidatePath('/account/addresses')
  return { ok: true, messageKey: 'account.toast.addressDeleted' }
}

export async function setDefaultBillingAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const editor = await requireEditor()
  if (!editor) return FORBIDDEN
  try {
    await customersService.setDefaultBilling(editor.orgId, String(fd.get('id') ?? ''))
  } catch {
    return FORBIDDEN
  }
  revalidatePath('/account/addresses')
  return { ok: true, messageKey: 'account.toast.addressDefaultSet' }
}

export async function setDefaultShippingAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const editor = await requireEditor()
  if (!editor) return FORBIDDEN
  try {
    await customersService.setDefaultShipping(editor.orgId, String(fd.get('id') ?? ''))
  } catch {
    return FORBIDDEN
  }
  revalidatePath('/account/addresses')
  return { ok: true, messageKey: 'account.toast.addressDefaultSet' }
}
