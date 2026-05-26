# ADR 0011 — Subscribe registry for approval decision hooks

Date: 2026-05-26
Status: Accepted (Fase 2)

## Context

Approvals can be raised for different subjects: orders, quotes, and (likely) future credit-limit changes or address edits. Each subject reacts differently when an `ApprovalRequest` is approved or rejected — e.g. an approved `ORDER` must transition to `CONFIRMED`, trigger invoice creation if NET terms, and run the post-approval side effects; a rejected `ORDER` must restore stock and cancel.

We needed a way for the `modules/approvals` engine to remain unaware of each subject's domain logic, while still triggering it inside the same DB transaction as the decision (otherwise we get inconsistent state on partial failure).

## Decision

Adopt a subscribe/registry pattern:

- `modules/approvals/registry.ts` exposes `subscribe(subject, handler)` and an internal `getHandlers(subject)`.
- `decide(...)` runs handlers inside the same `prisma.$transaction(tx)` that flips the request's status.
- Each owning module (e.g. `modules/orders/approval-hook.ts`) calls `subscribe('ORDER', handler)` at module load.
- `instrumentation.ts` imports all hook files at boot so handlers are registered before the first request.

## Consequences

Positive:
- `modules/approvals` doesn't import `modules/orders` (no cycles, no leaks).
- Each subject's handler runs in the same transaction as the status flip — either everything happens or nothing.
- Adding a new approvable subject is one file: a new model, a new `subscribe()`, an import line in `instrumentation.ts`.

Negative:
- Handlers must be idempotent — `decide(...)` uses `updateMany({ where: { status: 'PENDING' } })` for idempotency, and if a handler runs side effects independently, they may need their own idempotency key.
- `instrumentation.ts` becomes the boot manifest. If a developer adds a hook file but forgets to import it, the handler silently never runs.

## References

- `modules/approvals/registry.ts`, `modules/approvals/service.ts`
- `modules/orders/approval-hook.ts`
- `instrumentation.ts`
