# Runbook — Event Bus (DomainEvent + EventDelivery)

## Operación normal

- Worker: `pnpm tsx scripts/process-domain-events.ts` — corre cada 1 min via cron Coolify.
- Cleanup: `pnpm tsx scripts/cleanup-domain-events.ts` — semanal domingo 03:00 UTC.

## Métricas a observar

- `SELECT status, COUNT(*) FROM "DomainEvent" GROUP BY status;` → alarma si `PROCESSING` > 100 (worker colgado).
- `SELECT subscriber, status, COUNT(*) FROM "EventDelivery" GROUP BY 1,2;` → alarma si `FAILED` crece sostenido.

## Diagnóstico

### Evento atascado en PROCESSING > 5 min
Reinicia worker; `UPDATE "DomainEvent" SET status='PENDING' WHERE status='PROCESSING' AND "occurredAt" < now() - interval '10 minutes';`

### Subscriber falla 5 veces → FAILED
Inspecciona `lastError`. Fix root cause; replay con:
```sql
UPDATE "EventDelivery" SET status='PENDING', attempts=0 WHERE subscriber=$1 AND status='FAILED';
UPDATE "DomainEvent" SET status='PENDING' WHERE id IN (SELECT "eventId" FROM "EventDelivery" WHERE subscriber=$1 AND status='PENDING');
```

### Agregar nuevo suscriptor
1. Implementar `Subscriber` interface.
2. `registerSubscriber` en `modules/events/subscribers.ts` boot-time.
3. Próximo dispatch entrega histórico pendiente automáticamente.

## Retención

- `DomainEvent`: 180 días. Cleanup script borra PROCESSED + DONE.
- `EventDelivery`: 90 días.
- Aumentar requiere ADR (compliance contable usa otros mecanismos).
