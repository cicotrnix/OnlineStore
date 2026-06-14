import { addToCartAction } from '@/app/(storefront)/_actions'
import { SubmitButton } from '@/components/ui/SubmitButton'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { QuantityStepper } from './QuantityStepper'

type Props = {
  productId: string
  locale: Locale
  returnTo?: string
  disabled?: boolean
  disabledReason?: string
  defaultQuantity?: number
  showQuantity?: boolean
}

export function AddToCartButton({
  productId,
  locale,
  returnTo,
  disabled,
  disabledReason,
  defaultQuantity = 1,
  showQuantity = false,
}: Props) {
  return (
    <form action={addToCartAction} className="flex items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {showQuantity && (
        <QuantityStepper
          name="quantity"
          defaultValue={defaultQuantity}
          decrementLabel={t(locale, 'catalog.qtyDecrease')}
          incrementLabel={t(locale, 'catalog.qtyIncrease')}
        />
      )}
      {!showQuantity && <input type="hidden" name="quantity" value={defaultQuantity} />}
      {disabled ? (
        <button
          type="button"
          disabled
          title={disabledReason}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed"
        >
          {t(locale, 'product.unavailable')}
        </button>
      ) : (
        <SubmitButton
          size="sm"
          pendingLabel={t(locale, 'product.adding')}
          className="transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {t(locale, 'product.add')}
        </SubmitButton>
      )}
    </form>
  )
}
