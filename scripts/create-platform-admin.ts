/**
 * create-platform-admin.ts
 *
 * Promueve (o crea) un usuario como platform admin real y degrada el admin
 * semilla `admin@example.com`. Idempotente.
 *
 *   ADMIN_EMAIL=owner@acme.com pnpm tsx scripts/create-platform-admin.ts
 *   pnpm tsx scripts/create-platform-admin.ts owner@acme.com
 *
 * Pasos:
 *   1. Upsert del usuario destino con isPlatformAdmin = true.
 *   2. Degrada admin@example.com (isPlatformAdmin = false).
 *   3. Intenta borrar admin@example.com SOLO si no tiene datos asociados
 *      (sin órdenes, sin membresías, etc.). Si está bloqueado por FK o tiene
 *      datos, lo deja degradado y lo informa. (Task 1 borrará todos los
 *      usuarios no-admin de todos modos.)
 */
import { prisma } from '@/lib/db/client'

const SEED_ADMIN_EMAIL = 'admin@example.com'

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? process.argv[2] ?? '').trim().toLowerCase()
  if (!email) {
    console.error(
      'Error: no admin email provided. Set ADMIN_EMAIL or pass it as the first argument.\n' +
        '  ADMIN_EMAIL=owner@acme.com pnpm tsx scripts/create-platform-admin.ts'
    )
    process.exit(1)
  }

  // 1. Upsert del usuario destino como platform admin.
  const admin = await prisma.user.upsert({
    where: { email },
    update: { isPlatformAdmin: true },
    create: { email, isPlatformAdmin: true },
  })
  console.log(`✓ Platform admin set: ${admin.email} (isPlatformAdmin=true)`)

  // 2 + 3. Degradar y (si está limpio) borrar el admin semilla — salvo que el
  // admin semilla SEA el usuario destino que acabamos de promover.
  let seedResult = 'seed admin admin@example.com not present (nothing to do)'
  if (email !== SEED_ADMIN_EMAIL) {
    const seed = await prisma.user.findUnique({ where: { email: SEED_ADMIN_EMAIL } })
    if (seed) {
      await prisma.user.update({
        where: { id: seed.id },
        data: { isPlatformAdmin: false },
      })

      // Solo borrar si no tiene datos asociados. Intentamos el delete y dejamos
      // que la base rechace por FK si hay dependencias; en ese caso queda
      // simplemente degradado.
      const [orders, members] = await Promise.all([
        prisma.order.count({ where: { placedByUserId: seed.id } }),
        prisma.organizationMember.count({ where: { userId: seed.id } }),
      ])
      if (orders === 0 && members === 0) {
        try {
          await prisma.user.delete({ where: { id: seed.id } })
          seedResult = `seed admin ${SEED_ADMIN_EMAIL} demoted and deleted (no associated data)`
        } catch (err) {
          seedResult =
            `seed admin ${SEED_ADMIN_EMAIL} demoted; delete blocked by FK/constraint, left in place ` +
            `(${err instanceof Error ? err.message : String(err)})`
        }
      } else {
        seedResult =
          `seed admin ${SEED_ADMIN_EMAIL} demoted; NOT deleted ` +
          `(has associated data: ${orders} orders, ${members} memberships)`
      }
    }
  } else {
    seedResult = `target admin IS the seed admin (${SEED_ADMIN_EMAIL}); promoted, not deleted`
  }
  console.log(`✓ ${seedResult}`)

  console.log('\nSummary:')
  console.log(`  admin email set : ${admin.email}`)
  console.log(`  seed admin      : ${seedResult}`)
}

main()
  .catch((err) => {
    console.error('create-platform-admin failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
