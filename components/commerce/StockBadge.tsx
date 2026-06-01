import { Badge } from '@/components/ui/Badge'

export function StockBadge({ stockQuantity }: { stockQuantity: number }) {
  // No mostrar cantidad — solo estado binario. Decisión de negocio (PiPower).
  if (stockQuantity === 0) {
    return <Badge variant="danger">Out of stock</Badge>
  }
  return <Badge variant="success">En stock</Badge>
}
