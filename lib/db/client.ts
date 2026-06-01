import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/**
 * Append-only enforcement: bloquea UPDATE/DELETE en tablas append-only.
 * Hardening adicional vía rol Postgres `app_rw` (ver §13 spec) en producción.
 * Tests pueden saltarlo con APPEND_ONLY_GUARD=off (cleanDb necesita borrar).
 */
// DomainEvent NO va aquí — su `status` muta (PENDING→PROCESSING→DONE). El asiento
// de doble partida, los PaymentEvent y los AuditLog sí son auténticamente append-only.
const APPEND_ONLY_MODELS = ['JournalEntry', 'JournalLine', 'PaymentEvent', 'AuditLog']
const APPEND_ONLY_BLOCKED = ['update', 'updateMany', 'delete', 'deleteMany', 'upsert']

function makeClient(): PrismaClient {
  const c = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
  if (process.env.APPEND_ONLY_GUARD === 'off') return c
  return c.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            model &&
            APPEND_ONLY_MODELS.includes(model) &&
            APPEND_ONLY_BLOCKED.includes(operation)
          ) {
            throw new Error(
              `APPEND_ONLY_VIOLATION: ${operation} on ${model} is forbidden (use reversing entries)`
            )
          }
          return query(args)
        },
      },
    },
  }) as unknown as PrismaClient
}

export const prisma = globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
