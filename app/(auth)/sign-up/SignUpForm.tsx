'use client'

import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { signInAction } from '../sign-in/actions'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { signUpAction } from './actions'

type Props = {
  locale: Locale
  emailPlaceholder: string
  passwordPlaceholder: string
  confirmPlaceholder: string
  submitLabel: string
  pendingLabel: string
  hasAccountLabel: string
  confirmHint: string
  resendLabel: string
  mismatchLabel: string
  strengthWeak: string
  strengthMedium: string
  strengthStrong: string
}

export function SignUpForm({
  locale,
  emailPlaceholder,
  passwordPlaceholder,
  confirmPlaceholder,
  submitLabel,
  pendingLabel,
  hasAccountLabel,
  confirmHint,
  resendLabel,
  mismatchLabel,
  strengthWeak,
  strengthMedium,
  strengthStrong,
}: Props) {
  const [state, formAction] = useFormState(signUpAction, INITIAL_ACTION_RESULT)
  const [resendState, resendAction] = useFormState(signInAction, INITIAL_ACTION_RESULT)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as MessageKey, state.vars)
    if (state.ok) toast.success(msg)
    else toast.error(msg)
  }, [state, locale])

  useEffect(() => {
    if (!resendState.messageKey) return
    const msg = t(locale, resendState.messageKey as MessageKey, resendState.vars)
    if (resendState.ok) toast.success(msg)
    else toast.error(msg)
  }, [resendState, locale])

  const mismatch = confirm.length > 0 && password !== confirm

  if (state.ok) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-gray-700">{confirmHint}</p>
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <SubmitButton
            pendingLabel={t(locale, 'auth.signIn.sending')}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {resendLabel}
          </SubmitButton>
        </form>
        <p className="text-center text-sm">
          <Link href="/sign-in" className="text-gray-700 hover:text-gray-900 underline">
            {hasAccountLabel}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <>
      <form
        action={formAction}
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          if (mismatch) e.preventDefault()
        }}
      >
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <div>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder={passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <PasswordStrengthMeter
            password={password}
            weakLabel={strengthWeak}
            mediumLabel={strengthMedium}
            strongLabel={strengthStrong}
          />
        </div>
        <div>
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder={confirmPlaceholder}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          {mismatch && <p className="mt-1 text-xs text-red-600">{mismatchLabel}</p>}
        </div>
        <SubmitButton
          pendingLabel={pendingLabel}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitLabel}
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/sign-in" className="text-gray-700 hover:text-gray-900 underline">
          {hasAccountLabel}
        </Link>
      </p>
    </>
  )
}
