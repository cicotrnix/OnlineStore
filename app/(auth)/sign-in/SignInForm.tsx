'use client'

import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, t } from '@/lib/i18n/messages'
import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { signInAction } from './actions'

type Props = {
  locale: Locale
  emailPlaceholder: string
  submitLabel: string
  pendingLabel: string
}

export function SignInForm({ locale, emailPlaceholder, submitLabel, pendingLabel }: Props) {
  const [state, formAction] = useFormState(signInAction, INITIAL_ACTION_RESULT)

  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as never, state.vars)
    if (state.ok) toast.success(msg)
    else toast.error(msg)
  }, [state, locale])

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <input
        name="email"
        type="email"
        required
        placeholder={emailPlaceholder}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <SubmitButton
        pendingLabel={pendingLabel}
        className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
        style={{ background: 'var(--color-primary)' }}
      >
        {submitLabel}
      </SubmitButton>
    </form>
  )
}
