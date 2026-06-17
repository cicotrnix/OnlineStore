import { AuthField } from '@/app/(auth)/AuthField'
import { AdminPageHeader } from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { getLocale, t } from '@/lib/i18n'
import { customersService } from '@/modules/customers'
import { createOrganizationAction, inviteMemberAction } from './actions'

export default async function SettingsPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const orgs = await customersService.listForUser(user.id)

  return (
    <div className="max-w-2xl">
      <AdminPageHeader title={t(locale, 'admin.settings.title')} />

      <section className="rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'admin.settings.createOrg')}
        </h2>
        <form action={createOrganizationAction} className="mt-3 space-y-3">
          <AuthField
            name="name"
            label={t(locale, 'admin.customers.col.org')}
            required
            placeholder={t(locale, 'admin.settings.namePlaceholder')}
          />
          <AuthField
            name="slug"
            label={t(locale, 'admin.customers.col.slug')}
            required
            pattern="[a-z0-9-]+"
            placeholder={t(locale, 'admin.settings.slugPlaceholder')}
          />
          <SubmitButton variant="lime" pendingLabel={t(locale, 'admin.action.creating')}>
            {t(locale, 'admin.action.create')}
          </SubmitButton>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink-950">
          {t(locale, 'admin.settings.yourOrgs')}
        </h2>
        {orgs.length === 0 ? (
          <p className="text-sm text-ink-500">{t(locale, 'admin.settings.noOrgs')}</p>
        ) : (
          <ul className="space-y-4">
            {orgs.map((org) => (
              <li key={org.id} className="rounded-card border border-line p-4">
                <div className="flex items-baseline justify-between">
                  <strong className="text-sm text-ink-950">{org.name}</strong>
                  <span className="font-mono text-xs text-ink-500">{org.slug}</span>
                </div>
                <form action={inviteMemberAction} className="mt-3 flex items-end gap-2">
                  <input type="hidden" name="organizationId" value={org.id} />
                  <div className="flex-1">
                    <AuthField
                      name="email"
                      label={t(locale, 'account.overview.email')}
                      type="email"
                      required
                      placeholder={t(locale, 'admin.settings.invitePlaceholder')}
                    />
                  </div>
                  <SubmitButton variant="outline" pendingLabel={t(locale, 'admin.action.inviting')}>
                    {t(locale, 'admin.action.invite')}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-12 text-xs text-ink-500">
        {t(locale, 'admin.settings.signedInAs', { email: user.email ?? '' })}
      </p>
    </div>
  )
}
