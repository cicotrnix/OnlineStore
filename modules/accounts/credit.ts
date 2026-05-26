import { prisma } from '@/lib/db/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface EligibilityResult {
  eligible: boolean
  warn: boolean
  code?: 'INVOICES_OVERDUE' | 'CREDIT_EXCEEDED' | 'NO_CREDIT_LIMIT'
  message?: string
  available?: string
}

export async function checkCreditEligibility(
  orgId: string,
  cartTotal: number | string | Decimal
): Promise<EligibilityResult> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } })

  if (!org.creditLimit) {
    return {
      eligible: false,
      warn: false,
      code: 'NO_CREDIT_LIMIT',
      message: 'Esta organización no tiene crédito habilitado',
    }
  }

  const overdueCount = await prisma.invoice.count({
    where: { organizationId: orgId, status: 'OVERDUE' },
  })
  if (overdueCount > 0) {
    return {
      eligible: false,
      warn: false,
      code: 'INVOICES_OVERDUE',
      message: `Tienes ${overdueCount} factura(s) vencida(s)`,
    }
  }

  const total = new Decimal(cartTotal as Decimal.Value)
  const available = org.creditLimit.sub(org.creditUsed)
  if (total.gt(available)) {
    return {
      eligible: false,
      warn: false,
      code: 'CREDIT_EXCEEDED',
      message: 'El monto excede tu crédito disponible',
      available: available.toFixed(2),
    }
  }

  const utilizationAfter = org.creditUsed.add(total)
  const threshold80 = org.creditLimit.mul(0.8)
  const warn = utilizationAfter.gte(threshold80)

  return { eligible: true, warn }
}

export async function recalcCreditUsed(orgId: string): Promise<Decimal> {
  const aggregated = await prisma.invoice.aggregate({
    where: { organizationId: orgId, status: { in: ['PENDING', 'OVERDUE'] } },
    _sum: { amount: true },
  })
  const newCreditUsed = aggregated._sum.amount ?? new Decimal(0)
  await prisma.organization.update({
    where: { id: orgId },
    data: { creditUsed: newCreditUsed },
  })
  return newCreditUsed
}
