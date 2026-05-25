import { describe, expect, it } from 'vitest'
import { storeConfigSchema, themeConfigSchema } from './schemas'

const validStore = {
  identity: { name: 'Acme', logo: '/logo.svg', supportEmail: 'support@acme.com' },
  locale: { default: 'en-US', supported: ['en-US'] },
  currency: { base: 'USD' as const },
  modules: {
    rfq: false,
    credit: false,
    privateCatalogs: false,
    approvals: false,
    semanticSearch: false,
    aiChat: false,
  },
  payments: {
    stripe: { enabled: false },
    mercadopago: { enabled: false },
  },
  ui: { defaultView: 'cards' as const, allowToggle: true },
}

const validTheme = {
  colors: {
    primary: '#0F6E56',
    accent: '#534AB7',
    surface: '#FFFFFF',
    muted: '#F1EFE8',
    danger: '#A32D2D',
  },
  typography: { sans: 'Inter', scale: 'comfortable' as const },
  radius: { card: 12, button: 8, input: 8 },
  density: 'regular' as const,
}

describe('storeConfigSchema', () => {
  it('accepts minimal valid config', () => {
    const result = storeConfigSchema.parse(validStore)
    expect(result.identity.name).toBe('Acme')
  })

  it('rejects invalid currency code', () => {
    expect(() => storeConfigSchema.parse({ ...validStore, currency: { base: 'XYZ' } })).toThrow()
  })

  it('rejects unsupported defaultView', () => {
    expect(() =>
      storeConfigSchema.parse({
        ...validStore,
        ui: { defaultView: 'grid', allowToggle: true },
      })
    ).toThrow()
  })

  it('rejects empty identity name', () => {
    expect(() =>
      storeConfigSchema.parse({
        ...validStore,
        identity: { ...validStore.identity, name: '' },
      })
    ).toThrow()
  })

  it('rejects invalid supportEmail', () => {
    expect(() =>
      storeConfigSchema.parse({
        ...validStore,
        identity: { ...validStore.identity, supportEmail: 'not-an-email' },
      })
    ).toThrow()
  })
})

describe('themeConfigSchema', () => {
  it('accepts a valid theme', () => {
    const result = themeConfigSchema.parse(validTheme)
    expect(result.colors.primary).toBe('#0F6E56')
  })

  it('rejects an invalid hex color', () => {
    expect(() =>
      themeConfigSchema.parse({
        ...validTheme,
        colors: { ...validTheme.colors, primary: 'not-a-hex' },
      })
    ).toThrow()
  })

  it('rejects negative radius', () => {
    expect(() =>
      themeConfigSchema.parse({
        ...validTheme,
        radius: { ...validTheme.radius, card: -1 },
      })
    ).toThrow()
  })

  it('rejects unsupported density', () => {
    expect(() => themeConfigSchema.parse({ ...validTheme, density: 'huge' })).toThrow()
  })
})
