# ADR 0015 — Meilisearch Cloud vs self-hosted

Date: 2026-05-26
Status: Accepted (Fase 3)

## Context

Fase 3 needs a full-text search engine with typo tolerance, filters, and sub-50ms P95. Options considered:
- **Meilisearch Cloud (Build plan, ~$30/mo)** — managed, zero ops.
- **Self-hosted Meilisearch on the same Hetzner VPS** — ~$0 incremental but extra service to monitor + backups + version upgrades.
- **Postgres full-text (`tsvector`)** — already there, but typo tolerance and ranking quality are weaker.
- **Elasticsearch / OpenSearch** — overkill for B2B catalog size; ops cost too high for current scale.

## Decision

Meilisearch Cloud Build tier. Use the official `meilisearch` Node SDK via `lib/meilisearch.ts` with a noop fallback for dev/test (when `MEILISEARCH_HOST`/`MEILISEARCH_API_KEY` are unset).

## Consequences

Positive:
- Zero ops: backups, upgrades, scaling handled by Meilisearch.
- US-East latency adequate (<50ms from Hetzner Ashburn).
- We can switch to self-hosted later: the SDK is the same, only env vars change.

Negative:
- ~$30/mo recurring cost.
- Cloud lock-in via the managed cluster URL (mitigated: same SDK works against self-hosted).
- Outbound dependency: if Meilisearch is down, search degrades to pgvector and ultimately Postgres LIKE (see ADR 0017).
