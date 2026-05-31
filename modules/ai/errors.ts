export class AIDisabledError extends Error {
  constructor() {
    super('AI is not configured: missing ANTHROPIC_API_KEY')
    this.name = 'AIDisabledError'
  }
}

export class AIBudgetExceededError extends Error {
  constructor(periodYm: string) {
    super(`AI monthly token budget exceeded for ${periodYm}`)
    this.name = 'AIBudgetExceededError'
  }
}
