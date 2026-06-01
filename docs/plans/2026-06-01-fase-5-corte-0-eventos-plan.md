# Fase 5 · Corte 0 — Fundación de eventos · Plan de implementación

> **Para CC:** ejecutar tarea por tarea con TDD. Pasos en checkbox (`- [ ]`). Spec: `docs/specs/2026-06-01-fase-5-integraciones.md` §4 y §8.

**Goal:** Construir el bus de eventos (transactional outbox + dispatcher + contrato v1 tipado) que desacopla el track comercial del financiero. Sin suscriptores reales todavía — esos llegan en cortes posteriores.

**Architecture:** Cada mutación de dominio escribe un `DomainEvent` (PENDING) en la misma transacción que el cambio (sin dual-write). Un worker (`dispatchPending`, cron, `FOR UPDATE SKIP LOCKED`) reclama eventos PENDING, resuelve suscriptores desde un registro boot-time tipado, crea una `EventDelivery` idempotente por `(eventId, subscriber)` y ejecuta el handler con reintentos (MAX_ATTEMPTS=5). Mismo patrón que `modules/ai/content-jobs.ts`.

**Tech Stack:** Next.js 14, Prisma 6 + Postgres 16, Vitest (integración con `tests/helpers/cleanDb`), TypeScript estricto.

---

## File Structure

- `prisma/schema.prisma` — modelos `DomainEvent`, `EventDelivery` + enums.
- `modules/events/contract.ts` — contrato v1: `EVENT_TYPES`, `DomainEventType`, `DomainEventInput`, `DomainEventRecord`.
- `modules/events/outbox.ts` — `emitEvent(tx, input)`.
- `modules/events/registry.ts` — `registerSubscriber`, `getSubscribersFor`, `Subscriber`, `_resetSubscribers`.
- `modules/events/dispatcher.ts` — `dispatchPending(opts)`.
- `modules/events/subscribers.ts` — barrel de registro boot-time (vacío en Corte 0; los cortes siguientes agregan).
- `modules/events/index.ts` — barrel público.
- `modules/events/__tests__/*.test.ts` — tests por unidad.
- `scripts/process-domain-events.ts` — entrypoint cron del dispatcher.
- `scripts/cleanup-domain-events.ts` — retención (DomainEvent 180d / EventDelivery 90d).
- `tests/helpers/cleanDb.ts` — agregar limpieza de las tablas nuevas.

---

## Task 1: Modelos Prisma + migración

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `tests/helpers/cleanDb.ts`

- [ ] **Step 1: Agregar enums y modelos al final de `prisma/schema.prisma`**

```prisma
// ===== Fase 5: bus de eventos (outbox) =====

enum DomainEventStatus {
  PENDING
  PROCESSING
  DONE
}

enum EventDeliveryStatus {
  PENDING
  DONE
  FAILED
}

model DomainEvent {
  id            String            @id @default(cuid())
  type          String
  aggregateType String
  aggregateId   String
  payload       Json
  status        DomainEventStatus @default(PENDING)
  occurredAt    DateTime          @default(now())
  createdAt     DateTime          @default(now())
  deliveries    EventDelivery[]

  @@index([status, occurredAt])
  @@index([aggregateType, aggregateId])
}

model EventDelivery {
  id          String              @id @default(cuid())
  eventId     String
  event       DomainEvent         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  subscriber  String
  status      EventDeliveryStatus @default(PENDING)
  attempts    Int                 @default(0)
  lastError   String?             @db.Text
  processedAt DateTime?
  createdAt   DateTime            @default(now())

  @@unique([eventId, subscriber])
  @@index([status])
}
```

- [ ] **Step 2: Crear la migración**

Run: `pnpm prisma migrate dev --name fase5_event_bus`
Expected: migración creada y aplicada; `prisma generate` regenera el cliente sin error.

- [ ] **Step 3: Agregar limpieza en `tests/helpers/cleanDb.ts`**

Insertar al inicio del cuerpo de `cleanDb()` (antes de `aiContentJob`), respetando el orden FK (delivery antes que event):

```typescript
  await prisma.eventDelivery.deleteMany()
  await prisma.domainEvent.deleteMany()
```

- [ ] **Step 4: Verificar typecheck**

Run: `pnpm typecheck`
Expected: PASS (cliente Prisma con `domainEvent` y `eventDelivery`).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/helpers/cleanDb.ts
git commit -m "feat(events): schema DomainEvent + EventDelivery (outbox)"
```

---

## Task 2: Contrato de eventos v1

**Files:**
- Create: `modules/events/contract.ts`
- Test: `modules/events/__tests__/contract.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { describe, expect, it } from 'vitest'
import { EVENT_TYPES } from '../contract'

describe('event contract v1', () => {
  it('incluye los 11 eventos canónicos', () => {
    expect(EVENT_TYPES).toEqual([
      'customer.verified',
      'order.placed',
      'payment.authorized',
      'payment.captured',
      'payment.reconciled',
      'payment.refunded',
      'payment.failed',
      'shipment.dispatched',
      'invoice.issued',
      'invoice.paid',
      'invoice.overdue',
    ])
  })
})
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `pnpm vitest run modules/events/__tests__/contract.test.ts`
Expected: FAIL (`Cannot find module '../contract'`).

- [ ] **Step 3: Implementar `modules/events/contract.ts`**

```typescript
/** Contrato de eventos de dominio v1 (inmutable, versionado). */
export const EVENT_TYPES = [
  'customer.verified',
  'order.placed',
  'payment.authorized',
  'payment.captured',
  'payment.reconciled',
  'payment.refunded',
  'payment.failed',
  'shipment.dispatched',
  'invoice.issued',
  'invoice.paid',
  'invoice.overdue',
] as const

export type DomainEventType = (typeof EVENT_TYPES)[number]

/** Entrada para emitir un evento (lo que produce el dominio). */
export interface DomainEventInput {
  type: DomainEventType
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
}

/** Evento materializado que recibe un suscriptor. */
export interface DomainEventRecord {
  id: string
  type: DomainEventType
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  occurredAt: Date
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `pnpm vitest run modules/events/__tests__/contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/events/contract.ts modules/events/__tests__/contract.test.ts
git commit -m "feat(events): contrato de eventos v1 tipado"
```

---

## Task 3: Outbox — `emitEvent`

**Files:**
- Create: `modules/events/outbox.ts`
- Test: `modules/events/__tests__/outbox.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import { emitEvent } from '../outbox'

describe('emitEvent (outbox)', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('persiste un DomainEvent PENDING dentro de la transacción', async () => {
    const id = await prisma.$transaction((tx) =>
      emitEvent(tx, {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: 'order-1',
        payload: { totalCents: 1000, currency: 'USD' },
      })
    )
    const ev = await prisma.domainEvent.findUnique({ where: { id } })
    expect(ev?.status).toBe('PENDING')
    expect(ev?.type).toBe('order.placed')
    expect((ev?.payload as { totalCents: number }).totalCents).toBe(1000)
  })

  it('es atómico: si la transacción falla, no queda evento', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await emitEvent(tx, {
          type: 'order.placed',
          aggregateType: 'Order',
          aggregateId: 'order-2',
          payload: {},
        })
        throw new Error('rollback')
      })
    ).rejects.toThrow('rollback')
    const count = await prisma.domainEvent.count({ where: { aggregateId: 'order-2' } })
    expect(count).toBe(0)
  })
})
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `pnpm vitest run modules/events/__tests__/outbox.test.ts`
Expected: FAIL (`Cannot find module '../outbox'`).

- [ ] **Step 3: Implementar `modules/events/outbox.ts`**

```typescript
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
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `pnpm vitest run modules/events/__tests__/outbox.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/events/outbox.ts modules/events/__tests__/outbox.test.ts
git commit -m "feat(events): emitEvent transactional outbox"
```

---

## Task 4: Registro de suscriptores (boot-time tipado)

**Files:**
- Create: `modules/events/registry.ts`
- Test: `modules/events/__tests__/registry.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetSubscribers, getSubscribersFor, registerSubscriber } from '../registry'

describe('subscriber registry', () => {
  beforeEach(() => {
    _resetSubscribers()
  })

  it('devuelve los suscriptores que manejan un tipo', () => {
    registerSubscriber({ name: 'a', handles: ['order.placed'], handle: vi.fn() })
    registerSubscriber({ name: 'b', handles: ['payment.captured'], handle: vi.fn() })
    const subs = getSubscribersFor('order.placed')
    expect(subs.map((s) => s.name)).toEqual(['a'])
  })

  it('deduplica por nombre (registro idempotente al boot)', () => {
    const sub = { name: 'a', handles: ['order.placed'] as const, handle: vi.fn() }
    registerSubscriber(sub)
    registerSubscriber(sub)
    expect(getSubscribersFor('order.placed')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `pnpm vitest run modules/events/__tests__/registry.test.ts`
Expected: FAIL (`Cannot find module '../registry'`).

- [ ] **Step 3: Implementar `modules/events/registry.ts`**

```typescript
import type { DomainEventRecord, DomainEventType } from './contract'

export interface Subscriber {
  name: string
  handles: readonly DomainEventType[]
  handle: (event: DomainEventRecord) => Promise<void>
}

const subscribers: Subscriber[] = []

/** Registro boot-time. Idempotente por `name` (re-importes no duplican). */
export function registerSubscriber(sub: Subscriber): void {
  if (subscribers.some((s) => s.name === sub.name)) return
  subscribers.push(sub)
}

export function getSubscribersFor(type: DomainEventType): Subscriber[] {
  return subscribers.filter((s) => s.handles.includes(type))
}

/** Solo para tests. */
export function _resetSubscribers(): void {
  subscribers.length = 0
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `pnpm vitest run modules/events/__tests__/registry.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/events/registry.ts modules/events/__tests__/registry.test.ts
git commit -m "feat(events): registro de suscriptores boot-time"
```

---

## Task 5: Dispatcher — `dispatchPending`

**Files:**
- Create: `modules/events/dispatcher.ts`
- Test: `modules/events/__tests__/dispatcher.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DomainEventType } from '../contract'
import { dispatchPending } from '../dispatcher'
import { emitEvent } from '../outbox'
import type { Subscriber } from '../registry'

async function seedEvent(type: DomainEventType = 'order.placed', aggregateId = 'o1') {
  return prisma.$transaction((tx) =>
    emitEvent(tx, { type, aggregateType: 'Order', aggregateId, payload: { n: 1 } })
  )
}

describe('dispatchPending', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('entrega un evento al suscriptor y marca delivery + evento DONE', async () => {
    const id = await seedEvent()
    const sub: Subscriber = { name: 'acct', handles: ['order.placed'], handle: vi.fn().mockResolvedValue(undefined) }
    const res = await dispatchPending({ resolve: () => [sub] })
    expect(sub.handle).toHaveBeenCalledOnce()
    expect(res.delivered).toBe(1)
    const ev = await prisma.domainEvent.findUnique({ where: { id } })
    expect(ev?.status).toBe('DONE')
    const del = await prisma.eventDelivery.findFirst({ where: { eventId: id, subscriber: 'acct' } })
    expect(del?.status).toBe('DONE')
  })

  it('es idempotente: re-correr no vuelve a invocar el handler', async () => {
    await seedEvent()
    const sub: Subscriber = { name: 'acct', handles: ['order.placed'], handle: vi.fn().mockResolvedValue(undefined) }
    await dispatchPending({ resolve: () => [sub] })
    await dispatchPending({ resolve: () => [sub] })
    expect(sub.handle).toHaveBeenCalledOnce()
  })

  it('un fallo deja delivery PENDING attempts=1 y reintenta en el próximo tick', async () => {
    await seedEvent()
    const handle = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined)
    const sub: Subscriber = { name: 'acct', handles: ['order.placed'], handle }
    await dispatchPending({ resolve: () => [sub] })
    let del = await prisma.eventDelivery.findFirst({ where: { subscriber: 'acct' } })
    expect(del?.status).toBe('PENDING')
    expect(del?.attempts).toBe(1)
    await dispatchPending({ resolve: () => [sub] })
    del = await prisma.eventDelivery.findFirst({ where: { subscriber: 'acct' } })
    expect(del?.status).toBe('DONE')
    expect(handle).toHaveBeenCalledTimes(2)
  })

  it('tras 5 fallos marca delivery FAILED', async () => {
    await seedEvent()
    const sub: Subscriber = { name: 'acct', handles: ['order.placed'], handle: vi.fn().mockRejectedValue(new Error('boom')) }
    for (let i = 0; i < 5; i++) await dispatchPending({ resolve: () => [sub] })
    const del = await prisma.eventDelivery.findFirst({ where: { subscriber: 'acct' } })
    expect(del?.status).toBe('FAILED')
    expect(del?.attempts).toBe(5)
  })

  it('suscriptores independientes: si uno falla, el otro igual entrega', async () => {
    await seedEvent()
    const ok: Subscriber = { name: 'ok', handles: ['order.placed'], handle: vi.fn().mockResolvedValue(undefined) }
    const bad: Subscriber = { name: 'bad', handles: ['order.placed'], handle: vi.fn().mockRejectedValue(new Error('x')) }
    await dispatchPending({ resolve: () => [ok, bad] })
    const okDel = await prisma.eventDelivery.findFirst({ where: { subscriber: 'ok' } })
    const badDel = await prisma.eventDelivery.findFirst({ where: { subscriber: 'bad' } })
    expect(okDel?.status).toBe('DONE')
    expect(badDel?.status).toBe('PENDING')
  })
})
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `pnpm vitest run modules/events/__tests__/dispatcher.test.ts`
Expected: FAIL (`Cannot find module '../dispatcher'`).

- [ ] **Step 3: Implementar `modules/events/dispatcher.ts`**

```typescript
import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import type { DomainEventType } from './contract'
import { type Subscriber, getSubscribersFor } from './registry'

const BATCH_SIZE = 20
const MAX_ATTEMPTS = 5

export interface DispatchResult {
  events: number
  delivered: number
  failed: number
}

export async function dispatchPending(opts?: {
  batchSize?: number
  resolve?: (type: DomainEventType) => Subscriber[]
}): Promise<DispatchResult> {
  const batchSize = opts?.batchSize ?? BATCH_SIZE
  const resolve = opts?.resolve ?? getSubscribersFor
  const result: DispatchResult = { events: 0, delivered: 0, failed: 0 }

  // Reclama un lote de eventos PENDING (FOR UPDATE SKIP LOCKED).
  const batch = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(`
      SELECT id FROM "DomainEvent"
      WHERE status = 'PENDING'
      ORDER BY "occurredAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `)
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    await tx.domainEvent.updateMany({ where: { id: { in: ids } }, data: { status: 'PROCESSING' } })
    return tx.domainEvent.findMany({ where: { id: { in: ids } } })
  })

  for (const event of batch) {
    result.events++
    const subs = resolve(event.type as DomainEventType)
    let allTerminal = true

    for (const sub of subs) {
      // Delivery idempotente por (eventId, subscriber).
      const delivery = await prisma.eventDelivery.upsert({
        where: { eventId_subscriber: { eventId: event.id, subscriber: sub.name } },
        create: { eventId: event.id, subscriber: sub.name },
        update: {},
      })
      if (delivery.status === 'DONE' || delivery.status === 'FAILED') continue

      try {
        await sub.handle({
          id: event.id,
          type: event.type as DomainEventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload as Record<string, unknown>,
          occurredAt: event.occurredAt,
        })
        await prisma.eventDelivery.update({
          where: { id: delivery.id },
          data: { status: 'DONE', processedAt: new Date(), lastError: null },
        })
        result.delivered++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const attempts = delivery.attempts + 1
        const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING'
        await prisma.eventDelivery.update({
          where: { id: delivery.id },
          data: { status, attempts, lastError: message, processedAt: new Date() },
        })
        if (status === 'PENDING') allTerminal = false
        result.failed++
        logger.error(
          { eventId: event.id, subscriber: sub.name, attempt: attempts, err: message },
          'event delivery error'
        )
      }
    }

    // El evento queda DONE solo si todas sus entregas son terminales (DONE/FAILED).
    // Si alguna sigue PENDING, vuelve a PENDING para reintentarse el próximo tick.
    await prisma.domainEvent.update({
      where: { id: event.id },
      data: { status: allTerminal ? 'DONE' : 'PENDING' },
    })
  }

  return result
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `pnpm vitest run modules/events/__tests__/dispatcher.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/events/dispatcher.ts modules/events/__tests__/dispatcher.test.ts
git commit -m "feat(events): dispatcher con entrega idempotente + reintentos"
```

---

## Task 6: Barrels, worker y cleanup

**Files:**
- Create: `modules/events/subscribers.ts`
- Create: `modules/events/index.ts`
- Create: `scripts/process-domain-events.ts`
- Create: `scripts/cleanup-domain-events.ts`

- [ ] **Step 1: Crear `modules/events/subscribers.ts` (barrel de registro, vacío en Corte 0)**

```typescript
// Barrel de registro boot-time. Los cortes siguientes importan acá sus
// suscriptores para que `registerSubscriber` corra al cargar este módulo.
// En Corte 0 no hay suscriptores reales todavía.
export {}
```

- [ ] **Step 2: Crear `modules/events/index.ts` (barrel público)**

```typescript
export { EVENT_TYPES } from './contract'
export type { DomainEventType, DomainEventInput, DomainEventRecord } from './contract'
export { emitEvent } from './outbox'
export { registerSubscriber, getSubscribersFor } from './registry'
export type { Subscriber } from './registry'
export { dispatchPending } from './dispatcher'
export type { DispatchResult } from './dispatcher'
```

- [ ] **Step 3: Crear `scripts/process-domain-events.ts` (entrypoint cron)**

```typescript
import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import { dispatchPending } from '@/modules/events'
// Importa el barrel para registrar todos los suscriptores al boot.
import '@/modules/events/subscribers'

async function main() {
  const result = await dispatchPending()
  logger.info({ result }, 'domain events tick')
}

main()
  .catch((err) => {
    logger.error({ err }, 'process-domain-events failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Crear `scripts/cleanup-domain-events.ts` (retención 180d/90d)**

```typescript
import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'

const EVENT_TTL_DAYS = 180
const DELIVERY_TTL_DAYS = 90

async function main() {
  const eventCutoff = new Date(Date.now() - EVENT_TTL_DAYS * 86_400_000)
  const deliveryCutoff = new Date(Date.now() - DELIVERY_TTL_DAYS * 86_400_000)

  const deliveries = await prisma.eventDelivery.deleteMany({
    where: { status: { in: ['DONE', 'FAILED'] }, processedAt: { lt: deliveryCutoff } },
  })
  const events = await prisma.domainEvent.deleteMany({
    where: { status: 'DONE', createdAt: { lt: eventCutoff } },
  })
  logger.info({ deliveries: deliveries.count, events: events.count }, 'domain events cleanup')
}

main()
  .catch((err) => {
    logger.error({ err }, 'cleanup-domain-events failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 5: Verificar typecheck de los scripts y barrels**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/events/subscribers.ts modules/events/index.ts scripts/process-domain-events.ts scripts/cleanup-domain-events.ts
git commit -m "feat(events): barrels + worker dispatcher + cleanup de retención"
```

---

## Task 7: Verificación final del corte

**Files:** ninguno nuevo (gate de calidad).

- [ ] **Step 1: Correr toda la suite del módulo**

Run: `pnpm vitest run modules/events`
Expected: PASS (contract 1 + outbox 2 + registry 2 + dispatcher 5 = 10 tests).

- [ ] **Step 2: Gate completo del repo**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: todo verde.

- [ ] **Step 3: Actualizar `CLAUDE.md` y `ROADMAP.md`**

Anotar en el estado del proyecto: "Fase 5 Corte 0 (bus de eventos) cerrado — outbox + dispatcher + contrato v1, sin suscriptores reales aún".

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md ROADMAP.md
git commit -m "docs(fase5): cierre Corte 0 — bus de eventos"
```

---

## Operacional (post-merge, no código)

- **Coolify scheduled task:** `scripts/process-domain-events.ts` cada 1 min (igual cadencia que el worker de search). Sin esto, los eventos no se entregan.
- **Coolify scheduled task:** `scripts/cleanup-domain-events.ts` semanal (dom 03:30 UTC).

## Self-review (hecho)

- **Cobertura del spec §4:** outbox transaccional ✓, contrato v1 (11 eventos) ✓, dispatcher idempotente con reintentos ✓, registro boot-time ✓, retención 180/90 ✓. Suscriptores reales (contabilidad/email/webhooks/analytics/notification) → cortes posteriores, por diseño.
- **Sin placeholders:** todo el código está completo.
- **Consistencia de tipos:** `emitEvent`, `dispatchPending`, `registerSubscriber`, `getSubscribersFor`, `EVENT_TYPES`, `DomainEventRecord`, `Subscriber` usados consistentemente entre tareas. La clave compuesta `eventId_subscriber` coincide con `@@unique([eventId, subscriber])`.
