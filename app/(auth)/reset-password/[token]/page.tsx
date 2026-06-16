import { hashResetToken } from '@/lib/auth/password-reset'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import Link from 'next/link'
import { ResetPasswordForm } from './ResetPasswordForm'

type Props = {
  params: Promise<{ token: string }>
}

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params
  const locale = await getLocale({ userId: null })

  // Lookup de solo lectura para decidir qué pantalla mostrar. El consumo real
  // (atómico, anti-doble-uso) lo hace resetPasswordAction, no esta página.
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashResetToken(token) },
  })
  const valid = record && !record.usedAt && record.expiresAt > new Date()

  if (!valid) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
          {t(locale, 'auth.reset.invalidTitle')}
        </h1>
        <p className="mt-2 text-sm text-ink-500">{t(locale, 'auth.reset.invalidBody')}</p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block font-medium text-lime-deep hover:underline"
        >
          {t(locale, 'auth.reset.requestNew')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
        {t(locale, 'auth.reset.title')}
      </h1>
      <p className="mt-2 text-sm text-ink-500">{t(locale, 'auth.reset.subtitle')}</p>
      <ResetPasswordForm
        locale={locale}
        token={token}
        passwordPlaceholder={t(locale, 'auth.signUp.passwordPlaceholder')}
        confirmPlaceholder={t(locale, 'auth.signUp.confirmPlaceholder')}
        submitLabel={t(locale, 'auth.reset.submit')}
        pendingLabel={t(locale, 'auth.reset.sending')}
        mismatchLabel={t(locale, 'auth.signUp.passwordsDontMatch')}
        strengthWeak={t(locale, 'auth.signUp.strength.weak')}
        strengthMedium={t(locale, 'auth.signUp.strength.medium')}
        strengthStrong={t(locale, 'auth.signUp.strength.strong')}
      />
    </div>
  )
}
