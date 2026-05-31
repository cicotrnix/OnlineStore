import { prisma } from '@/lib/db/client'

export function currentPeriodYm(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

export function monthlyBudget(): number {
  return Number.parseInt(process.env.AI_MONTHLY_TOKEN_BUDGET ?? '0', 10) || 0
}

/** budget 0 (o ausente) = sin límite. */
export function isOverBudget(tokensUsed: number, budget: number): boolean {
  if (budget <= 0) return false
  return tokensUsed >= budget
}

export async function isBudgetExceeded(): Promise<boolean> {
  const budget = monthlyBudget()
  if (budget <= 0) return false
  const row = await prisma.aiUsage.findUnique({ where: { periodYm: currentPeriodYm() } })
  return isOverBudget(row?.tokensUsed ?? 0, budget)
}

export async function recordUsage(tokens: number): Promise<void> {
  const periodYm = currentPeriodYm()
  await prisma.aiUsage.upsert({
    where: { periodYm },
    create: { periodYm, tokensUsed: tokens },
    update: { tokensUsed: { increment: tokens } },
  })
}
