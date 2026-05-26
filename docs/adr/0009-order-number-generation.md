# ADR 0009 · Generación de orderNumber: Postgres sequence por año

- Status: Aceptado
- Fecha: 2026-05-26

## Contexto

Las órdenes B2B necesitan un identificador legible y secuencial por año (formato `ORD-YYYY-NNNNNN`). Debe ser:
- **Único** sin colisiones bajo concurrencia.
- **Secuencial** dentro del año (no UUID, no random).
- **Resettable** en cambio de año.

## Decisión

**Una sequence Postgres dedicada por año**, creada lazy en el primer order del año.

```sql
CREATE SEQUENCE IF NOT EXISTS order_seq_2026 START 1;
SELECT nextval('order_seq_2026');
```

Implementación en `modules/orders/orderNumber.ts`:

1. Calcula `year = new Date().getFullYear()`.
2. Adquiere `pg_advisory_xact_lock(hashtext('order_seq_' || year))` para serializar la creación (evita la race condition donde dos transacciones intentan `CREATE SEQUENCE IF NOT EXISTS` simultáneamente).
3. Ejecuta `CREATE SEQUENCE IF NOT EXISTS order_seq_{year} START 1`.
4. Commit del advisory lock.
5. Llama `SELECT nextval('order_seq_{year}')` (atómico per-design de Postgres, sin lock necesario).
6. Formatea `ORD-{year}-{nextval padded to 6 digits}`.

## Consecuencias

Positivas:
- `nextval` es la primitiva más rápida y segura de Postgres para counters concurrentes.
- Cero contención bajo carga (no advisory lock en hot path, solo en creación lazy).
- Cada año arranca limpio en `000001`.
- Tests cubren: 1 secuencial, 50 concurrentes sin colisión, cambio de año.

Negativas:
- **Sequences viven fuera de Prisma**: `prisma migrate` no las gestiona. La sequence se crea runtime, no aparece en el historial de migraciones.
  - Trade-off aceptado: facilidad operativa vs migración formal por año.
  - Documentado en runbook para que ops no se sorprenda.
- **Replicación lógica de sequences es limitada en Postgres ≤ 16**: si en el futuro se va a HA con logical replication (read replicas), `nextval` no sincroniza automáticamente. Hay que usar replicación física o coordinar sequences manualmente. Para Fase 1 single-node esto no aplica.
- **Backups con `pg_dump`**: estado de la sequence se preserva. Restore continúa desde último `nextval` saved.

## Alternativas descartadas

- **`COUNT(*) + 1`**: race condition incluso con `SERIALIZABLE` — dos trx leen el mismo N y ambas insertan N+1. Falla en concurrencia.
- **UUID**: cumple unicidad pero rompe legibilidad y orden cronológico humano.
- **`MAX(orderNumber) + 1` con advisory lock**: serializa el hot path, mata throughput bajo carga. `nextval` lo hace lock-free.
- **Tabla de counters propia**: reimplementa lo que `SEQUENCE` ya hace mejor.
