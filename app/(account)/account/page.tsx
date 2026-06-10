import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { ChangePasswordForm } from './ChangePasswordForm'
import { SetPasswordForm } from './SetPasswordForm'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const state = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: state.userId })
  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    select: { hashedPassword: true },
  })
  const hasPassword = Boolean(user?.hashedPassword)

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-medium">{t(locale, 'account.password.title')}</h2>
          {!hasPassword && (
            <p className="mt-1 text-xs text-gray-500">
              {t(locale, 'account.password.noPasswordYet')}
            </p>
          )}
        </CardHeader>
        <CardBody>
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
        </CardBody>
      </Card>
    </div>
  )
}
