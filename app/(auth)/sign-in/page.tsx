import { auth, signIn } from '@/lib/auth'
import { getLocale, t } from '@/lib/i18n'
import storeConfig from '@/store.config'
import { redirect } from 'next/navigation'

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

  async function handleSignIn(formData: FormData) {
    'use server'
    await signIn('resend', { email: formData.get('email') as string })
  }

  return (
    <div>
      <h1 className="text-xl font-medium">
        {t(locale, 'auth.signIn.title', { brand: storeConfig.identity.name })}
      </h1>
      <p className="mt-2 text-sm text-gray-600">{t(locale, 'auth.signIn.subtitle')}</p>
      <form action={handleSignIn} className="mt-6 space-y-3">
        <input
          name="email"
          type="email"
          required
          placeholder={t(locale, 'auth.signIn.emailPlaceholder')}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          {t(locale, 'auth.signIn.submit')}
        </button>
      </form>
    </div>
  )
}
