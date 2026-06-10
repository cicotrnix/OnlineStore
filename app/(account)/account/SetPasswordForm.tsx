'use client'

import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { PasswordStrengthMeter } from '../../(auth)/sign-up/PasswordStrengthMeter'
import { requestSetPasswordStepUpAction, setPasswordAction } from './password-actions'

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
 * Set-password (magic-link-only users).
 *
 * Two-step:
 *  1. Click "Send verification code" → calls requestSetPasswordStepUpAction.
 *     The action emails the OTP and returns `vars.token`. We store the
 *     opaque token in component state.
 *  2. User enters OTP + new password + confirm → submits the regular form
 *     with token (hidden) + otp + newPassword to setPasswordAction.
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
        className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: 'var(--color-primary)' }}
      >
        {pending ? pendingLabel : requestStepUpLabel}
      </button>
    )
  }

  return (
    <form
      action={setFormAction}
      className="space-y-4"
      onSubmit={(e) => {
        if (mismatch) e.preventDefault()
      }}
    >
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="otp" className="block text-xs text-gray-500 mb-1">
          {otpLabel}
        </label>
        <input
          id="otp"
          name="otp"
          type="text"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
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
