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
      <h1 className="text-2xl font-medium">Settings</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-500">Create organization</h2>
        <form action={createOrganizationAction} className="mt-3 space-y-3">
          <input
            name="name"
            required
            placeholder="My Repair Shop Co"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            placeholder="acme-wholesale"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <SubmitButton pendingLabel={t(locale, 'admin.action.creating')}>
            {t(locale, 'admin.action.create')}
          </SubmitButton>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-gray-500">Your organizations</h2>
        {orgs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No organizations yet.</p>
        ) : (
          <ul className="mt-3 space-y-6">
            {orgs.map((org) => (
              <li key={org.id} className="border rounded-lg p-4">
                <div className="flex items-baseline justify-between">
                  <strong className="text-sm">{org.name}</strong>
                  <span className="text-xs text-gray-500">{org.slug}</span>
                </div>
                <form action={inviteMemberAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="organizationId" value={org.id} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="invitee@company.com"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <SubmitButton
                    variant="secondary"
                    pendingLabel={t(locale, 'admin.action.inviting')}
                  >
                    {t(locale, 'admin.action.invite')}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-12 text-xs text-gray-400">Signed in as {user.email}</p>
    </div>
  )
}
