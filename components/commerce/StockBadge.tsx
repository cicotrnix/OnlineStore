import { Badge } from '@/components/ui/Badge'

export function StockBadge({ stockQuantity }: { stockQuantity: number }) {
  if (stockQuantity === 0) return <Badge variant="danger">Agotado</Badge>
  if (stockQuantity < 10) return <Badge variant="warning">Bajo stock · {stockQuantity}</Badge>
  return <Badge variant="success">En stock · {stockQuantity}</Badge>
}
