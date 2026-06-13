/**
 * Pedido no encontrado o de otra org. Error NUEVO del módulo reorder (el módulo
 * orders no lo tiene). Authz: nadie re-pide el pedido de otra org.
 */
export class OrderNotFoundError extends Error {
  constructor(public orderId: string) {
    super(`Order ${orderId} not found or not accessible`)
    this.name = 'OrderNotFoundError'
  }
}
