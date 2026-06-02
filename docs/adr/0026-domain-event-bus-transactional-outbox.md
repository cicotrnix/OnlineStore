# ADR 0026 — Bus de eventos: transactional outbox sobre Postgres

Fecha: 2026-06-01 (Fase 5 Corte 0)

## Estado

Aceptado.

## Contexto

Fase 5 introduce dos tracks desacoplados (comercial → financiero). El bus que los conecta debe ser durable, ordenado por agregado y replayable, sin introducir broker externo (Kafka/SQS rompería los ADRs 0001-0003 del stack).

## Decisión

Transactional outbox sobre Postgres:

- Cada productor escribe `DomainEvent` **dentro de la misma tx** que su mutación de dominio — elimina dual-write.
- Worker dispatcher con `FOR UPDATE SKIP LOCKED` reclama lotes pendientes (mismo patrón que Fase 3 search queue y Fase 4 ai-content jobs).
- `EventDelivery` por `(eventId, subscriber)` UNIQUE → at-least-once + idempotency.
- Suscriptores registrados boot-time tipados (no DB-driven) → más simple + verificable que approval-registry de Fase 2.
- `MAX_ATTEMPTS=5` → `FAILED`. Event vuelve a `PENDING` si alguna entrega sigue pendiente.

## Consecuencias

- Cero infra nueva. Cero claves nuevas en env.
- Latencia mínima 1 tick del cron (1 min). Suficiente para email/analytics/webhooks.
- Retención: 180d events / 90d deliveries (cron de cleanup).
- Para escalar a milisegundos hace falta o NOTIFY/LISTEN (postgres) o broker externo — diferido.

## Alternativas descartadas

- Broker externo (Kafka/SQS): viola el principio "no stack nuevo sin ADR" + agrega claves de cuenta.
- DB-driven subscriber registry: tipos perdidos, harder to test.
- Inline dispatch (sin tabla outbox): viola single source of truth, riesgo de dual-write.
