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

export class SearchUnavailableError extends Error {
  code = 'SEARCH_UNAVAILABLE'
  constructor(
    message: string,
    public readonly reason?: string
  ) {
    super(message)
    this.name = 'SearchUnavailableError'
  }
}

export class EmbeddingFailedError extends Error {
  code = 'EMBEDDING_FAILED'
  constructor(
    message: string,
    public readonly retryable: boolean
  ) {
    super(message)
    this.name = 'EmbeddingFailedError'
  }
}

export class IndexQueueFullError extends Error {
  code = 'INDEX_QUEUE_FULL'
  constructor(message: string) {
    super(message)
    this.name = 'IndexQueueFullError'
  }
}

export class RateLimitExceededError extends Error {
  code = 'RATE_LIMIT_EXCEEDED'
  constructor(
    message: string,
    public readonly retryAfterSeconds: number
  ) {
    super(message)
    this.name = 'RateLimitExceededError'
  }
}
