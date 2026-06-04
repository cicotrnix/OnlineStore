import { Badge } from '@/components/ui/Badge'
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
  attributes?: unknown
}

function isTagOnFlex(attributes: unknown): boolean {
  if (!attributes || typeof attributes !== 'object') return false
  return (attributes as Record<string, unknown>).flex_included === 'tag-on'
}

type Props = {
  product: Product
  customerPrice?: Decimal | null
  currency: string
  canAddToCart: boolean
  disabledReason?: string
  /** Onboarding B2B: si false, oculta precio y muestra CTA "registrate para ver precios". */
  showPrice?: boolean
  signInLinkLabel?: string
  noImageLabel?: string
}

export function ProductCard({
  product,
  customerPrice,
  currency,
  canAddToCart,
  disabledReason,
  showPrice = true,
  signInLinkLabel = 'Sign in to see prices →',
  noImageLabel = 'No image',
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
          <span className="text-xs text-gray-400">{noImageLabel}</span>
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
          {isTagOnFlex(product.attributes) && (
            <div className="mt-1">
              <Badge variant="info">Tag-On Flex</Badge>
            </div>
          )}
        </div>
        {showPrice ? (
          <PriceTag
            basePrice={product.basePrice}
            customerPrice={customerPrice}
            currency={currency}
          />
        ) : (
          <Link href="/sign-in" className="text-sm text-blue-700 hover:underline">
            {signInLinkLabel}
          </Link>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <StockBadge stockQuantity={product.stockQuantity} />
          {showPrice && (
            <AddToCartButton
              productId={product.id}
              disabled={!canAddToCart || product.stockQuantity === 0}
              disabledReason={disabledReason}
            />
          )}
        </div>
      </CardBody>
    </Card>
  )
}
