export class PaymentMismatchError extends Error {
  code = 'PAYMENT_MISMATCH'
  constructor(message: string) {
    super(message)
    this.name = 'PaymentMismatchError'
  }
}

export class PaymentWebhookInvalidError extends Error {
  code = 'PAYMENT_WEBHOOK_INVALID'
  constructor(message: string) {
    super(message)
    this.name = 'PaymentWebhookInvalidError'
  }
}
