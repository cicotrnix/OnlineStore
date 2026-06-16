'use client'

import { changePasswordAction } from '@/app/(account)/account/password-actions'
import { AuthField } from '@/app/(auth)/AuthField'
import { PasswordStrengthMeter } from '@/app/(auth)/sign-up/PasswordStrengthMeter'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'

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
      className="max-w-md space-y-4"
      onSubmit={(e) => {
        if (mismatch) e.preventDefault()
      }}
    >
      <AuthField
        name="currentPassword"
        label={currentLabel}
        type="password"
        required
        autoComplete="current-password"
      />
      <div>
        <AuthField
          name="newPassword"
          label={newLabel}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <PasswordStrengthMeter
          password={newPassword}
          weakLabel={strengthWeak}
          mediumLabel={strengthMedium}
          strongLabel={strengthStrong}
        />
      </div>
      <AuthField
        name="confirmPassword"
        label={confirmLabel}
        type="password"
        required
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={mismatch ? mismatchLabel : undefined}
      />
      <SubmitButton
        pendingLabel={pendingLabel}
        className="rounded-button bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent/90"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  )
}
