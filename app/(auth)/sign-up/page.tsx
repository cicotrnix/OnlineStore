import { auth } from '@/lib/auth'
import { getLocale, t } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import { SignUpForm } from './SignUpForm'

export default async function SignUpPage() {
  const locale = await getLocale({ userId: null })
  const session = await auth()
  if (session?.user) redirect('/')

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
        {t(locale, 'auth.signUp.title')}
      </h1>
      <p className="mt-2 text-sm text-ink-500">{t(locale, 'auth.signUp.subtitle')}</p>
      <SignUpForm
        locale={locale}
        emailPlaceholder={t(locale, 'auth.signUp.emailPlaceholder')}
        passwordPlaceholder={t(locale, 'auth.signUp.passwordPlaceholder')}
        confirmPlaceholder={t(locale, 'auth.signUp.confirmPlaceholder')}
        submitLabel={t(locale, 'auth.signUp.submit')}
        pendingLabel={t(locale, 'auth.signUp.sending')}
        hasAccountLabel={t(locale, 'auth.signUp.hasAccount')}
        confirmHint={t(locale, 'auth.signUp.confirmHint')}
        resendLabel={t(locale, 'auth.signUp.resend')}
        mismatchLabel={t(locale, 'auth.signUp.passwordsDontMatch')}
        strengthWeak={t(locale, 'auth.signUp.strength.weak')}
        strengthMedium={t(locale, 'auth.signUp.strength.medium')}
        strengthStrong={t(locale, 'auth.signUp.strength.strong')}
      />
    </div>
  )
}
