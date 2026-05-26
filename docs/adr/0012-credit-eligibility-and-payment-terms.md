# ADR 0012 — Credit eligibility check before NET-terms orders

Date: 2026-05-26
Status: Accepted (Fase 2)

## Context

When `credit` is enabled and an organization places (or accepts a quote with) `paymentMethod: NET_TERMS`, we must:

- block if no `creditLimit` is set
- block if any existing invoice is `OVERDUE`
- block if `creditUsed + orderTotal > creditLimit`
- warn (but not block) at 80% utilization

A simple boolean "approved/not" return loses the failure reason, which is needed for clear UX and audit. We also need to keep this in one place so all entry points (storefront checkout, quote-to-order conversion, admin override) share the same gate.

## Decision

`modules/accounts/credit.ts` exposes `checkCreditEligibility({ organizationId, orderTotal })` which returns:

```
{ allowed: true, warn?: 'AT_80_PERCENT' }
| { allowed: false, reason: 'NO_CREDIT_LIMIT' | 'INVOICES_OVERDUE' | 'CREDIT_EXCEEDED' }
```

Consumers translate `allowed: false` into a typed error (`CreditExceededError`, `InvoicesOverdueError`) and surface it to the user. The `recalcCreditUsed(organizationId)` helper re-derives `creditUsed` from open invoices and is called after invoice creation/payment.

## Consequences

Positive:
- Single source of truth for credit decisions.
- Easy to add new failure reasons (e.g. credit hold flag).
- `recalcCreditUsed` lets us heal `creditUsed` drift from any source (manual write, restore).

Negative:
- Each entry point must remember to call the check; nothing in the DB prevents a direct insert from skipping it. We accept this — DB constraints would over-couple credit to order schema.
- The check is read-then-write; a true high-concurrency race could in principle let two orders both pass the check before either is recorded. In practice quote/order rates are low enough that this is acceptable. Future option: `SELECT ... FOR UPDATE` on the organization row inside the order transaction.

## References

- `modules/accounts/credit.ts`
- `modules/quotes/conversion.ts` (calls check on NET_TERMS quote acceptance)
- `lib/errors.ts` (typed errors)
