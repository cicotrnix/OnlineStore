import { prisma } from '@/lib/db/client'
import { cartService } from '@/modules/cart'
import { filterForOrg } from '@/modules/catalog'
import { OrderNotFoundError } from './errors'

export type ReorderInput = { orderId: string; userId: string; orgId: string }
export type SkipReason = 'inactive' | 'no_access' | 'out_of_stock'
export type AddedLine = { productId: string; name: string; requestedQty: number; addedQty: number }
export type SkippedLine = { productId: string; name: string; reason: SkipReason }
export type ReorderResult = { added: AddedLine[]; skipped: SkippedLine[] }

export const reorderService = {
  /**
   * Re-pide un pedido pasado: agrega sus líneas viables al carrito actual con el
   * precio de hoy (vía cartService.addItem, que re-snapshotea y aplica el gate de
   * verificación), y omite con motivo lo no viable. No crea pedidos ni reemplaza
   * el carrito: el comprador revisa en /cart.
   */
  async reorderToCart(input: ReorderInput): Promise<ReorderResult> {
    const { orderId, userId, orgId } = input

    // 1. Authz: el pedido debe existir y pertenecer a esta org.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    })
    if (!order || order.organizationId !== orgId) throw new OrderNotFoundError(orderId)

    // 2. Estado actual de los productos del pedido + acceso de la org (catalog).
    const productIds = order.lines.map((l) => l.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: { select: { id: true, isPrivate: true } } },
    })
    const byId = new Map(products.map((p) => [p.id, p]))
    const accessible = await filterForOrg(orgId, products)
    const accessibleIds = new Set(accessible.map((p) => p.id))

    const added: AddedLine[] = []
    const skipped: SkippedLine[] = []

    // 3. Evaluar cada línea en orden: inactivo → sin acceso → sin stock → parcial → completo.
    for (const line of order.lines) {
      const p = byId.get(line.productId)
      const name = p?.name ?? line.name
      if (!p || !p.isActive) {
        skipped.push({ productId: line.productId, name, reason: 'inactive' })
        continue
      }
      if (!accessibleIds.has(p.id)) {
        skipped.push({ productId: line.productId, name, reason: 'no_access' })
        continue
      }
      if (p.stockQuantity <= 0) {
        skipped.push({ productId: line.productId, name, reason: 'out_of_stock' })
        continue
      }
      const addedQty = Math.min(line.quantity, p.stockQuantity)
      try {
        await cartService.addItem({ userId, productId: p.id, quantity: addedQty, orgId })
        added.push({ productId: p.id, name, requestedQty: line.quantity, addedQty })
      } catch (err) {
        // ORG_NOT_VERIFIED es un gate global (no por línea) → propagar para que el
        // server action lo mapee al mensaje de verificación.
        if (err instanceof Error && err.message === 'ORG_NOT_VERIFIED') throw err
        // Otra falla (p.ej. carrera de stock) → línea omitida; el resto continúa.
        skipped.push({ productId: p.id, name, reason: 'out_of_stock' })
      }
    }

    return { added, skipped }
  },
}
