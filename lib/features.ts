import type { StoreConfig } from '@/modules/config'
import storeConfigDefault from '@/store.config'
import { FeatureDisabledError } from './errors'

export type FeatureName = keyof StoreConfig['modules']

export function isFeatureEnabled(
  name: FeatureName,
  config: StoreConfig = storeConfigDefault
): boolean {
  return Boolean(config.modules?.[name])
}

export function assertFeature(name: FeatureName, config: StoreConfig = storeConfigDefault): void {
  if (!isFeatureEnabled(name, config)) {
    throw new FeatureDisabledError(`Feature "${name}" is not enabled for this store`)
  }
}
