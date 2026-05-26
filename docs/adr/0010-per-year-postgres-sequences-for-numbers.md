# ADR 0010 — Per-year Postgres sequences for quote, invoice (and order) numbers

Date: 2026-05-26
Status: Accepted (Fase 2)

## Context

Fase 2 introduces `Quote` and `Invoice` entities, each requiring a stable, monotonic, human-readable number (e.g. `Q-2026-00001`, `INV-2026-00042`). Fase 1 already established the same need for `Order`.

We considered three options:

1. **In-process counter (e.g. `Math.max(id) + 1`)** — race-prone under concurrency, breaks across multiple processes.
2. **CUID/UUID** — uniqueness is fine, but customers reject opaque references on PDFs and emails.
3. **Postgres sequences scoped per year** — sequential, gap-tolerant, race-free.

## Decision

Use one Postgres sequence per (entity, year), created lazily on first use:

- `order_seq_YYYY`
- `quote_seq_YYYY`
- `invoice_seq_YYYY`

Creation is wrapped in `pg_advisory_xact_lock` so concurrent `CREATE SEQUENCE IF NOT EXISTS` calls don't conflict, then `nextval(...)` returns the next integer atomically. Formatting (`Q-2026-00001`) happens in TypeScript.

## Consequences

Positive:
- Numbers are unique per year, padded to 5 digits, and never repeated across processes.
- Year prefix is visible to customers and aligns with accounting conventions.
- Sequences are independent — invoice gap doesn't affect quotes.

Negative:
- Year rollover requires no migration but adds one-time advisory lock cost on Jan 1.
- Schema is no longer 100% declarative; sequences live in raw SQL migrations (`prisma/migrations/.../migration.sql`).
- Restore from logical backup must include sequence values (Postgres `pg_dump` handles this).

## References

- `modules/quotes/numbers.ts`, `modules/accounts/numbers.ts`, `modules/orders/numbers.ts`
- Migration: `prisma/migrations/20260526183610_phase2_sql_custom/migration.sql`
