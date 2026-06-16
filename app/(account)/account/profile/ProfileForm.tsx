'use client'

import { AuthField } from '@/app/(auth)/AuthField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { updateProfileAction } from './actions'

type Props = {
  locale: Locale
  name: string
  email: string
  preferredLocale: string
}

export function ProfileForm({ locale, name, email, preferredLocale }: Props) {
  const router = useRouter()
  const [state, formAction] = useFormState(updateProfileAction, INITIAL_ACTION_RESULT)

  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as MessageKey, state.vars)
    if (state.ok) {
      toast.success(msg)
      // Si cambió el idioma, re-renderiza el server tree con el nuevo locale.
      router.refresh()
    } else {
      toast.error(msg)
    }
  }, [state, locale, router])

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <AuthField
        name="name"
        label={t(locale, 'account.overview.name')}
        defaultValue={name}
        required
        maxLength={100}
        autoComplete="name"
      />
      <div>
        <label
          htmlFor="profile-locale"
          className="block text-xs font-medium uppercase tracking-wide text-ink-500"
        >
          {t(locale, 'account.overview.locale')}
        </label>
        <select
          id="profile-locale"
          name="locale"
          defaultValue={preferredLocale}
          className="mt-1 w-full rounded-button border border-ink-100 bg-surface px-3 py-2.5 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="en-US">{t(locale, 'account.locale.en')}</option>
          <option value="es-419">{t(locale, 'account.locale.es')}</option>
        </select>
      </div>
      <div>
        <span className="block text-xs font-medium uppercase tracking-wide text-ink-500">
          {t(locale, 'account.overview.email')}
        </span>
        <p className="mt-1 text-sm text-ink-950">{email}</p>
        <p className="mt-1 text-xs text-ink-500">{t(locale, 'account.profile.emailHint')}</p>
      </div>
      <SubmitButton
        pendingLabel={t(locale, 'admin.action.saving')}
        className="rounded-button bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent/90"
      >
        {t(locale, 'account.profile.submit')}
      </SubmitButton>
    </form>
  )
}
