'use client'

import { AuthField } from '@/app/(auth)/AuthField'
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
    <div className="mt-6 space-y-5">
      <form action={pwFormAction} className="space-y-4">
        <AuthField
          name="email"
          label={t(locale, 'auth.field.email')}
          type="email"
          required
          autoComplete="email"
          placeholder={emailPlaceholder}
        />
        <AuthField
          name="password"
          label={t(locale, 'auth.field.password')}
          type="password"
          required
          autoComplete="current-password"
          placeholder={passwordPlaceholder}
        />
        <SubmitButton
          pendingLabel={passwordPendingLabel}
          className="w-full rounded-button bg-accent px-3 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent/90"
        >
          {passwordSubmitLabel}
        </SubmitButton>
      </form>

      <div className="flex items-center justify-between text-sm">
        {/* Reset real (≠ magic link). */}
        <Link href="/forgot-password" className="font-medium text-lime-deep hover:underline">
          {forgotPasswordLabel}
        </Link>
        {/* Magic link passwordless. */}
        <button
          type="button"
          onClick={() => setShowLinkForm((v) => !v)}
          className="text-ink-500 hover:text-ink-950"
        >
          {preferEmailLinkLabel}
        </button>
      </div>

      {showLinkForm && (
        <form action={linkFormAction} className="space-y-3 border-t border-ink-100 pt-4">
          <AuthField
            name="email"
            label={t(locale, 'auth.field.email')}
            labelHidden
            type="email"
            required
            autoComplete="email"
            placeholder={emailPlaceholder}
          />
          <SubmitButton
            pendingLabel={pendingLabel}
            variant="secondary"
            className="w-full rounded-button"
          >
            {submitLabel}
          </SubmitButton>
        </form>
      )}

      <p className="text-center text-sm text-ink-500">
        <Link href="/sign-up" className="font-medium text-lime-deep hover:underline">
          {noAccountLabel}
        </Link>
      </p>
    </div>
  )
}
