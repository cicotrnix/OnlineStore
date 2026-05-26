import { createInvoiceFromOrder } from '@/modules/accounts'
import { subscribe } from '@/modules/approvals'

/**
 * Hook ejecutado por approvals.decide() cuando un ApprovalRequest de subjectType=ORDER
 * cambia a APPROVED o REJECTED. Importar este archivo (idealmente desde
 * instrumentation.ts) garantiza que el hook está registrado al boot.
 *
 * APPROVED: Order PENDING_APPROVAL → CONFIRMED + Invoice si NET_TERMS
 * REJECTED: Order PENDING_APPROVAL → CANCELLED + restore stock
 */
subscribe('ORDER', async (req, tx) => {
  if (req.status === 'APPROVED') {
    await tx.order.update({
      where: { id: req.subjectId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    })
    const order = await tx.order.findUniqueOrThrow({ where: { id: req.subjectId } })
    if (order.paymentMethod === 'NET_TERMS') {
      await createInvoiceFromOrder(order.id, tx)
    }
  } else if (req.status === 'REJECTED') {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: req.subjectId },
      include: { lines: true },
    })
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByUserId: req.decidedById,
      },
    })
    for (const line of order.lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stockQuantity: { increment: line.quantity } },
      })
    }
  }
})
