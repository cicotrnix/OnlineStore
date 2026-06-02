# Coolify scheduled tasks — Fase 5 + Fase 3/4

Tareas cron que la app necesita para que el bus de eventos, índice de búsqueda,
contenido AI y entregas de webhook salientes funcionen en prod. Configurar
desde Coolify → Application → Scheduled Tasks.

Convención: cada tarea corre `pnpm tsx scripts/<name>.ts` desde la raíz del
proyecto. Frecuencias eligen el menor cache TTL sensato sin saturar la DB.

## Fase 5 — bus de eventos

### process-domain-events (1 min)

| Campo | Valor |
|---|---|
| Name | `process-domain-events` |
| Command | `pnpm tsx scripts/process-domain-events.ts` |
| Schedule (cron) | `* * * * *` |
| Container | App container |

Función: dispatcher del transactional outbox. Toma `DomainEvent` PENDING en
batches de 20, FOR UPDATE SKIP LOCKED, ejecuta los handlers de los subscribers
registrados (accounting, email, analytics, webhooks). MAX_ATTEMPTS=5 por delivery.

### cleanup-domain-events (semanal)

| Campo | Valor |
|---|---|
| Name | `cleanup-domain-events` |
| Command | `pnpm tsx scripts/cleanup-domain-events.ts` |
| Schedule (cron) | `0 3 * * 0` (domingo 03:00 UTC) |

Función: borra `DomainEvent` > 180 días + `EventDelivery` > 90 días (retención
del ADR 0026).

### process-webhook-deliveries (1 min)

| Campo | Valor |
|---|---|
| Name | `process-webhook-deliveries` |
| Command | `pnpm tsx scripts/process-webhook-deliveries.ts` |
| Schedule (cron) | `* * * * *` |

Función: entrega `WebhookDelivery` PENDING a los endpoints externos firmados
con HMAC. MAX_ATTEMPTS=5; 5xx/timeout → reintento; al 5to fallo queda FAILED y
se requiere replay manual (admin UI).

**Inerte sin endpoints**: si `WebhookEndpoint` está vacío, este worker no hace
nada — seguro encenderlo en cualquier momento.

## Fase 3 — búsqueda (legacy, ya en prod desde v3.0.0)

### process-search-index-queue (1 min)

| Campo | Valor |
|---|---|
| Name | `process-search-index-queue` |
| Command | `pnpm tsx scripts/process-search-index-queue.ts` |
| Schedule (cron) | `* * * * *` |

### cleanup-stale-search-queue (semanal)

| Campo | Valor |
|---|---|
| Name | `cleanup-stale-search-queue` |
| Command | `pnpm tsx scripts/cleanup-stale-search-queue.ts` |
| Schedule (cron) | `0 3 * * 0` |

## Fase 4 — AI content

### process-ai-content-jobs (1 min)

| Campo | Valor |
|---|---|
| Name | `process-ai-content-jobs` |
| Command | `pnpm tsx scripts/process-ai-content-jobs.ts` |
| Schedule (cron) | `* * * * *` |

**Inerte sin ANTHROPIC_API_KEY**: el AIProvider devuelve noop client, el job
queda DONE inmediatamente sin generar nada.

## Verificación post-setup

Después de habilitar las tareas, verificar en logs Coolify cada minuto:

- `process-domain-events.ts` imprime al stdout el conteo procesado. Si todo
  está sano: `{ "events": 0, "delivered": 0, "failed": 0 }` los primeros días
  (sin actividad). Cuando se coloque la primera orden: `{ "events": 1+, ... }`.
- `process-webhook-deliveries.ts` similar.

Alarmas a configurar (Uptime Kuma o Sentry):
- `EventDelivery` count con `status=FAILED` > 10 en 1 hora.
- Worker que no corre en > 5 min (sin output reciente).
