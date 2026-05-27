# ADR 0017 — Reciprocal Rank Fusion with exact-SKU pre-check + graceful fallback

Date: 2026-05-26
Status: Accepted (Fase 3)

## Context

Hybrid search combines Meilisearch (full-text) and pgvector (semantic). Three concerns:

1. **How to fuse rankings.** Score normalization across two engines with different scales is fragile. We want a parameter-free merger.
2. **Exact-SKU lookups.** B2B buyers type SKUs directly (e.g. `COS-001`). RRF can dilute the obvious answer with semantic noise.
3. **Both engines down.** Storefront should still surface something, not 500.

## Decision

Three-layer cascade:

1. **Exact SKU pre-check.** If query matches `/^[A-Z0-9-]{3,32}$/i` AND a product with that SKU exists AND is accessible to the org → return directly (mode `exact-sku`). Skip Meilisearch + RRF entirely.
2. **RRF with k=60.** `score(id) = sum(1/(60 + rank))` across both rankings. Parameter-free; standard literature value for k. No per-engine weighting.
3. **`fallback-like` mode.** If both Meilisearch and pgvector return zero hits (typically: both engines down, or the query is too obscure), fall back to Postgres `ILIKE` over name/sku/description.

Search mode is exposed in the result for observability (`hybrid | meili-only | vector-only | fallback-like | exact-sku`).

## Consequences

Positive:
- "Type the SKU, get the product" UX is preserved — Meilisearch can't dilute it.
- RRF needs no tuning when adding/changing engines.
- Storefront never serves a search error: at minimum, ILIKE returns something.
- Mode tag in result lets us monitor degraded operation via Pino logs.

Negative:
- The SKU regex is opinionated. Catalogs with SKUs like `foo bar 123` (with spaces or lowercase only) bypass the fast path.
- Pure RRF treats both engines as equal. If Voyage starts returning low-quality results across the board, hybrid mode will rank worse than Meilisearch alone. Mitigation: per-store `semanticSearch=false` flag turns Voyage off entirely.
- ILIKE fallback is slow (sequential scan) on large catalogs; OK at our scale, would need GIN index at 100k+ SKUs.
