# ADR 0016 — Voyage AI for semantic embeddings

Date: 2026-05-26
Status: Accepted (Fase 3)

## Context

Hybrid search needs an embedding model. Constraints:
- Reasonable quality for short B2B product texts (name + description + SKU + category).
- Affordable at our scale (10k SKUs initial, low query volume).
- Compact dimensionality so pgvector HNSW stays fast.
- Easy to swap if necessary.

Options:
- **Voyage AI `voyage-3-lite`** — 512 dims, free tier 50M tokens, recommended by Anthropic for retrieval.
- **OpenAI `text-embedding-3-small`** — 1536 dims (cuts to 512 possible), paid only.
- **Self-hosted via Ollama** — extra ops, GPU helpful, latency higher on CPU.
- **Cohere** — comparable to Voyage but no free tier.

## Decision

Voyage `voyage-3-lite`, 512 dims, accessed via direct HTTP (`lib/voyage.ts`) — no SDK because the Voyage SDK is immature; one fetch wrapper is enough.

Retry policies differ by call path:
- **Search path (`embedQuery`)** — fail fast (1 retry max). User is waiting; degrade to Meilisearch-only.
- **Indexer path (`embedDocument`)** — full exponential backoff (5 retries: 1s/2s/4s/8s/16s). Async, quality wins.

## Consequences

Positive:
- Free tier covers ~2-3 years at current projected volume.
- 512 dims keeps HNSW index small and queries fast.
- Single env var (`VOYAGE_API_KEY`) gates the whole thing; missing → search runs Meilisearch-only with no errors.
- Easy migration path: change one wrapper if we move to Cohere/OpenAI/Ollama.

Negative:
- Vendor lock to a smaller company than OpenAI/Cohere — riskier longevity.
- Quality is good but not best-in-class (3-large would be better; we're optimizing cost).
- Token-limited; bulk re-embed (>50M tokens) would require paid tier (~$0.02/1M).
