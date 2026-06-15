import { placeOrderAction } from '@/app/(storefront)/_actions'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { auth } from '@/lib/auth/config'
import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { getLocale, t } from '@/lib/i18n'
import { addMoney, formatMoney, multiplyMoney } from '@/lib/money'
import { cartService } from '@/modules/cart'
import { checkoutService, hasBlockingIssue } from '@/modules/checkout'
import { customersService } from '@/modules/customers'
import { getStoreConfig } from '@/stores'
import { redirect } from 'next/navigation'

export default async function CheckoutPage() {
  const customer = await requireVerifiedCustomer()
  const user = { id: customer.userId }
  const locale = await getLocale({ userId: customer.userId })
  const session = await auth()
  if (session?.impersonatingOrgId) {
    redirect('/cart')
  }
  const orgId = customer.orgId

  const cart = await cartService.get(user.id)
  if (cart.items.length === 0) redirect('/cart')

  const review = await checkoutService.review({ userId: user.id, orgId })
  const addresses = await customersService.listAddresses(orgId)

  const billingDefault = addresses.find((a) => a.isDefaultBilling) ?? addresses[0]
  const shippingDefault = addresses.find((a) => a.isDefaultShipping) ?? addresses[0]

  const blocked = hasBlockingIssue(review.issues)
  const canPlace = !blocked && addresses.length > 0
  const currency = getStoreConfig().currency.base
  const subtotal = addMoney(
    ...cart.items.map((item) => multiplyMoney(item.unitPriceSnapshot, item.quantity))
  )
  const totalFormatted = formatMoney(subtotal, currency)

  const section = 'rounded-2xl border border-gray-200 bg-white p-5'
  const heading = 'text-sm font-semibold uppercase tracking-wide text-gray-900'
  const fieldLabel = 'block text-xs uppercase tracking-wide text-gray-500'
  const selectCls = 'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'

  // Botón de colocar orden (reusado en el resumen desktop y la barra mobile).
  const placeOrderBtn = canPlace ? (
    <SubmitButton size="lg" pendingLabel={t(locale, 'checkout.placing')}>
      {t(locale, 'checkout.placeOrder')}
    </SubmitButton>
  ) : (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={blocked ? t(locale, 'checkout.blockingIssue') : t(locale, 'checkout.noAddresses')}
      className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-6 py-2.5 text-base text-gray-400"
    >
      {t(locale, 'checkout.placeOrder')}
    </button>
  )

  const summary = (
    <>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">{t(locale, 'checkout.total')}</span>
        <span className="font-semibold tabular-nums text-gray-900">{totalFormatted}</span>
      </div>
      <div className="mt-4">{placeOrderBtn}</div>
    </>
  )

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-28 lg:pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        {t(locale, 'checkout.title')}
      </h1>
      <p className="mt-1 text-sm text-gray-500">{t(locale, 'checkout.subtitle2')}</p>

      {/* Banner de issue bloqueante — prominente, role=alert (no badge perdido). */}
      {blocked && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {t(locale, 'checkout.blockingIssue')}
        </div>
      )}

      <form action={placeOrderAction} className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Step 1: Review */}
          <section className={section}>
            <h2 className={heading}>{t(locale, 'checkout.step1')}</h2>
            <ul className="mt-4 divide-y divide-gray-100">
              {review.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="font-mono text-xs text-gray-500">
                      {t(locale, 'checkout.skuLabel')} {item.sku} · {t(locale, 'checkout.qtyLabel')}{' '}
                      {item.quantity}
                    </div>
                    {item.issues.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.issues.map((iss) => (
                          <span
                            key={iss}
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                              iss === 'price-changed'
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-red-300 bg-red-50 text-red-700'
                            }`}
                          >
                            {iss === 'inactive' && t(locale, 'checkout.issue.inactive')}
                            {iss === 'insufficient-stock' &&
                              t(locale, 'checkout.issue.stock', { n: item.availableStock ?? 0 })}
                            {iss === 'price-changed' &&
                              t(locale, 'checkout.issue.priceChanged', {
                                price: String(item.currentPrice ?? ''),
                              })}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm tabular-nums text-gray-700">
                    {item.snapshotPrice} ×{item.quantity}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-gray-100 pt-4">
              <span className="text-sm text-gray-500">{t(locale, 'cart.subtotal')}</span>
              <span className="font-medium tabular-nums text-gray-900">{totalFormatted}</span>
            </div>
          </section>

          {/* Step 2: Addresses */}
          <section className={section}>
            <h2 className={heading}>{t(locale, 'checkout.step2')}</h2>
            {addresses.length === 0 ? (
              <p className="mt-3 text-sm text-red-600">{t(locale, 'checkout.noAddresses')}</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="billingAddressId" className={fieldLabel}>
                    {t(locale, 'checkout.billing')}
                  </label>
                  <select
                    id="billingAddressId"
                    name="billingAddressId"
                    defaultValue={billingDefault?.id ?? ''}
                    required
                    className={selectCls}
                  >
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} · {a.city}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="shippingAddressId" className={fieldLabel}>
                    {t(locale, 'checkout.shipping')}
                  </label>
                  <select
                    id="shippingAddressId"
                    name="shippingAddressId"
                    defaultValue={shippingDefault?.id ?? ''}
                    required
                    className={selectCls}
                  >
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} · {a.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* Step 3: PO + notes */}
          <section className={section}>
            <h2 className={heading}>{t(locale, 'checkout.step3')}</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <label htmlFor="poNumber" className={fieldLabel}>
                  {t(locale, 'checkout.poNumber')}
                </label>
                <Input
                  id="poNumber"
                  name="poNumber"
                  maxLength={50}
                  placeholder={t(locale, 'checkout.poPlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="notes" className={fieldLabel}>
                  {t(locale, 'checkout.notes')}
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  maxLength={1000}
                  rows={3}
                  placeholder={t(locale, 'checkout.notesPlaceholder')}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Resumen sticky (desktop). */}
        <aside className="hidden lg:block">
          <div className={`sticky top-4 ${section}`}>
            <h2 className={heading}>{t(locale, 'checkout.step4')}</h2>
            <div className="mt-4">{summary}</div>
          </div>
        </aside>

        {/* Barra sticky de acción (mobile) — total + colocar orden siempre a la vista. */}
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-gray-200 bg-white px-6 py-3 lg:hidden">
          {summary}
        </div>
      </form>
    </div>
  )
}
