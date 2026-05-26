export class FeatureDisabledError extends Error {
  code = 'FEATURE_DISABLED'
  constructor(message: string) {
    super(message)
    this.name = 'FeatureDisabledError'
  }
}
