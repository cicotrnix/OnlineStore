# Changelog

## v4.0.0 — 2026-05-30 — Phase 4: AI Layer

### Added — Fundación

- `modules/ai/provider.ts` — `AIProvider` wrapper over `@anthropic-ai/sdk` with cached client, noop fallback when `ANTHROPIC_API_KEY` is missing. Throws `AIDisabledError` cleanly so dev/test/CI never break.
- `modules/ai/budget.ts` — monthly token counter (`AiUsage` table, one row per `YYYY-MM`) + kill-switch via `AI_MONTHLY_TOKEN_BUDGET` env. `complete()` checks before every call and records usage after.
- `modules/ai/content-jobs.ts` — `AiContentJob` queue cloned from Fase 3 `SearchIndexQueue` pattern (`FOR UPDATE SKIP LOCKED`, `MAX_ATTEMPTS=5`). `enqueueContentJob` idempotent by `(productId, locale)` PENDING.
- Config: canonical `ai` block (`model`/`contentModel`/`chatModel`/`content`/`chat`/`recommendations`); `identity.brandVoice` optional. Removed legacy `modules.aiChat`.
- Rate-limit presets `AI_CHAT_LIMITS` (5/min, 30/h) and `AI_CONTENT_GEN_LIMITS` (3/min, 10/h).

### Added — Corte 0.5 (i18n)

- Cookie-based locale (no path routing). `User.preferredLocale` for logged users. `lib/i18n/getLocale()` server-side with fallback chain. `LocaleSwitch` in storefront header. Helper `t(locale, key)` with dictionary in `lib/i18n/messages.ts`.

### Added — Corte 1 (content generation)

- `modules/ai/content/` — prompt builder (with domain-as-data guardrail: never invents specs), parser of section headers, service `generateContentForProduct`, `publishContent` with platform-admin gate.
- Admin UI `/admin/products/[id]` shows per-locale draft/published, Generate/Regenerate (EN+ES), Publish buttons.
- `/admin/products` adds bulk "Generar contenido AI (todos)".
- Worker `scripts/process-ai-content-jobs.ts` consumes the queue.
- PDP renders `ProductContent` published for active locale with EN fallback, plus `generateMetadata` for SEO title/description.
- 9 Pi-Power webp images imported (~50 KB each) and assigned to products by iPhone model.
- Loader `scripts/load-pipower-catalog.ts` extended with `attributes` (capacity_mAh, voltage_V, cycles, A-number, flex_included, hazmat, etc.) and `compatibleModels`.
- Badge "Tag-On Flex" in PDP and ProductCard.

### Added — Corte 2 (chatbot)

- `modules/ai/chat/` — tool-use grounding with 3 tools (`searchProducts`, `getProductDetail`, `checkCompatibility`). Every tool handler respects `filterForOrg` (Fase 2) and `pricingService.resolveForOrg` (Fase 1). `MAX_TOOL_ROUNDS=5`.
- Endpoint `POST /api/ai/chat` with rate-limit `AI_CHAT_LIMITS` by `userId || ip`.
- Floating `ChatWidget` in storefront layout, gated by `ai.chat` flag.

### Added — Corte 3 (recommendations)

- `modules/ai/recommendations/` — `getRelatedProducts` (pgvector cosine vecinos, excluding base product, filtered by access) + `getPersonalizedRecommendations` (heuristic over OrderLine history seeding more pgvector lookups). **No LLM in hot path.**
- `RelatedProducts` component in PDP with dynamic title ("Recomendado para ti" vs "Productos relacionados").

### Schema

- New: `AiUsage`, `AiContentJob` + enum `AiJobStatus`, `ProductContent` + enum `ProductContentStatus`.
- Extended: `Product.attributes Json?`, `Product.compatibleModels String[]`, `Product.content ProductContent[]`, `User.preferredLocale String?`.

### Tests

- Vitest: 208 passing (+ 6 skipped) across 47 files. New tests for provider, budget, content-jobs, prompt builder, parser, service, publish, chat tools, chat service, recommendations.
- All gates green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

### Docs

- ADRs 0020 (AIProvider + model split + nested module exception), 0021 (Product.attributes JSON vs EAV), 0022 (ProductContent multilingual), 0023 (chatbot tool-use grounding), 0024 (recommendations pgvector no LLM), 0025 (i18n cookie vs routing).
- Runbooks: `ai-content`, `ai-chat`, `ai-recommendations`.

### Manual ops post-deploy

- Set `ANTHROPIC_API_KEY` in Coolify env vars.
- Set `AI_MONTHLY_TOKEN_BUDGET` (recommended; `0` = unlimited).
- Coolify scheduled task: `process-ai-content-jobs.ts` `* * * * *`.
- Encolar bulk content gen desde `/admin/products` y aprobar contenido producto por producto.

---

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
