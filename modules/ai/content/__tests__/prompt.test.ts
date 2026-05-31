import { describe, expect, it } from 'vitest'
import { buildContentPrompt } from '../prompt'

const brandVoice = {
  audience: 'iPhone repair pros',
  tone: 'technical, factual',
  rules: ['no emoji', 'metric units first'],
}

describe('buildContentPrompt', () => {
  it('incluye brandVoice + atributos + locale', () => {
    const p = buildContentPrompt({
      brandVoice,
      productName: 'Battery Pi-Power for iPhone 13',
      categoryName: 'Battery',
      attributes: { capacity_mah: 3279, voltage_v: '3.85' },
      locale: 'en-US',
    })
    expect(p).toContain('iPhone repair pros')
    expect(p).toContain('technical, factual')
    expect(p).toContain('no emoji')
    expect(p).toContain('3279')
    expect(p).toContain('Battery Pi-Power for iPhone 13')
    expect(p).toMatch(/en-US|English/)
  })

  it('omite atributos undefined/null/empty', () => {
    const p = buildContentPrompt({
      brandVoice,
      productName: 'X',
      categoryName: 'Y',
      attributes: { capacity_mah: 3279, voltage_v: undefined as never, cycles: '' },
      locale: 'en-US',
    })
    expect(p).toContain('capacity_mah')
    expect(p).not.toContain('voltage_v')
    expect(p).not.toContain('cycles:')
  })

  it('locale es-419 instruye salida en español', () => {
    const p = buildContentPrompt({
      brandVoice,
      productName: 'X',
      categoryName: 'Y',
      attributes: {},
      locale: 'es-419',
    })
    expect(p).toMatch(/es-419|Spanish|español/i)
  })

  it('nunca menciona el dominio "batería" hardcoded (dominio-como-datos)', () => {
    const p = buildContentPrompt({
      brandVoice,
      productName: 'Generic widget',
      categoryName: 'Widgets',
      attributes: {},
      locale: 'en-US',
    })
    expect(p.toLowerCase()).not.toContain('battery')
    expect(p.toLowerCase()).not.toContain('batería')
  })
})
