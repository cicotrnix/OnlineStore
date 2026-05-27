import { ZodError } from 'zod'
import { type StoreConfig, type ThemeConfig, storeConfigSchema, themeConfigSchema } from './schemas'

function formatZodError(err: ZodError, source: string): string {
  const issues = err.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
  return `Invalid ${source}:\n${issues}`
}

/**
 * Validates and returns a store configuration. Throws at boot with a formatted
 * error if any field is invalid (catches typos in feature flags, wrong types).
 * Use in `store.config.ts` at the project root.
 */
export function defineStoreConfig(config: StoreConfig): StoreConfig {
  try {
    return storeConfigSchema.parse(config)
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(formatZodError(err, 'store.config.ts'))
    }
    throw err
  }
}

/**
 * Validates and returns a theme configuration. Throws at boot with a formatted
 * error if any field is invalid.
 * Use in `theme.config.ts` at the project root.
 */
export function defineTheme(config: ThemeConfig): ThemeConfig {
  try {
    return themeConfigSchema.parse(config)
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(formatZodError(err, 'theme.config.ts'))
    }
    throw err
  }
}
