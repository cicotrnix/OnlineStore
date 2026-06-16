'use client'

import { signOutEverywhereAction } from '@/app/(account)/account/password-actions'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useFormState } from 'react-dom'

export function SignOutEverywhere({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [state, formAction] = useFormState(signOutEverywhereAction, INITIAL_ACTION_RESULT)

  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as MessageKey, state.vars)
    if (state.ok) {
      toast.success(msg)
      router.refresh()
    } else {
      toast.error(msg)
    }
  }, [state, locale, router])

  return (
    <form action={formAction}>
      <SubmitButton
        pendingLabel={t(locale, 'admin.action.saving')}
        variant="secondary"
        className="rounded-button"
      >
        {t(locale, 'account.security.signOutEverywhere')}
      </SubmitButton>
    </form>
  )
}
