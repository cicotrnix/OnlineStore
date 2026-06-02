#!/usr/bin/env tsx
/**
 * Genera un balance de comprobación para un rango de fechas y verifica la
 * invariante débitos = créditos. Útil para ops mensual antes del cierre.
 *
 * Uso:
 *   pnpm tsx scripts/trial-balance.ts                  → todo el histórico
 *   pnpm tsx scripts/trial-balance.ts 2026-06          → mes 2026-06
 *   pnpm tsx scripts/trial-balance.ts 2026-06-01 2026-06-30
 *
 * Exit 0 si débitos = créditos. Exit 1 si descuadra (alerta crítica).
 */
import { trialBalance } from '@/modules/accounting'

function parseRange(args: string[]): { from?: Date; to?: Date } {
  if (args.length === 0) return {}
  if (args.length === 1) {
    // YYYY-MM → mes completo UTC
    const m = args[0]!.match(/^(\d{4})-(\d{2})$/)
    if (m) {
      const year = Number(m[1])
      const month = Number(m[2])
      const from = new Date(Date.UTC(year, month - 1, 1))
      const to = new Date(Date.UTC(year, month, 1) - 1)
      return { from, to }
    }
  }
  if (args.length === 2) {
    return { from: new Date(args[0]!), to: new Date(args[1]!) }
  }
  throw new Error('uso: trial-balance.ts [YYYY-MM] | [YYYY-MM-DD YYYY-MM-DD]')
}

function fmt(cents: bigint): string {
  const neg = cents < 0n
  const abs = neg ? -cents : cents
  const dollars = abs / 100n
  const rest = abs % 100n
  const restStr = rest.toString().padStart(2, '0')
  return `${neg ? '-' : ''}$${dollars.toString()}.${restStr}`
}

async function main() {
  const range = parseRange(process.argv.slice(2))
  const tb = await trialBalance(range)

  console.log('===== TRIAL BALANCE =====')
  if (range.from || range.to) {
    console.log(
      `Rango: ${range.from?.toISOString().slice(0, 10) ?? '...'} → ${
        range.to?.toISOString().slice(0, 10) ?? '...'
      }`
    )
  } else {
    console.log('Rango: todo el histórico')
  }
  console.log('')
  const headers = ['Code', 'Account', 'Debits', 'Credits', 'Balance']
  console.log(headers.map((h) => h.padEnd(14)).join(' | '))
  console.log('-'.repeat(80))
  for (const row of tb.rows) {
    console.log(
      [
        row.accountCode.padEnd(14),
        row.accountName.slice(0, 30).padEnd(14),
        fmt(row.debitCents).padEnd(14),
        fmt(row.creditCents).padEnd(14),
        fmt(row.balanceCents).padEnd(14),
      ].join(' | ')
    )
  }
  console.log('-'.repeat(80))
  console.log(`Totals: Debits=${fmt(tb.totalDebits)}  Credits=${fmt(tb.totalCredits)}`)

  if (tb.totalDebits !== tb.totalCredits) {
    console.error('\n❌ DESCUADRE — débitos ≠ créditos')
    console.error(`  Diferencia: ${fmt(tb.totalDebits - tb.totalCredits)}`)
    process.exit(1)
  }
  console.log('\n✅ Balanceado — débitos = créditos')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
