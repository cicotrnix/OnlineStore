# Runbook — Contabilidad doble partida

## Operación normal

- Posteo es automático via `accountingSubscriber` del bus. Cero acción humana en happy path.
- **Productores que emiten `invoice.issued`** (revenue recognition accrual):
  - `ordersService.placeOrder` — al colocar la orden (wire instructions email + revenue ya reconocido).
  - `handleStripeWebhook` (card capture) — idempotente, no re-emite si Invoice ya existe.
  - `reconcileWire` — defense in depth, idempotente.
- **`Product.unitCostCents`** debe cargarse por producto para que COGS postee. Si es null en un producto, su porción de COGS es 0 (no se postea esa parte).
- Verificar diariamente:
  ```sql
  SELECT
    SUM("debitCents")  AS total_debits,
    SUM("creditCents") AS total_credits
  FROM "JournalLine";
  -- Deben ser iguales.
  ```

## Reportes

### Balance de comprobación

```ts
import { trialBalance } from '@/modules/accounting'
const tb = await trialBalance({ from: new Date('2026-06-01'), to: new Date('2026-06-30') })
console.table(tb.rows)
```

### Estados financieros (TODO Fase 6)

Pendiente: Balance General + P&L vistas SQL. Por ahora derivables del trial balance + `LedgerAccount.type`.

## Cierre de período

1. Admin verifica que todos los `DomainEvent` del mes están `DONE`:
   ```sql
   SELECT COUNT(*) FROM "DomainEvent" WHERE "occurredAt" < $end_of_month AND status != 'DONE';
   ```
   Si > 0: investigar antes de cerrar.
2. Step-up auth (email-OTP).
3. `closePeriod({year, month, closedBy: adminUserId})`.
4. Post-cierre, todo posteo en ese mes → `ClosedPeriodError`.

## Corrección de errores

**Nunca** UPDATE/DELETE — el guard lo bloquea. Para corregir:

1. Crear `JournalEntry` reversor con `reversesId = entry_original.id` y líneas invertidas (debits ↔ credits).
2. Crear `JournalEntry` correcto.
3. Documentar la razón en `description`.

## Re-postear un evento

Si una regla de posteo tenía un bug y necesitas re-aplicar:

1. Identifica los `DomainEvent.id` afectados.
2. Crea **asientos reversores** para los `JournalEntry` originales.
3. Cambia la regla.
4. Re-emite los eventos via nuevo `eventId` (NO replay del original — la idempotencia por eventId lo bloquearía).

## Append-only

`JournalEntry`, `JournalLine`, `PaymentEvent` son append-only. El guard de `lib/db/client.ts` bloquea UPDATE/DELETE. Hardening DB (rol `app_rw`) está documentado en ADR 0033 y pendiente de ops.
