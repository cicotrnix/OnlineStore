import { getMiniCart } from '@/app/(storefront)/_mini-cart-actions'
import { CartEditor } from '@/components/commerce/CartEditor'
import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { getLocale, t } from '@/lib/i18n'

export default async function CartPage() {
  const customer = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: customer.userId })
  // Reusa el builder del mini-cart (snapshot pricing + formato). El gating ya lo
  // hizo requireVerifiedCustomer; el empty state lo renderiza CartEditor.
  const data = await getMiniCart()

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        {t(locale, 'cart.title')}
      </h1>
      <CartEditor initial={data} locale={locale} />
    </div>
  )
}
