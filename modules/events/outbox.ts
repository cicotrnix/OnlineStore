import type { Prisma } from '@prisma/client'
import type { DomainEventInput } from './contract'

/**
 * Escribe un DomainEvent en la MISMA transacción que el cambio de dominio.
 * Pasar siempre el `tx` de un `prisma.$transaction(...)` para garantizar
 * atomicidad (sin dual-write). Devuelve el id del evento.
 */
export async function emitEvent(
  tx: Prisma.TransactionClient,
  input: DomainEventInput
): Promise<string> {
  const ev = await tx.domainEvent.create({
    data: {
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload as Prisma.InputJsonValue,
    },
  })
  return ev.id
}
