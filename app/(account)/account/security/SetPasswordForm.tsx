'use client'

import {
  requestSetPasswordStepUpAction,
  setPasswordAction,
} from '@/app/(account)/account/password-actions'
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
  newLabel: string
  confirmLabel: string
  otpLabel: string
  requestStepUpLabel: string
  submitLabel: string
  pendingLabel: string
  mismatchLabel: string
  strengthWeak: string
  strengthMedium: string
  strengthStrong: string
}

/**
 * Set-password (usuarios magic-link-only). Two-step con step-up OTP:
 *  1. "Send verification code" → requestSetPasswordStepUpAction (emite OTP +
 *     devuelve token opaco que guardamos en estado).
 *  2. OTP + nueva contraseña + confirm → setPasswordAction. Lógica intacta;
 *     solo restilado con AuthField.
 */
export function SetPasswordForm({
  locale,
  newLabel,
  confirmLabel,
  otpLabel,
  requestStepUpLabel,
  submitLabel,
  pendingLabel,
  mismatchLabel,
  strengthWeak,
  strengthMedium,
  strengthStrong,
}: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [setState, setFormAction] = useFormState(setPasswordAction, INITIAL_ACTION_RESULT)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    if (!setState.messageKey) return
    const msg = t(locale, setState.messageKey as MessageKey, setState.vars)
    if (setState.ok) toast.success(msg)
    else toast.error(msg)
  }, [setState, locale])

  async function handleRequestStepUp() {
    setPending(true)
    try {
      const result = await requestSetPasswordStepUpAction()
      const msg = result.messageKey ? t(locale, result.messageKey as MessageKey, result.vars) : ''
      if (result.ok) {
        toast.success(msg)
        const tok = result.vars?.token
        if (typeof tok === 'string') setToken(tok)
      } else {
        toast.error(msg)
      }
    } finally {
      setPending(false)
    }
  }

  const mismatch = confirm.length > 0 && newPassword !== confirm

  if (!token) {
    return (
      <button
        type="button"
        onClick={handleRequestStepUp}
        disabled={pending}
        className="rounded-button bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent/90 disabled:opacity-50"
      >
        {pending ? pendingLabel : requestStepUpLabel}
      </button>
    )
  }

  return (
    <form
      action={setFormAction}
      className="max-w-md space-y-4"
      onSubmit={(e) => {
        if (mismatch) e.preventDefault()
      }}
    >
      <input type="hidden" name="token" value={token} />
      <AuthField
        name="otp"
        label={otpLabel}
        type="text"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
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
