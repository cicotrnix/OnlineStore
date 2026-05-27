# Runbook — Search operations

## Daily checks

- `/admin/search` — Pending / Processing / Done / Failed counts.
  - Pending steady > 0 across many ticks → worker not running. Check Coolify scheduled service log.
  - Failed > 0 → inspect last 20 fails table; click **Reintentar** for transient errors (rate limits, network).
- Coolify scheduled tasks panel — verify last run timestamp for both `process-search-index-queue` (1 min) and `cleanup-stale-search-queue` (weekly).

## Manual worker tick

```bash
ssh deploy@<vps> "cd /app && pnpm tsx scripts/process-search-index-queue.ts"
```

Logs go to Pino. Inspect last log line for `result.processed`, `result.failed`.

## Force a single product re-index

From any platform-admin shell:

```ts
import { enqueueIndex } from '@/modules/search'
await enqueueIndex('<productId>', 'UPSERT')
```

Or via admin UI: edit the product (toggle privacy / save) → server action calls `enqueueIndex` automatically.

## Manual delete from index

If a product was deleted at the DB level (rare; we prefer `isActive=false`), enqueue a DELETE:

```ts
await enqueueIndex('<productId>', 'DELETE')
```

The worker promotes UPSERT to DELETE automatically if the product is missing or inactive — usually you don't need this.

## Verifying search end-to-end

1. `/admin/search` — Done count > 0
2. `/search?q=<query>` — results appear
3. `/search?q=<sku>` — exact-SKU mode (URL shows `mode exact-sku` in the meta line)

## When to escalate to Cowork

- Meilisearch cluster unreachable for >15 min.
- Voyage API persistent failures (free tier exceeded, key revoked).
- HNSW index corruption (rare; symptom: vector queries return wrong neighbors).
