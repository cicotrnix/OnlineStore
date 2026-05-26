export class FeatureDisabledError extends Error {
  code = 'FEATURE_DISABLED'
  constructor(message: string) {
    super(message)
    this.name = 'FeatureDisabledError'
  }
}

export class CreditExceededError extends Error {
  code = 'CREDIT_EXCEEDED'
  constructor(
    message: string,
    public readonly available: string
  ) {
    super(message)
    this.name = 'CreditExceededError'
  }
}

export class InvoicesOverdueError extends Error {
  code = 'INVOICES_OVERDUE'
  constructor(
    message: string,
    public readonly count: number
  ) {
    super(message)
    this.name = 'InvoicesOverdueError'
  }
}

export class ApprovalAlreadyDecidedError extends Error {
  code = 'APPROVAL_ALREADY_DECIDED'
  constructor(message: string) {
    super(message)
    this.name = 'ApprovalAlreadyDecidedError'
  }
}

export class QuoteExpiredError extends Error {
  code = 'QUOTE_EXPIRED'
  constructor(message: string) {
    super(message)
    this.name = 'QuoteExpiredError'
  }
}

export class CatalogAccessDeniedError extends Error {
  code = 'CATALOG_ACCESS_DENIED'
  constructor(message: string) {
    super(message)
    this.name = 'CatalogAccessDeniedError'
  }
}
