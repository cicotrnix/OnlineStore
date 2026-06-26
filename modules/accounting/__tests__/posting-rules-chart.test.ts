/**
 * Defensa de integridad (pura, sin DB): todo accountCode que pueden emitir las
 * POSTING_RULES debe existir en CHART_OF_ACCOUNTS. No agarra el drift de prod
 * (los tests con DB siembran el chart completo), pero sí agarra si alguien
 * agrega/edita una regla con un código que no está definido en el chart —
 * exactamente el tipo de gap que dejó la cuenta 1200 fuera del card path.
 */
import { ACCOUNT_CODES, CHART_OF_ACCOUNTS, POSTING_RULES } from '@/modules/accounting'
import { describe, expect, it } from 'vitest'

describe('POSTING_RULES — integridad contra CHART_OF_ACCOUNTS', () => {
  it('todo accountCode emitido por las reglas existe en el chart', async () => {
    const chartCodes = new Set(CHART_OF_ACCOUNTS.map((a) => a.code))
    // Payloads que disparan TODAS las ramas: COGS/restock > 0 y ambos métodos
    // de refund (tarjeta → Stripe-clearing, wire → Banco).
    const payloads = [
      { amountCents: 5000, cogsCents: 1000, restockCents: 1000, method: 'STRIPE_CARD' },
      { amountCents: 5000, cogsCents: 1000, restockCents: 1000, method: 'WIRE' },
    ]
    const occurredAt = new Date(0)
    const emitted = new Set<string>()
    const missing: string[] = []

    for (const [type, rule] of Object.entries(POSTING_RULES)) {
      for (const payload of payloads) {
        const lines = (await rule({ payload, occurredAt })) ?? []
        for (const ln of lines) {
          emitted.add(ln.accountCode)
          if (!chartCodes.has(ln.accountCode)) missing.push(`${type} → ${ln.accountCode}`)
        }
      }
    }

    expect(missing).toEqual([])
    // No-vacuo: las reglas realmente corrieron y emitieron códigos, incluido el
    // del card (1200) que fue el que faltaba en prod.
    expect(emitted.has(ACCOUNT_CODES.STRIPE_CLEARING)).toBe(true)
    expect(emitted.size).toBeGreaterThan(3)
  })
})
