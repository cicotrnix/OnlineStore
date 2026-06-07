import { removeCartItemAction, updateCartQuantityAction } from '@/app/(storefront)/_actions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { getLocale, t } from '@/lib/i18n'
import { addMoney, formatMoney, multiplyMoney } from '@/lib/money'
import { cartService } from '@/modules/cart'
import { getStoreConfig } from '@/stores'
import Link from 'next/link'

export default async function CartPage() {
  const customer = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: customer.userId })
  const cart = await cartService.get(customer.userId)

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-medium">{t(locale, 'cart.empty.title')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t(locale, 'cart.empty.body')}</p>
        <Link href="/catalog" className="mt-6 inline-block">
          <Button>{t(locale, 'cart.empty.goCatalog')}</Button>
        </Link>
      </div>
    )
  }

  const subtotal = addMoney(
    ...cart.items.map((item) => multiplyMoney(item.unitPriceSnapshot, item.quantity))
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-medium tracking-tight">{t(locale, 'cart.title')}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {cart.items.map((item) => (
            <Card key={item.id} className={item.product.isActive ? '' : 'opacity-60'}>
              <CardBody className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-gray-400">{t(locale, 'cart.noImage')}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-medium hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">
                        {t(locale, 'cart.skuLabel')} {item.product.sku}
                      </div>
                      {!item.product.isActive && (
                        <div className="mt-2">
                          <Badge variant="danger">{t(locale, 'cart.noLongerAvailable')}</Badge>
                        </div>
                      )}
                    </div>
                    <form action={removeCartItemAction}>
                      <input type="hidden" name="productId" value={item.product.id} />
                      <SubmitButton
                        variant="ghost"
                        size="sm"
                        confirmMessage={t(locale, 'cart.confirm.remove')}
                      >
                        {t(locale, 'cart.remove')}
                      </SubmitButton>
                    </form>
                  </div>
                  <div className="mt-3 flex items-end justify-between flex-wrap gap-3">
                    <form action={updateCartQuantityAction} className="flex items-center gap-2">
                      <input type="hidden" name="productId" value={item.product.id} />
                      <label className="text-xs text-gray-500" htmlFor={`q-${item.id}`}>
                        {t(locale, 'cart.quantity')}
                      </label>
                      <input
                        id={`q-${item.id}`}
                        name="quantity"
                        type="number"
                        min={0}
                        defaultValue={item.quantity}
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                      />
                      <SubmitButton
                        variant="secondary"
                        size="sm"
                        pendingLabel={t(locale, 'common.pending')}
                      >
                        {t(locale, 'cart.update')}
                      </SubmitButton>
                    </form>
                    <div className="text-sm text-gray-700 tabular-nums">
                      {formatMoney(item.unitPriceSnapshot, getStoreConfig().currency.base)} ·{' '}
                      <span className="font-medium">
                        {formatMoney(
                          item.unitPriceSnapshot.mul(item.quantity),
                          getStoreConfig().currency.base
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card className="h-fit sticky top-4">
          <CardBody>
            <h2 className="font-medium">{t(locale, 'cart.summary')}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">{t(locale, 'cart.subtotal')}</dt>
                <dd className="tabular-nums">
                  {formatMoney(subtotal, getStoreConfig().currency.base)}
                </dd>
              </div>
              <p className="text-[11px] text-gray-400 pt-1">{t(locale, 'cart.taxNote')}</p>
            </dl>
            <Link href="/checkout" className="mt-6 block">
              <Button className="w-full">
                {t(locale, 'cart.proceedCheckout', {
                  amount: formatMoney(subtotal, getStoreConfig().currency.base),
                })}
              </Button>
            </Link>
            <Link
              href="/catalog"
              className="mt-3 block text-center text-xs text-gray-500 hover:underline"
            >
              {t(locale, 'cart.continueShopping')}
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
