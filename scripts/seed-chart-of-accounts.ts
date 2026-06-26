/**
 * Siembra el chart of accounts en la DB (idempotente: upsert por code, no toca
 * las existentes). Cierra el drift código→prod: inserta cuentas faltantes como
 * la 1200 (Stripe-clearing) que faltaba en prod y rompía el asiento del pago
 * con tarjeta.
 *
 * Uso (terminal del container en Coolify):
 *   pnpm tsx scripts/seed-chart-of-accounts.ts
 *
 * Seguro de re-correr en cada deploy.
 */
import { prisma } from '@/lib/db/client'
import { seedChartOfAccounts } from '@/modules/accounting'

seedChartOfAccounts()
  .then(() => {
    console.log('chart of accounts seeded (idempotent)')
  })
  .catch((e) => {
    console.error('seed-chart-of-accounts failed', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
