# Changelog

## v3.0.0 — 2026-05-26 — Phase 3: Search & Discovery

### Added
- Hybrid search: Meilisearch (full-text + typo tolerance) + Voyage AI semantic embeddings (voyage-3-lite, 512 dims) merged via Reciprocal Rank Fusion (k=60).
- Exact-SKU pre-check: queries matching `/^[A-Z0-9-]{3,32}$/i` skip RRF and return the matching product directly.
- Graceful degradation cascade: Meilisearch fails → vector-only; vector fails → Meilisearch-only; both fail → Postgres ILIKE fallback.
- Faceted filters: category, price (4 buckets), in-stock toggle. Counts computed over the accessible universe.
- Real homepage (`/`): hero, tagline, prominent search bar, featured products grid. Replaces the Fase 0 "Coming soon" placeholder.
- `/search` page: facet sidebar, results grid, pagination, anonymous rate-limit (10/min, 100/h per IP), aria-live result count.
- SearchBar component in the storefront header.
- `/admin/search` panel: queue stats (pending/processing/done/failed), one-click reindex-all, inline retry for failed items.
- Real-time eventually-consistent indexer: `SearchIndexQueue` table drained every 1 min by Coolify scheduled service, with `FOR UPDATE SKIP LOCKED` for safe parallelism. Up to 5 attempts per item before FAILED.
- Weekly cleanup task resets `PROCESSING` items stuck > 1 h back to `PENDING`.
- Catalog access push-down to Meilisearch filter (private products / categories) + defense-in-depth post-RRF filter.
- Category-privacy toggle re-enqueues all products in the category.
- Module `modules/search/`: closed surface — query, enqueueIndex, processIndexQueue, mergeRankings, computeFacets, filterAccessibleIds, embeddings.
- Library wrappers: `lib/meilisearch.ts`, `lib/voyage.ts` (with split retry policies for query vs document paths), `lib/rate-limit.ts` (in-memory LRU).
- Ops scripts: `process-search-index-queue`, `cleanup-stale-search-queue`, `bootstrap-search-index`, `init-meilisearch-index`.
- Optional `identity.tagline` field in `store.config.ts`.

### Schema
- New model `SearchIndexQueue` with `SearchIndexAction` / `SearchIndexStatus` enums.
- New columns `Product.embedding` (`vector(512)`), `embeddingUpdatedAt`, `searchableText`.
- HNSW index `product_embedding_hnsw_idx` (`vector_cosine_ops`, m=16, ef_construction=64).

### Tests
- Vitest: 157 passing (+ 6 skipped) across 32 files.
- Playwright E2E: 6 new tests for homepage + anonymous search + private hidden + admin gate.
- All gates green: lint, typecheck, test, build.

### Docs
- ADRs 0015-0019: Meilisearch Cloud vs self-host; Voyage AI choice; RRF + exact-SKU pre-check; cron worker vs background service; Prisma `Unsupported("vector(512)")` pattern.
- Runbooks: `search-operations`, `search-reindex`, `search-troubleshooting`.

### Manual ops post-deploy
- Coolify env vars: `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `VOYAGE_API_KEY`.
- Coolify scheduled tasks: `process-search-index-queue` `* * * * *`, `cleanup-stale-search-queue` `0 3 * * 0`.
- Run `init-meilisearch-index` once on VPS to set up the Meilisearch index.
- Run `bootstrap-search-index` once to enqueue the existing catalog.
