export class InsufficientStockError extends Error {
  constructor(
    public productId: string,
    public available: number,
    public requested: number
  ) {
    super(
      `Insufficient stock for product ${productId}: available ${available}, requested ${requested}`
    )
    this.name = 'InsufficientStockError'
  }
}

export class ProductInactiveError extends Error {
  constructor(public productId: string) {
    super(`Product ${productId} is no longer active`)
    this.name = 'ProductInactiveError'
  }
}

export class EmptyCartError extends Error {
  constructor() {
    super('Cart is empty')
    this.name = 'EmptyCartError'
  }
}
