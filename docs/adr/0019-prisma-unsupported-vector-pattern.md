# ADR 0019 — `Unsupported("vector(512)")` + `$queryRaw` for pgvector columns

Date: 2026-05-26
Status: Accepted (Fase 3)

## Context

Prisma 6 has no first-class support for `pgvector`. We tried:

- **`Bytes`** to store the vector encoded — loses pgvector indexing.
- **A separate non-Prisma table** queried only via raw SQL — works but makes the Product model schizophrenic.
- **`Unsupported("vector(512)")?`** — Prisma keeps the column in the migration, but Prisma Client refuses to read/write it. Reads/writes via `$queryRaw`/`$executeRawUnsafe` with a literal `[0.1,0.2,...]`.

## Decision

Use `Unsupported("vector(512)")?` on `Product.embedding`. All access is via raw queries; we never expect `product.embedding` from the Prisma Client.

Helper: `modules/search/embeddings.ts::formatVectorForPostgres(number[])` produces the pgvector literal string. Reads use `embedding <=> $1::vector` (cosine distance) with the HNSW index from migration `..._phase3_hnsw_index`.

## Consequences

Positive:
- One source of truth for schema (Prisma migrations).
- pgvector indexing fully available via raw SQL.
- Type safety preserved for everything that isn't the vector column.

Negative — **mandatory project rule**:
- **Never** read `product.embedding` via Prisma Client. It will be `undefined` and TypeScript won't help.
- Vector updates must go through `$executeRawUnsafe` with the literal pattern; the indexer's `processItem` is the only place that does this.
- If Prisma adds native pgvector support later, we should adopt it and delete this ADR's workaround.

Code locations enforcing the pattern:
- `modules/search/index-queue.ts::processItem` — UPDATE path
- `modules/search/query.ts::fetchVectorIds` — SELECT path
- `modules/search/embeddings.ts::formatVectorForPostgres` — single formatter
