import { addToQuoteDraftAction } from '@/app/(storefront)/quotes/_actions'
import { Button } from '@/components/ui/Button'
import { type Locale, t } from '@/lib/i18n'

type Props = {
  productId: string
  locale: Locale
  defaultQty?: number
  disabled?: boolean
}

export function AddToQuoteButton({ productId, locale, defaultQty = 1, disabled }: Props) {
  return (
    <form action={addToQuoteDraftAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="qty" value={defaultQty} />
      <Button type="submit" variant="secondary" size="sm" disabled={disabled}>
        {t(locale, 'pdp.requestQuote')}
      </Button>
    </form>
  )
}
