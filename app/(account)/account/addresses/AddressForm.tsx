'use client'

import { AuthField } from '@/app/(auth)/AuthField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { createAddressAction, updateAddressAction } from './actions'
import type { AddressView } from './types'

type Props = {
  locale: Locale
  address?: AddressView
  onDone: () => void
}

export function AddressForm({ locale, address, onDone }: Props) {
  const router = useRouter()
  const isEdit = Boolean(address)
  const [state, formAction] = useFormState(
    isEdit ? updateAddressAction : createAddressAction,
    INITIAL_ACTION_RESULT
  )

  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as MessageKey, state.vars)
    if (state.ok) {
      toast.success(msg)
      router.refresh()
      onDone()
    } else {
      toast.error(msg)
    }
  }, [state, locale, router, onDone])

  return (
    <form action={formAction} className="space-y-3 rounded-card border border-line p-4">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <AuthField
          name="label"
          label={t(locale, 'account.addresses.field.label')}
          defaultValue={address?.label}
          required
          maxLength={80}
        />
        <AuthField
          name="recipient"
          label={t(locale, 'account.addresses.field.recipient')}
          defaultValue={address?.recipient}
          required
          maxLength={200}
        />
      </div>
      <AuthField
        name="line1"
        label={t(locale, 'account.addresses.field.line1')}
        defaultValue={address?.line1}
        required
        maxLength={200}
      />
      <AuthField
        name="line2"
        label={t(locale, 'account.addresses.field.line2')}
        defaultValue={address?.line2 ?? ''}
        maxLength={200}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <AuthField
          name="city"
          label={t(locale, 'account.addresses.field.city')}
          defaultValue={address?.city}
          required
          maxLength={100}
        />
        <AuthField
          name="state"
          label={t(locale, 'account.addresses.field.state')}
          defaultValue={address?.state ?? ''}
          maxLength={100}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AuthField
          name="postalCode"
          label={t(locale, 'account.addresses.field.postalCode')}
          defaultValue={address?.postalCode}
          required
          maxLength={20}
        />
        <AuthField
          name="country"
          label={t(locale, 'account.addresses.field.country')}
          defaultValue={address?.country}
          required
          minLength={2}
          maxLength={2}
          className="uppercase"
        />
      </div>
      <AuthField
        name="phone"
        label={t(locale, 'account.addresses.field.phone')}
        defaultValue={address?.phone ?? ''}
        maxLength={30}
      />
      <div className="flex gap-2 pt-1">
        <SubmitButton
          pendingLabel={t(locale, 'admin.action.saving')}
          className="rounded-button bg-accent px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent/90"
        >
          {t(locale, 'account.addresses.save')}
        </SubmitButton>
        <button
          type="button"
          onClick={onDone}
          className="rounded-button border border-line px-4 py-2 text-sm text-ink-500 hover:text-ink-950"
        >
          {t(locale, 'account.addresses.cancel')}
        </button>
      </div>
    </form>
  )
}
