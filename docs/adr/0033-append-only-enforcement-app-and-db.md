# ADR 0033 — Append-only enforcement: guard app + rol DB

Fecha: 2026-06-01 (Fase 5 Cortes 2/3)

## Estado

Aceptado en capa app. Hardening DB pendiente (Herney provisiona).

## Contexto

Asientos contables y `PaymentEvent` son evidencia forense. Cualquier `UPDATE`/`DELETE` rompe auditoría. Necesitamos enforcement de **dos capas**: la app no debe poder hacerlo (defensa en profundidad) **y** el rol Postgres que ejecuta la app no debe tener permiso (último recurso).

## Decisión

**Capa 1 — App (commit Fase 5 Corte 3)**:
- `lib/db/client.ts` extiende `PrismaClient.$extends.query.$allModels.$allOperations`.
- Lista `APPEND_ONLY_MODELS = ['JournalEntry', 'JournalLine', 'PaymentEvent']` (NO `DomainEvent` — su `status` es mutable por diseño).
- Lista `APPEND_ONLY_BLOCKED = ['update', 'updateMany', 'delete', 'deleteMany', 'upsert']`.
- Cualquier op bloqueada → throw `APPEND_ONLY_VIOLATION` con stacktrace.
- Tests usan `APPEND_ONLY_GUARD=off` (`tests/setup.ts`) para que `cleanDb` pueda truncar entre tests.

**Capa 2 — DB (pendiente)**:
- Rol Postgres `app_rw` con grants:
  - `SELECT, INSERT` en `JournalEntry`, `JournalLine`, `PaymentEvent`, `DomainEvent`.
  - `UPDATE` solo en `DomainEvent.status` (necesario para dispatcher).
  - Sin `DELETE` en ninguna.
- `app_admin` separado tiene `UPDATE/DELETE` para emergencias auditadas (cleanup retención + correcciones manuales con paper trail).
- Coolify hoy usa `postgres` user único. Migración documentada en runbook `docs/runbooks/append-only-db-hardening.md`.

## Consecuencias

- Bug en app que intente UPDATE en ledger → fail-fast en dev, no propaga a prod.
- Compromiso de credenciales `app_rw` no permite borrar evidencia.
- Cleanup de retención (`scripts/cleanup-domain-events.ts`) usa `app_admin` o `postgres` directo.

## Alternativas descartadas

- Solo guard app: una credencial expuesta + bypass del guard via raw SQL = limpieza de evidencia.
- Solo DB role: un bug app que llame `update` falla en runtime sin warning previo — diff vs guard app es tarde.
