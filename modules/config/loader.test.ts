import { describe, expect, it } from 'vitest'
import { defineStoreConfig } from './loader'

const validConfig = {
  identity: {
    name: 'Test',
    logo: '/logo.svg',
    supportEmail: 'a@b.com',
  },
  locale: { default: 'en-US', supported: ['en-US'] },
  currency: { base: 'USD' as const },
  modules: {
    rfq: false,
    credit: false,
    privateCatalogs: false,
    approvals: false,
    volumeDiscounts: false,
    semanticSearch: false,
  },
  payments: {
    stripe: { enabled: false },
    mercadopago: { enabled: false },
  },
  ui: { defaultView: 'cards' as const, allowToggle: true },
  ai: {
    model: 'claude-sonnet-4-6',
    contentModel: 'claude-sonnet-4-6',
    chatModel: 'claude-haiku-4-5-20251001',
    content: false,
    chat: false,
    recommendations: false,
  },
}

describe('defineStoreConfig', () => {
  it('returns the config when valid', () => {
    const r = defineStoreConfig(validConfig)
    expect(r.identity.name).toBe('Test')
  })

  it('throws with formatted error when identity.supportEmail is invalid', () => {
    expect(() =>
      defineStoreConfig({
        ...validConfig,
        identity: { ...validConfig.identity, supportEmail: 'not-an-email' },
      })
    ).toThrowError(/Invalid store\.config\.ts/)
  })

  it('throws when a feature flag is wrong type', () => {
    expect(() =>
      defineStoreConfig({
        ...validConfig,
        // biome-ignore lint/suspicious/noExplicitAny: intentional invalid input for test
        modules: { ...validConfig.modules, rfq: 'yes' as any },
      })
    ).toThrowError(/Invalid store\.config\.ts/)
  })

  it('throws when identity.name is empty', () => {
    expect(() =>
      defineStoreConfig({
        ...validConfig,
        identity: { ...validConfig.identity, name: '' },
      })
    ).toThrowError(/Invalid store\.config\.ts/)
  })
})
