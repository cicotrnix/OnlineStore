import type { StoreConfig } from '@/modules/config'
import { getStoreConfig } from '@/stores'
import { FeatureDisabledError } from './errors'

export type FeatureName = keyof StoreConfig['modules']

export function isFeatureEnabled(name: FeatureName, config?: StoreConfig): boolean {
  const cfg = config ?? getStoreConfig()
  return Boolean(cfg.modules?.[name])
}

export function assertFeature(name: FeatureName, config?: StoreConfig): void {
  if (!isFeatureEnabled(name, config)) {
    throw new FeatureDisabledError(`Feature "${name}" is not enabled for this store`)
  }
}
