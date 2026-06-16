import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { ProfileForm } from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const state = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: state.userId })
  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    select: { name: true, email: true, preferredLocale: true },
  })

  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-950">{t(locale, 'account.nav.profile')}</h2>
      <p className="mt-1 text-sm text-ink-500">{t(locale, 'account.profile.subtitle')}</p>
      <div className="mt-5">
        <ProfileForm
          locale={locale}
          name={user?.name ?? ''}
          email={user?.email ?? ''}
          preferredLocale={user?.preferredLocale ?? 'en-US'}
        />
      </div>
    </section>
  )
}
