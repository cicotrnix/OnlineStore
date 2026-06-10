'use client'

import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { PasswordStrengthMeter } from '../../(auth)/sign-up/PasswordStrengthMeter'
import { changePasswordAction } from './password-actions'

type Props = {
  locale: Locale
  currentLabel: string
  newLabel: string
  confirmLabel: string
  submitLabel: string
  pendingLabel: string
  mismatchLabel: string
  strengthWeak: string
  strengthMedium: string
  strengthStrong: string
}

export function ChangePasswordForm({
  locale,
  currentLabel,
  newLabel,
  confirmLabel,
  submitLabel,
  pendingLabel,
  mismatchLabel,
  strengthWeak,
  strengthMedium,
  strengthStrong,
}: Props) {
  const [state, formAction] = useFormState(changePasswordAction, INITIAL_ACTION_RESULT)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as MessageKey, state.vars)
    if (state.ok) toast.success(msg)
    else toast.error(msg)
  }, [state, locale])

  const mismatch = confirm.length > 0 && newPassword !== confirm

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(e) => {
        if (mismatch) e.preventDefault()
      }}
    >
      <div>
        <label htmlFor="currentPassword" className="block text-xs text-gray-500 mb-1">
          {currentLabel}
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="block text-xs text-gray-500 mb-1">
          {newLabel}
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <PasswordStrengthMeter
          password={newPassword}
          weakLabel={strengthWeak}
          mediumLabel={strengthMedium}
          strongLabel={strengthStrong}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-xs text-gray-500 mb-1">
          {confirmLabel}
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {mismatch && <p className="mt-1 text-xs text-red-600">{mismatchLabel}</p>}
      </div>
      <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
    </form>
  )
}
