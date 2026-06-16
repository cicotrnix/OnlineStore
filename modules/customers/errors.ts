/** La dirección está referenciada por una o más órdenes → no se puede borrar. */
export class AddressInUseError extends Error {
  constructor() {
    super('Address is referenced by existing orders')
    this.name = 'AddressInUseError'
  }
}

/** La dirección no existe o no pertenece a la organización indicada. */
export class AddressNotFoundError extends Error {
  constructor() {
    super('Address not found in organization')
    this.name = 'AddressNotFoundError'
  }
}
