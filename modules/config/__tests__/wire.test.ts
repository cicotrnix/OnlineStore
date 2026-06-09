import { wireInstructionsReady } from '@/modules/config'
import type { StoreConfig } from '@/modules/config'
import { describe, expect, it } from 'vitest'

function makeCfg(wire?: Partial<NonNullable<StoreConfig['payments']['wire']>>): StoreConfig {
  return {
    identity: { name: 'X', logo: '/x.png', supportEmail: 'a@b.com' },
    locale: { default: 'en-US', supported: ['en-US'] },
    currency: { base: 'USD' },
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
      ...(wire ? { wire: { enabled: false, ...wire } as never } : {}),
    },
    ui: { defaultView: 'cards', allowToggle: true },
    ai: {
      model: 'x',
      contentModel: 'x',
      chatModel: 'x',
      content: false,
      chat: false,
      recommendations: false,
    },
  } as unknown as StoreConfig
}

describe('wireInstructionsReady', () => {
  it('false si payments.wire es undefined', () => {
    expect(wireInstructionsReady(makeCfg())).toBe(false)
  })

  it('false si enabled:false aunque haya datos', () => {
    expect(
      wireInstructionsReady(
        makeCfg({ enabled: false, beneficiaryName: 'KonLLC', accountNumber: '12345' })
      )
    ).toBe(false)
  })

  it('false si enabled:true pero falta beneficiaryName', () => {
    expect(
      wireInstructionsReady(makeCfg({ enabled: true, beneficiaryName: '', accountNumber: '12345' }))
    ).toBe(false)
  })

  it('false si enabled:true pero falta accountNumber', () => {
    expect(
      wireInstructionsReady(
        makeCfg({ enabled: true, beneficiaryName: 'KonLLC', accountNumber: '' })
      )
    ).toBe(false)
  })

  it('true si enabled + beneficiaryName + accountNumber', () => {
    expect(
      wireInstructionsReady(
        makeCfg({ enabled: true, beneficiaryName: 'KonLLC', accountNumber: '12345' })
      )
    ).toBe(true)
  })
})
