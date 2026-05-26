import { Card, CardBody } from '@/components/ui/Card'
import type { Decimal } from '@prisma/client/runtime/library'
import Link from 'next/link'
import { AddToCartButton } from './AddToCartButton'
import { PriceTag } from './PriceTag'
import { StockBadge } from './StockBadge'

type Product = {
  id: string
  slug: string
  sku: string
  name: string
  imageUrl: string | null
  basePrice: Decimal
  stockQuantity: number
}

type Props = {
  product: Product
  customerPrice?: Decimal | null
  currency: string
  canAddToCart: boolean
  disabledReason?: string
}

export function ProductCard({
  product,
  customerPrice,
  currency,
  canAddToCart,
  disabledReason,
}: Props) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <Link
        href={`/products/${product.slug}`}
        className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden"
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-400">Sin imagen</span>
        )}
      </Link>
      <CardBody className="flex-1 flex flex-col gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">{product.sku}</div>
          <Link
            href={`/products/${product.slug}`}
            className="mt-1 block font-medium hover:underline line-clamp-2"
          >
            {product.name}
          </Link>
        </div>
        <PriceTag basePrice={product.basePrice} customerPrice={customerPrice} currency={currency} />
        <div className="flex items-center justify-between mt-auto pt-2">
          <StockBadge stockQuantity={product.stockQuantity} />
          <AddToCartButton
            productId={product.id}
            disabled={!canAddToCart || product.stockQuantity === 0}
            disabledReason={disabledReason}
          />
        </div>
      </CardBody>
    </Card>
  )
}
