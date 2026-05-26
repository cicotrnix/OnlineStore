import { addToQuoteDraftAction } from '@/app/(storefront)/quotes/_actions'
import { Button } from '@/components/ui/Button'

type Props = {
  productId: string
  defaultQty?: number
  disabled?: boolean
}

export function AddToQuoteButton({ productId, defaultQty = 1, disabled }: Props) {
  return (
    <form action={addToQuoteDraftAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="qty" value={defaultQty} />
      <Button type="submit" variant="secondary" size="sm" disabled={disabled}>
        Solicitar cotización
      </Button>
    </form>
  )
}
