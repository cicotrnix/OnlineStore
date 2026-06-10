'use client'

import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { signInAction } from './actions'
import { passwordSignInAction } from './password-actions'

type Props = {
  locale: Locale
  emailPlaceholder: string
  submitLabel: string
  pendingLabel: string
  passwordPlaceholder: string
  passwordSubmitLabel: string
  passwordPendingLabel: string
  forgotPasswordLabel: string
  preferEmailLinkLabel: string
  noAccountLabel: string
}

export function SignInForm({
  locale,
  emailPlaceholder,
  submitLabel,
  pendingLabel,
  passwordPlaceholder,
  passwordSubmitLabel,
  passwordPendingLabel,
  forgotPasswordLabel,
  preferEmailLinkLabel,
  noAccountLabel,
}: Props) {
  const router = useRouter()
  const [pwState, pwFormAction] = useFormState(passwordSignInAction, INITIAL_ACTION_RESULT)
  const [linkState, linkFormAction] = useFormState(signInAction, INITIAL_ACTION_RESULT)
  const [showLinkForm, setShowLinkForm] = useState(false)

  useEffect(() => {
    if (!pwState.messageKey) return
    const msg = t(locale, pwState.messageKey as MessageKey, pwState.vars)
    if (pwState.ok) {
      toast.success(msg)
      router.push('/select-org')
    } else {
      toast.error(msg)
    }
  }, [pwState, locale, router])

  useEffect(() => {
    if (!linkState.messageKey) return
    const msg = t(locale, linkState.messageKey as MessageKey, linkState.vars)
    if (linkState.ok) toast.success(msg)
    else toast.error(msg)
  }, [linkState, locale])

  return (
    <div className="mt-6 space-y-6">
      <form action={pwFormAction} className="space-y-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={emailPlaceholder}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder={passwordPlaceholder}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <SubmitButton
          pendingLabel={passwordPendingLabel}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          {passwordSubmitLabel}
        </SubmitButton>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setShowLinkForm((v) => !v)}
          className="text-sm text-gray-700 hover:text-gray-900 underline"
        >
          {forgotPasswordLabel}
        </button>
      </div>

      {showLinkForm && (
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600">{preferEmailLinkLabel}</p>
          <form action={linkFormAction} className="mt-3 space-y-3">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={emailPlaceholder}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <SubmitButton
              pendingLabel={pendingLabel}
              variant="secondary"
              className="w-full rounded-lg px-3 py-2 text-sm font-medium"
            >
              {submitLabel}
            </SubmitButton>
          </form>
        </div>
      )}

      <p className="text-center text-sm">
        <Link href="/sign-up" className="text-gray-700 hover:text-gray-900 underline">
          {noAccountLabel}
        </Link>
      </p>
    </div>
  )
}
