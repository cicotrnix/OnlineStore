import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { ChangePasswordForm } from './ChangePasswordForm'
import { SetPasswordForm } from './SetPasswordForm'
import { SignOutEverywhere } from './SignOutEverywhere'

export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
  const state = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: state.userId })
  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    select: { hashedPassword: true },
  })
  const hasPassword = Boolean(user?.hashedPassword)

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-ink-950">{t(locale, 'account.nav.security')}</h2>
        <p className="mt-1 text-sm text-ink-500">{t(locale, 'account.security.subtitle')}</p>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {t(locale, 'account.security.passwordSection')}
        </h3>
        {!hasPassword && (
          <p className="mt-1 text-xs text-ink-500">{t(locale, 'account.password.noPasswordYet')}</p>
        )}
        <div className="mt-3">
          {hasPassword ? (
            <ChangePasswordForm
              locale={locale}
              currentLabel={t(locale, 'account.password.currentLabel')}
              newLabel={t(locale, 'account.password.newLabel')}
              confirmLabel={t(locale, 'account.password.confirmLabel')}
              submitLabel={t(locale, 'account.password.submitChange')}
              pendingLabel={t(locale, 'admin.action.saving')}
              mismatchLabel={t(locale, 'auth.signUp.passwordsDontMatch')}
              strengthWeak={t(locale, 'auth.signUp.strength.weak')}
              strengthMedium={t(locale, 'auth.signUp.strength.medium')}
              strengthStrong={t(locale, 'auth.signUp.strength.strong')}
            />
          ) : (
            <SetPasswordForm
              locale={locale}
              newLabel={t(locale, 'account.password.newLabel')}
              confirmLabel={t(locale, 'account.password.confirmLabel')}
              otpLabel={t(locale, 'account.password.otpLabel')}
              requestStepUpLabel={t(locale, 'account.password.requestStepUp')}
              submitLabel={t(locale, 'account.password.submitSet')}
              pendingLabel={t(locale, 'admin.action.saving')}
              mismatchLabel={t(locale, 'auth.signUp.passwordsDontMatch')}
              strengthWeak={t(locale, 'auth.signUp.strength.weak')}
              strengthMedium={t(locale, 'auth.signUp.strength.medium')}
              strengthStrong={t(locale, 'auth.signUp.strength.strong')}
            />
          )}
        </div>
      </div>

      <div className="border-t border-line pt-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {t(locale, 'account.security.sessionsSection')}
        </h3>
        <p className="mt-1 max-w-md text-sm text-ink-500">
          {t(locale, 'account.security.signOutEverywhereHint')}
        </p>
        <div className="mt-3">
          <SignOutEverywhere locale={locale} />
        </div>
      </div>
    </section>
  )
}
