import { Decimal } from '@prisma/client/runtime/library'

export function formatMoney(amount: Decimal, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount.toNumber())
}

export function addMoney(...amounts: Decimal[]): Decimal {
  return amounts.reduce((acc, n) => acc.plus(n), new Decimal(0))
}

export function multiplyMoney(amount: Decimal, factor: number): Decimal {
  return amount.times(factor)
}

export function isPositiveMoney(amount: Decimal): boolean {
  return amount.greaterThan(0)
}
