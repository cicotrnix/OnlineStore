import { auth } from '@/lib/auth'
import { getLocale, t } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export default async function ForgotPasswordPage() {
  const locale = await getLocale({ userId: null })
  const session = await auth()
  if (session?.user) redirect('/')

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
        {t(locale, 'auth.forgot.title')}
      </h1>
      <p className="mt-2 text-sm text-ink-500">{t(locale, 'auth.forgot.subtitle')}</p>
      <ForgotPasswordForm
        locale={locale}
        emailPlaceholder={t(locale, 'auth.signIn.emailPlaceholder')}
        submitLabel={t(locale, 'auth.forgot.submit')}
        pendingLabel={t(locale, 'auth.forgot.sending')}
        backLabel={t(locale, 'auth.forgot.backToSignIn')}
        checkInbox={t(locale, 'auth.forgot.checkInbox')}
      />
    </div>
  )
}
