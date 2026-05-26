# Runbook — Quotes (RFQ) workflow

## States

`DRAFT → SUBMITTED → QUOTED → (ACCEPTED | REJECTED) → CONVERTED (if ACCEPTED)`
`QUOTED → REVISED → QUOTED` (admin can re-quote, increments `revisionCount`)
`SUBMITTED|QUOTED → EXPIRED` if `validUntil` passed (scheduled job)

## Buyer flow

1. From any product page, click **Solicitar cotización** → adds to current `DRAFT` (one per user+org).
2. Go to `/quotes/draft` → review lines, add notes, submit.
3. Wait for admin to quote. Notification email goes to buyer on `QUOTED`.
4. At `/quotes/:id`, choose `paymentMethod` (PREPAID or NET_TERMS) + billing/shipping addresses, then **Aceptar** or **Rechazar**.

## Admin flow

1. `/admin/quotes` shows all quotes, filterable by status.
2. Open a `SUBMITTED` quote → fill quoted unit prices per line, `validUntil` date, optional admin notes.
3. Choose `quote` (first time) or `revise` (re-quoting). Both transition to `QUOTED` and notify buyer.

## On acceptance — automatic side effects

If the org has `paymentMethod: NET_TERMS` and `credit` is enabled:
- Run `checkCreditEligibility` → on fail, the action throws `CreditExceededError | InvoicesOverdueError | FeatureDisabledError`. Surface this clearly to the user.

If `approvals` is enabled and `orderTotal >= approvalThreshold`:
- Create `ApprovalRequest(PENDING)`; the order is created in `PENDING_APPROVAL`. Wait for admin to decide.

If approved or no approval needed:
- Order moves to `CONFIRMED`; if NET_TERMS, an `Invoice(PENDING)` is auto-created with `dueDate = now + termsDays`.

## Scheduled jobs

- `markExpiredQuotes` — flips `SUBMITTED|QUOTED` past `validUntil` to `EXPIRED`. Run daily.
- `sendExpiringSoon` — notifies buyers of quotes expiring in <3 days. Run daily.
- `cleanupStaleDrafts(daysOld=30)` — deletes `DRAFT` quotes untouched for N days. Run weekly.

## Common failures

| Error                       | Cause                                     | Fix                                  |
|-----------------------------|-------------------------------------------|--------------------------------------|
| `QuoteExpiredError`         | buyer tries to accept after `validUntil`  | Admin re-quotes with new `validUntil` |
| `CreditExceededError`       | NET_TERMS quote total exceeds available   | Pay open invoices, raise limit, or PREPAID |
| `InvoicesOverdueError`      | any invoice `OVERDUE`                     | Pay overdue, then retry              |
| `FeatureDisabledError(rfq)` | `modules.rfq=false` in store.config       | Enable flag                          |
