import { describe, expect, it } from 'vitest'
import { storeConfigSchema, themeConfigSchema } from './schemas'

function makeValidConfig() {
  return {
    identity: {
      name: 'Acme',
      logo: '/logo.svg',
      supportEmail: 'support@acme.com',
      brandVoice: undefined as { audience: string; tone: string; rules: string[] } | undefined,
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
}

const validStore = makeValidConfig()

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

  it('valida el bloque ai', () => {
    const cfg = makeValidConfig()
    cfg.ai = {
      model: 'claude-sonnet-4-6',
      contentModel: 'claude-sonnet-4-6',
      chatModel: 'claude-haiku-4-5-20251001',
      content: false,
      chat: false,
      recommendations: false,
    }
    expect(() => storeConfigSchema.parse(cfg)).not.toThrow()
  })

  it('rechaza config sin bloque ai', () => {
    const cfg = makeValidConfig()
    // @ts-expect-error: ai requerido
    cfg.ai = undefined
    expect(() => storeConfigSchema.parse(cfg)).toThrow()
  })

  it('valida identity.brandVoice cuando se provee', () => {
    const cfg = makeValidConfig()
    cfg.identity.brandVoice = {
      audience: 'iPhone repair shops in USA + LATAM',
      tone: 'technical, precise, no hype',
      rules: ['no emoji', 'no exclamations except CTA', 'metric units first'],
    }
    expect(() => storeConfigSchema.parse(cfg)).not.toThrow()
  })

  it('brandVoice es opcional', () => {
    const cfg = makeValidConfig()
    expect(cfg.identity.brandVoice).toBeUndefined()
    expect(() => storeConfigSchema.parse(cfg)).not.toThrow()
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
