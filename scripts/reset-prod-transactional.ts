/**
 * reset-prod-transactional.ts — DANGEROUS. Wipes ALL transactional data.
 *
 *   CONFIRM_RESET=yes pnpm tsx scripts/reset-prod-transactional.ts
 *
 * Refuses to run unless CONFIRM_RESET=yes.
 *
 * IMPORTANTE — append-only guard:
 *   lib/db/client.ts `appendOnlyEnforced()` devuelve
 *     !(guard === 'off' && nodeEnv !== 'production')
 *   → en PRODUCCIÓN el guard SIEMPRE está activo; `APPEND_ONLY_GUARD=off` NO
 *   tiene efecto en prod. Por eso NO se puede borrar JournalEntry/JournalLine/
 *   PaymentEvent/AuditLog vía el cliente Prisma en prod. Este script usa
 *   exclusivamente SQL crudo (`$executeRawUnsafe` → TRUNCATE / DELETE / DROP
 *   SEQUENCE), que omite el middleware per-model. NO dependemos de
 *   APPEND_ONLY_GUARD=off.
 *
 * KEEP (nunca se trunca): Product, Category, ProductPriceTier, ProductContent,
 *   LedgerAccount, AccountingPeriod, y los User con isPlatformAdmin = true.
 *
 * Idempotente: TRUNCATE sobre tablas vacías y DROP SEQUENCE IF EXISTS son
 * seguros de re-ejecutar.
 */
if (process.env.CONFIRM_RESET !== 'yes') {
  console.error('Refusing: set CONFIRM_RESET=yes to wipe transactional data')
  process.exit(1)
}

import { prisma } from '@/lib/db/client'

// Orden no importa con CASCADE, pero listamos explícitamente todo lo
// transaccional. Nombres PascalCase entre comillas dobles (Postgres).
const TRUNCATE_TABLES = [
  'Order',
  'OrderLine',
  'Invoice',
  'Payment',
  'PaymentEvent',
  'JournalEntry',
  'JournalLine',
  'DomainEvent',
  'EventDelivery',
  'Notification',
  'TaxDocument',
  'Cart',
  'CartItem',
  'Quote',
  'QuoteLine',
  'QuoteAuditLog',
  'ApprovalRequest',
  'Shipment',
  'AiUsage',
  'AiContentJob',
  'ImpersonationLog',
  'AuditLog',
  'CustomerPrice',
  'OrganizationCatalogAccess',
  'OrganizationMember',
  'OrganizationAddress',
  'Organization',
  'Invitation',
  'Session',
  'Account',
  'VerificationToken',
  'PasswordResetToken',
  'SensitiveActionToken',
  'WebhookDelivery',
  'WebhookEndpoint',
  'SearchIndexQueue',
]

async function main() {
  // Conteos "antes" para el resumen.
  const [ordersBefore, usersBefore] = await Promise.all([prisma.order.count(), prisma.user.count()])
  const adminsBefore = await prisma.user.count({ where: { isPlatformAdmin: true } })
  console.log('Before:')
  console.log(`  orders : ${ordersBefore}`)
  console.log(`  users  : ${usersBefore} (platform admins: ${adminsBefore})`)

  // 1. TRUNCATE de todo lo transaccional en una sola sentencia.
  const quoted = TRUNCATE_TABLES.map((t) => `"${t}"`).join(',')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`)
  console.log(`✓ Truncated ${TRUNCATE_TABLES.length} transactional tables.`)

  // 2. Borrar usuarios no-admin (conserva los platform admins reales de Task 2).
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "isPlatformAdmin" = false;`)

  // 3. Reset de las secuencias per-year para que la 1ra orden/factura/cotización
  //    real sea #1. Auto-se-recrean en START 1 en el próximo uso.
  const seqs = await prisma.$queryRawUnsafe<{ sequencename: string }[]>(
    `SELECT sequencename FROM pg_sequences
       WHERE sequencename LIKE 'order_seq_%'
          OR sequencename LIKE 'invoice_seq_%'
          OR sequencename LIKE 'quote_seq_%';`
  )
  for (const { sequencename } of seqs) {
    await prisma.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS "${sequencename}";`)
  }
  console.log(
    `✓ Dropped ${seqs.length} per-year sequence(s): ${seqs.map((s) => s.sequencename).join(', ') || '(none)'}`
  )

  // Conteos "después".
  const [ordersAfter, usersAfter] = await Promise.all([prisma.order.count(), prisma.user.count()])
  console.log('\nAfter:')
  console.log(`  orders : ${ordersAfter}`)
  console.log(`  users  : ${usersAfter} (all platform admins)`)

  if (usersAfter === 0) {
    console.warn(
      '\n⚠️  WARNING: 0 users remain. This means no platform admin exists — ' +
        'Task 2 (create-platform-admin) was NOT run. Run it before going live.'
    )
  }
}

main()
  .catch((err) => {
    console.error('reset-prod-transactional failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
