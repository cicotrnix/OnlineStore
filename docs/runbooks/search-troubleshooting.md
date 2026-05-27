# Runbook — Search troubleshooting

## Symptom matrix

| Symptom                                            | First check                                            | Likely cause / fix                                   |
|----------------------------------------------------|--------------------------------------------------------|------------------------------------------------------|
| `/search` returns 0 hits for known product         | `/admin/search` Done count                             | Queue not drained yet. Wait 1-2 ticks or hit `process-search-index-queue.ts` manually. |
| All searches in `fallback-like` mode               | `MEILISEARCH_HOST` env var set?                        | Missing var → noop fallback → ILIKE only. Set in Coolify. |
| Hybrid mode never appears                          | `VOYAGE_API_KEY` env var, `modules.semanticSearch`     | Either disabled. Set var, ensure `semanticSearch=true`. |
| Failed count climbing on `/admin/search`           | Inspect `lastError` column                             | `429` → Voyage rate limit (wait, then **Reintentar**). `5xx` → Meilisearch transient. `401` → bad key. |
| Private product appears for anonymous              | `OrganizationCatalogAccess` grants + Meilisearch doc   | Re-index that product: server action toggle privacy → enqueues UPSERT. Meilisearch filter rebuilds. |
| `/admin/search` 404 for a real platform admin      | `User.isPlatformAdmin = true`?                         | Set the flag in DB. |
| Worker not running (Pending grows continuously)    | Coolify scheduled service log                          | Restart task. Check `enqueuedAt` for oldest PENDING — that's your lag. |
| `PROCESSING` rows stuck                            | `enqueuedAt` older than 1 hour                         | Run `cleanup-stale-search-queue.ts` (or wait for Sunday 03:00 UTC tick). Cleanup resets to PENDING. |
| Rate-limit error on anonymous search               | IP burst                                               | Expected. User waits N seconds (shown in UI) or signs in. |
| pgvector query slow                                | HNSW index exists?                                     | `\di product_embedding_hnsw_idx` in psql. Recreate from migration `..._phase3_hnsw_index` if missing. |
| Sentry alert: `EmbeddingFailedError(retryable=false)` | Voyage response body in log                          | Bad request shape, model name typo, or quota exceeded. Fix in `lib/voyage.ts` or upgrade plan. |

## Resetting the entire search state

Nuclear option for prod (use with care):

```bash
# 1. Truncate the queue
psql $DATABASE_URL -c 'TRUNCATE TABLE "SearchIndexQueue"'

# 2. Clear embeddings
psql $DATABASE_URL -c 'UPDATE "Product" SET embedding = NULL, "embeddingUpdatedAt" = NULL, "searchableText" = NULL'

# 3. Recreate Meilisearch index
ssh deploy@<vps> "cd /app && pnpm tsx scripts/init-meilisearch-index.ts"

# 4. Bootstrap
ssh deploy@<vps> "cd /app && pnpm tsx scripts/bootstrap-search-index.ts"
```

## Logs to grep

- `search index queue tick` — every worker run (Pino info)
- `search index queue error` — per-item failure with `productId`, `attempt`, `err`
- `meilisearch failed` / `pgvector failed` — query-path engine failures (degraded mode)
- `bootstrap-search-index enqueued` — bootstrap completion
- `cleanup-stale-search-queue run` — weekly cleanup with `resetCount`
