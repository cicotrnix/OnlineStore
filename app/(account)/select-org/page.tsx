import { switchActiveOrg } from '@/lib/auth/actions'
import { requireAuth } from '@/lib/auth/helpers'
import { getLocale, t } from '@/lib/i18n'
import { customersService } from '@/modules/customers'
import { redirect } from 'next/navigation'

export default async function SelectOrgPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const orgs = await customersService.listForUser(user.id)

  // User logueado sin organizaciones → onboarding (no quedarse en estado
  // vacío sin acción). Compatible con ADR 0034: anónimos siguen navegando
  // el catálogo público; este flujo solo aplica a sesiones autenticadas.
  if (orgs.length === 0) {
    redirect('/onboarding')
  }

  if (orgs.length === 1 && orgs[0]) {
    await switchActiveOrg(orgs[0].id)
    redirect('/catalog')
  }

  async function chooseOrg(formData: FormData) {
    'use server'
    const orgId = String(formData.get('orgId'))
    await switchActiveOrg(orgId)
    redirect('/catalog')
  }

  return (
    <div className="mx-auto mt-20 max-w-md px-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink-950">
        {t(locale, 'selectOrg.title')}
      </h1>
      <p className="mt-1 text-sm text-ink-500">{t(locale, 'selectOrg.subtitle')}</p>
      <div className="mt-6 space-y-3">
        {orgs.map((org) => (
          <div
            key={org.id}
            className="flex items-center justify-between gap-3 rounded-card border border-line p-4"
          >
            <div>
              <div className="font-medium text-ink-950">{org.name}</div>
              <div className="font-mono text-xs text-ink-500">{org.slug}</div>
            </div>
            <form action={chooseOrg}>
              <input type="hidden" name="orgId" value={org.id} />
              <button
                type="submit"
                className="rounded-button bg-accent px-3 py-1.5 text-sm font-semibold text-ink-950 hover:bg-accent/90"
              >
                {t(locale, 'selectOrg.select')}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
