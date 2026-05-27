# Runbook — Search reindex

## When to do a full reindex

- After a Meilisearch settings change (searchable/filterable attrs, stop words, ranking rules) — Meilisearch reindexes its internal structures from the documents.
- After a schema change that affects searchable text (e.g. add brand field).
- After a bulk catalog import.
- Bootstrap immediately after Phase 3 deploy.

## How

### Option 1 — Admin UI (preferred for small catalogs)

`/admin/search` → **Reindex todo**. Enqueues `UPSERT` for every product. Worker drains at 20 items/min.

### Option 2 — Bootstrap script (for big catalogs)

```bash
ssh deploy@<vps> "cd /app && pnpm tsx scripts/bootstrap-search-index.ts"
```

Same result as the admin button, but skips the UI roundtrip.

## How long

- ~20 items per worker tick (1 min).
- 6 SKUs (seed demo): ~1 min
- 1,000 SKUs: ~50 min
- 10,000 SKUs: ~8 h (assuming Voyage rate limits don't kick in)

For the 10k-SKU case, expect:
- First 4-8 h: degraded mode (`/search` falls back to ILIKE for un-indexed items).
- After completion: full hybrid mode.

## Meilisearch index init

First-time setup (run once per Meilisearch cluster):

```bash
ssh deploy@<vps> "cd /app && pnpm tsx scripts/init-meilisearch-index.ts"
```

Creates the `products` index, sets `searchableAttributes`, `filterableAttributes`, `sortableAttributes`, `displayedAttributes`, stop words, ranking rules. Idempotent — safe to re-run.

## Watching progress

`/admin/search` shows live counts. Pending should drop, Done should rise. If Failed grows, fix the root cause (Voyage key, Meilisearch reachability) and **Reintentar** the failed rows.

## Aborting

Stop the Coolify scheduled task (pause `process-search-index-queue`). Pending rows stay in the queue; resuming the task picks up where it left off — the queue is FIFO with `FOR UPDATE SKIP LOCKED`.
