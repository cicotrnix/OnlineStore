'use client'

import { AuthField } from '@/app/(auth)/AuthField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { PasswordStrengthMeter } from '../../sign-up/PasswordStrengthMeter'
import { resetPasswordAction } from './actions'

type Props = {
  locale: Locale
  token: string
  passwordPlaceholder: string
  confirmPlaceholder: string
  submitLabel: string
  pendingLabel: string
  mismatchLabel: string
  strengthWeak: string
  strengthMedium: string
  strengthStrong: string
}

export function ResetPasswordForm({
  locale,
  token,
  passwordPlaceholder,
  confirmPlaceholder,
  submitLabel,
  pendingLabel,
  mismatchLabel,
  strengthWeak,
  strengthMedium,
  strengthStrong,
}: Props) {
  const router = useRouter()
  const [state, formAction] = useFormState(resetPasswordAction, INITIAL_ACTION_RESULT)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as MessageKey, state.vars)
    if (state.ok) {
      toast.success(msg)
      router.push('/select-org')
    } else {
      toast.error(msg)
    }
  }, [state, locale, router])

  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        if (mismatch) e.preventDefault()
      }}
    >
      <input type="hidden" name="token" value={token} />
      <div>
        <AuthField
          name="newPassword"
          label={t(locale, 'auth.field.newPassword')}
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          placeholder={passwordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrengthMeter
          password={password}
          weakLabel={strengthWeak}
          mediumLabel={strengthMedium}
          strongLabel={strengthStrong}
        />
      </div>
      <AuthField
        name="confirmPassword"
        label={t(locale, 'auth.field.confirmPassword')}
        type="password"
        required
        autoComplete="new-password"
        placeholder={confirmPlaceholder}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={mismatch ? mismatchLabel : undefined}
      />
      <SubmitButton
        pendingLabel={pendingLabel}
        className="w-full rounded-button bg-accent px-3 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent/90"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  )
}
