import type { StoreConfig } from '@/modules/config'
import { describe, expect, it } from 'vitest'
import { FeatureDisabledError } from './errors'
import { assertFeature, isFeatureEnabled } from './features'

const baseModules: StoreConfig['modules'] = {
  rfq: false,
  credit: false,
  privateCatalogs: false,
  approvals: false,
  volumeDiscounts: false,
  semanticSearch: false,
}

function makeConfig(overrides: Partial<StoreConfig['modules']>): StoreConfig {
  return {
    identity: { name: 'X', logo: '/l.svg', supportEmail: 'a@b.com' },
    locale: { default: 'en-US', supported: ['en-US'] },
    currency: { base: 'USD' },
    modules: { ...baseModules, ...overrides },
    payments: { stripe: { enabled: false }, mercadopago: { enabled: false } },
    ui: { defaultView: 'cards', allowToggle: true },
    ai: {
      model: 'claude-sonnet-4-6',
      contentModel: 'claude-sonnet-4-6',
      chatModel: 'claude-haiku-4-5-20251001',
      content: false,
      chat: false,
      recommendations: false,
    },
  }
}

describe('isFeatureEnabled', () => {
  it('returns false for disabled feature', () => {
    expect(isFeatureEnabled('rfq', makeConfig({ rfq: false }))).toBe(false)
  })

  it('returns true for enabled feature', () => {
    expect(isFeatureEnabled('rfq', makeConfig({ rfq: true }))).toBe(true)
  })

  it('handles volumeDiscounts flag', () => {
    expect(isFeatureEnabled('volumeDiscounts', makeConfig({ volumeDiscounts: true }))).toBe(true)
    expect(isFeatureEnabled('volumeDiscounts', makeConfig({ volumeDiscounts: false }))).toBe(false)
  })
})

describe('assertFeature', () => {
  it('throws FeatureDisabledError if disabled', () => {
    expect(() => assertFeature('credit', makeConfig({ credit: false }))).toThrow(
      FeatureDisabledError
    )
  })

  it('does not throw if enabled', () => {
    expect(() => assertFeature('credit', makeConfig({ credit: true }))).not.toThrow()
  })

  it('error message mentions feature name', () => {
    expect(() => assertFeature('approvals', makeConfig({ approvals: false }))).toThrow(/approvals/)
  })
})
