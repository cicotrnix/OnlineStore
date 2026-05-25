import { type StoreConfig, type ThemeConfig, storeConfigSchema, themeConfigSchema } from './schemas'

/**
 * Validates and returns a store configuration.
 * Use in `store.config.ts` at the project root.
 */
export function defineStoreConfig(config: StoreConfig): StoreConfig {
  return storeConfigSchema.parse(config)
}

/**
 * Validates and returns a theme configuration.
 * Use in `theme.config.ts` at the project root.
 */
export function defineTheme(config: ThemeConfig): ThemeConfig {
  return themeConfigSchema.parse(config)
}
