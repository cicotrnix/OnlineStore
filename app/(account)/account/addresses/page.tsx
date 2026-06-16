import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { getLocale, t } from '@/lib/i18n'
import { customersService } from '@/modules/customers'
import { AddressesManager } from './AddressesManager'
import type { AddressView } from './types'

export const dynamic = 'force-dynamic'

export default async function AddressesPage() {
  const state = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: state.userId })
  const [role, raw] = await Promise.all([
    customersService.getMemberRole(state.orgId, state.userId),
    customersService.listAddresses(state.orgId),
  ])
  const canEdit = role === 'OWNER' || role === 'ADMIN'

  const addresses: AddressView[] = raw.map((a) => ({
    id: a.id,
    label: a.label,
    recipient: a.recipient,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country,
    phone: a.phone,
    isDefaultBilling: a.isDefaultBilling,
    isDefaultShipping: a.isDefaultShipping,
  }))

  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-950">{t(locale, 'account.nav.addresses')}</h2>
      <p className="mt-1 text-sm text-ink-500">{t(locale, 'account.addresses.subtitle')}</p>
      <div className="mt-5">
        <AddressesManager locale={locale} addresses={addresses} canEdit={canEdit} />
      </div>
    </section>
  )
}
