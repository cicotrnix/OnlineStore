import { addToCartAction } from '@/app/(storefront)/_actions'
import { Button } from '@/components/ui/Button'

type Props = {
  productId: string
  disabled?: boolean
  disabledReason?: string
  defaultQuantity?: number
  showQuantity?: boolean
}

export function AddToCartButton({
  productId,
  disabled,
  disabledReason,
  defaultQuantity = 1,
  showQuantity = false,
}: Props) {
  return (
    <form action={addToCartAction} className="flex items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      {showQuantity && (
        <input
          name="quantity"
          type="number"
          min={1}
          defaultValue={defaultQuantity}
          className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center"
        />
      )}
      {!showQuantity && <input type="hidden" name="quantity" value={defaultQuantity} />}
      <Button
        type="submit"
        size="sm"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
      >
        {disabled ? 'No disponible' : 'Agregar'}
      </Button>
    </form>
  )
}
