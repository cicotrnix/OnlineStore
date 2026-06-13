import type { StoreConfig, ThemeConfig } from '@/modules/config'
import demoConfig from './demo/store.config'
import demoTheme from './demo/theme.config'
import pipowerConfig from './pipower/store.config'
import pipowerTheme from './pipower/theme.config'

export interface StoreEntry {
  config: StoreConfig
  theme: ThemeConfig
}

/** Registry real: imports estáticos — todas las configs viajan en el bundle (data, sin secretos). */
export const STORE_REGISTRY: Record<string, StoreEntry> = {
  pipower: { config: pipowerConfig, theme: pipowerTheme },
  demo: { config: demoConfig, theme: demoTheme },
}

const DEFAULT_STORE_ID = 'pipower'

let registry: Record<string, StoreEntry> = STORE_REGISTRY
let cached: StoreEntry | null = null

/**
 * Resuelve la tienda activa por STORE_ID y cachea (asunción Modelo A:
 * 1 proceso = 1 tienda). Producción: STORE_ID obligatorio. Dev/test:
 * default pipower. '' se trata como ausente. Fail-fast, sin fallback
 * silencioso a otra tienda en prod.
 */
function resolveEntry(): StoreEntry {
  if (cached) return cached
  const raw = process.env.STORE_ID
  const explicit = raw && raw.length > 0 ? raw : null
  const id = explicit ?? (process.env.NODE_ENV === 'production' ? null : DEFAULT_STORE_ID)
  if (!id) {
    throw new Error(
      `STORE_ID es obligatorio en producción. Tiendas conocidas: ${Object.keys(registry).join(', ')}`
    )
  }
  const entry = registry[id]
  if (!entry) {
    throw new Error(
      `STORE_ID desconocido "${id}". Tiendas conocidas: ${Object.keys(registry).join(', ')}`
    )
  }
  cached = entry
  return entry
}

export function getStoreConfig(): StoreConfig {
  const config = resolveEntry().config
  // Override para staging/e2e: habilita Stripe sin editar la store config (p.ej.
  // el e2e de compra con FakeStripe). En producción, si STRIPE_ENABLED=true sin
  // claves, el fail-fast de getStripeClient (ADR 0038) lanza igual.
  if (process.env.STRIPE_ENABLED === 'true' && !config.payments.stripe.enabled) {
    return {
      ...config,
      payments: {
        ...config.payments,
        stripe: { ...config.payments.stripe, enabled: true },
      },
    }
  }
  return config
}

export function getStoreTheme(): ThemeConfig {
  return resolveEntry().theme
}

/**
 * Solo para tests: reemplaza el registry e INVALIDA el cache.
 * `null` restaura el registry real. Resetear en afterEach
 * (mismo contrato que _setStorageClient en lib/storage).
 */
export function _setRegistry(next: Record<string, StoreEntry> | null): void {
  registry = next ?? STORE_REGISTRY
  cached = null
}
