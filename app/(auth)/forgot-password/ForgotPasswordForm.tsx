'use client'

import { AuthField } from '@/app/(auth)/AuthField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import Link from 'next/link'
import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { requestPasswordResetAction } from './actions'

type Props = {
  locale: Locale
  emailPlaceholder: string
  submitLabel: string
  pendingLabel: string
  backLabel: string
  checkInbox: string
}

export function ForgotPasswordForm({
  locale,
  emailPlaceholder,
  submitLabel,
  pendingLabel,
  backLabel,
  checkInbox,
}: Props) {
  const [state, formAction] = useFormState(requestPasswordResetAction, INITIAL_ACTION_RESULT)

  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as MessageKey, state.vars)
    if (state.ok) toast.success(msg)
    else toast.error(msg)
  }, [state, locale])

  // Respuesta neutra (anti-enumeración): tras enviar, mostramos siempre el
  // mismo mensaje de "revisá tu bandeja", exista o no la cuenta.
  if (state.ok) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-ink-700">{checkInbox}</p>
        <p className="text-center text-sm text-ink-500">
          <Link href="/sign-in" className="font-medium text-lime-deep hover:underline">
            {backLabel}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <>
      <form action={formAction} className="mt-6 space-y-4">
        <AuthField
          name="email"
          label={t(locale, 'auth.field.email')}
          type="email"
          required
          autoComplete="email"
          placeholder={emailPlaceholder}
        />
        <SubmitButton
          pendingLabel={pendingLabel}
          className="w-full rounded-button bg-accent px-3 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent/90"
        >
          {submitLabel}
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-ink-500">
        <Link href="/sign-in" className="font-medium text-lime-deep hover:underline">
          {backLabel}
        </Link>
      </p>
    </>
  )
}
