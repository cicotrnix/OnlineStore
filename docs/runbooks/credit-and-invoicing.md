# Runbook — Credit limits and invoicing

## Credit settings (per organization)

Configurable at `/admin/customers/:id/credit`:
- `creditLimit: Decimal | null` — max outstanding balance. `null` = no credit, NET terms blocked.
- `paymentTerms: PREPAID | NET_15 | NET_30 | NET_60` — default for new orders.
- `approvalThreshold: Decimal | null` — orders ≥ this go through `/approvals`. `null` = never.
- `creditUsed: Decimal` — derived from open invoices (`PENDING + OVERDUE`).

## Invoice lifecycle

`PENDING (issued) → PAID (admin marks paid)`
`PENDING → OVERDUE (scheduled job after dueDate)`
`OVERDUE → PAID`
Any → `CANCELLED` (rare; tied to order cancellation)

## How invoices are created

Automatically:
- When a NET_TERMS order transitions to `CONFIRMED` (either directly or after approval). `createInvoiceFromOrder(orderId, tx)` runs inside the order's transaction.

Manually: not currently supported through UI — by design, every invoice traces back to an order (`Invoice.orderId` is unique).

## Marking paid

`/admin/invoices` → click **Mark paid** with optional note. The action:
1. Uses `updateMany({ where: { status: { in: ['PENDING', 'OVERDUE'] } } })` for idempotency.
2. Calls `recalcCreditUsed(organizationId)` to lower the org's credit usage.
3. Notifies the original placer.

## Scheduled jobs

- `markInvoicesOverdue` — flips `PENDING` past `dueDate` to `OVERDUE` and notifies the org owner. Run daily.
- `sendInvoiceDueSoon(daysAhead = 3)` — reminds buyers of upcoming dueDate. Run daily.

## Credit eligibility check

Called from quote acceptance (and any future NET-terms entry point):

| Reason                  | Meaning                                       |
|-------------------------|-----------------------------------------------|
| `NO_CREDIT_LIMIT`       | `creditLimit` is null but NET_TERMS requested |
| `INVOICES_OVERDUE`      | at least one invoice is `OVERDUE`             |
| `CREDIT_EXCEEDED`       | `creditUsed + orderTotal > creditLimit`       |
| `warn: 'AT_80_PERCENT'` | allowed, but utilization ≥ 80% — show warning |

## Drift recovery

If `creditUsed` ever disagrees with reality (manual SQL, restore, bug):
```ts
import { recalcCreditUsed } from '@/modules/accounts'
await recalcCreditUsed(organizationId)
```
This sums all `PENDING | OVERDUE` invoices for the org and writes back.
