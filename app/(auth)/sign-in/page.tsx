import { auth } from '@/lib/auth'
import { getLocale, t } from '@/lib/i18n'
import { getStoreConfig } from '@/stores'
import { redirect } from 'next/navigation'
import { SignInForm } from './SignInForm'

type Props = {
  searchParams: Promise<{ check?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams
  const checkInbox = params.check === 'email'
  const locale = await getLocale({ userId: null })

  if (!checkInbox) {
    const session = await auth()
    if (session?.user) redirect('/')
  }

  if (checkInbox) {
    return (
      <div>
        <h1 className="text-xl font-medium">{t(locale, 'auth.signIn.checkInbox.title')}</h1>
        <p className="mt-2 text-sm text-gray-600">{t(locale, 'auth.signIn.checkInbox.body')}</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-medium">
        {t(locale, 'auth.signIn.title', { brand: getStoreConfig().identity.name })}
      </h1>
      <p className="mt-2 text-sm text-gray-600">{t(locale, 'auth.signIn.subtitle')}</p>
      <SignInForm
        locale={locale}
        emailPlaceholder={t(locale, 'auth.signIn.emailPlaceholder')}
        submitLabel={t(locale, 'auth.signIn.submit')}
        pendingLabel={t(locale, 'auth.signIn.sending')}
        passwordPlaceholder={t(locale, 'auth.signIn.passwordPlaceholder')}
        passwordSubmitLabel={t(locale, 'auth.signIn.passwordSubmit')}
        passwordPendingLabel={t(locale, 'auth.signIn.passwordSending')}
        forgotPasswordLabel={t(locale, 'auth.signIn.forgotPassword')}
        preferEmailLinkLabel={t(locale, 'auth.signIn.preferEmailLink')}
        noAccountLabel={t(locale, 'auth.signIn.noAccount')}
      />
    </div>
  )
}
