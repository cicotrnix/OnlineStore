import { placeOrderAction } from '@/app/(storefront)/_actions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { auth } from '@/lib/auth/config'
import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { addMoney, formatMoney, multiplyMoney } from '@/lib/money'
import { cartService } from '@/modules/cart'
import { checkoutService } from '@/modules/checkout'
import { customersService } from '@/modules/customers'
import storeConfig from '@/store.config'
import { redirect } from 'next/navigation'

export default async function CheckoutPage() {
  const customer = await requireVerifiedCustomer()
  const user = { id: customer.userId }
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

  const hasBlockingIssue = review.issues.some((i) => i === 'inactive' || i === 'insufficient-stock')

  const subtotal = addMoney(
    ...cart.items.map((item) => multiplyMoney(item.unitPriceSnapshot, item.quantity))
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-medium tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-gray-500">
        Revisa tu pedido y confirma las direcciones para colocar la orden.
      </p>

      <form action={placeOrderAction} className="mt-8 space-y-6">
        {/* Step 1: Review */}
        <Card>
          <CardBody>
            <h2 className="font-medium">1. Revisar items</h2>
            <ul className="mt-4 divide-y divide-gray-100">
              {review.items.map((item) => (
                <li key={item.productId} className="py-3 flex justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      SKU {item.sku} · qty {item.quantity}
                    </div>
                    {item.issues.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.issues.map((iss) => (
                          <Badge key={iss} variant={iss === 'price-changed' ? 'warning' : 'danger'}>
                            {iss === 'inactive' && 'Inactivo'}
                            {iss === 'insufficient-stock' && `Stock ${item.availableStock}`}
                            {iss === 'price-changed' && `Precio cambió a ${item.currentPrice}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm tabular-nums text-right whitespace-nowrap">
                    {item.snapshotPrice} ×{item.quantity}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="font-medium tabular-nums">
                {formatMoney(subtotal, storeConfig.currency.base)}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Step 2: Addresses */}
        <Card>
          <CardBody>
            <h2 className="font-medium">2. Direcciones</h2>
            {addresses.length === 0 ? (
              <p className="mt-3 text-sm text-red-600">
                No hay direcciones registradas. Agrega una en{' '}
                <a href="/admin/customers" className="underline">
                  el panel admin
                </a>{' '}
                primero.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="billingAddressId"
                    className="block text-xs text-gray-500 uppercase tracking-wide"
                  >
                    Facturación
                  </label>
                  <select
                    id="billingAddressId"
                    name="billingAddressId"
                    defaultValue={billingDefault?.id ?? ''}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} · {a.city}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="shippingAddressId"
                    className="block text-xs text-gray-500 uppercase tracking-wide"
                  >
                    Envío
                  </label>
                  <select
                    id="shippingAddressId"
                    name="shippingAddressId"
                    defaultValue={shippingDefault?.id ?? ''}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
          </CardBody>
        </Card>

        {/* Step 3: PO + notes */}
        <Card>
          <CardBody>
            <h2 className="font-medium">3. PO y notas</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <label
                  htmlFor="poNumber"
                  className="block text-xs text-gray-500 uppercase tracking-wide"
                >
                  Número de PO (opcional)
                </label>
                <Input
                  id="poNumber"
                  name="poNumber"
                  maxLength={50}
                  placeholder="PO-2026-001"
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="notes"
                  className="block text-xs text-gray-500 uppercase tracking-wide"
                >
                  Notas (opcional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  maxLength={1000}
                  rows={3}
                  placeholder="Instrucciones especiales, ventanas de entrega, etc."
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Step 4: Confirm */}
        <Card>
          <CardBody>
            <h2 className="font-medium">4. Confirmar</h2>
            {hasBlockingIssue && (
              <p className="mt-3 text-sm text-red-600">
                No puedes colocar la orden hasta resolver los issues marcados arriba. Vuelve al
                carrito para ajustar.
              </p>
            )}
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-gray-500">
                Total:{' '}
                <span className="font-medium text-gray-900 tabular-nums">
                  {formatMoney(subtotal, storeConfig.currency.base)}
                </span>
              </div>
              <Button type="submit" size="lg" disabled={hasBlockingIssue || addresses.length === 0}>
                Colocar orden
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  )
}
