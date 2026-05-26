import { Badge } from '@/components/ui/Badge'
import { formatMoney } from '@/lib/money'
import type { Decimal } from '@prisma/client/runtime/library'

type Props = {
  basePrice: Decimal
  customerPrice?: Decimal | null
  currency: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
}

export function PriceTag({ basePrice, customerPrice, currency, size = 'md' }: Props) {
  const hasOverride = customerPrice && !customerPrice.equals(basePrice)
  const displayPrice = hasOverride ? customerPrice : basePrice

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`${sizeClasses[size]} font-semibold tabular-nums`}>
        {formatMoney(displayPrice, currency)}
      </span>
      {hasOverride && (
        <>
          <span className="text-xs text-gray-400 line-through tabular-nums">
            {formatMoney(basePrice, currency)}
          </span>
          <Badge variant="success">Tu precio</Badge>
        </>
      )}
    </div>
  )
}
