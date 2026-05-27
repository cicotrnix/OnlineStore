# ADR 0018 — Indexer worker as Coolify cron, not long-lived background service

Date: 2026-05-26
Status: Accepted (Fase 3)

## Context

`SearchIndexQueue` needs to be drained continuously. Options:

- **A. Coolify scheduled task** — `process-search-index-queue.ts` invoked by cron every 1 minute. Standard 5-field crontab. Cold-start each tick.
- **B. Long-lived Node worker** — separate service, internal `setInterval` loop, single process. Lower latency (~1s vs ~60s), no cold start.
- **C. BullMQ + Redis** — durable queue with workers, retries, observability.

## Decision

Option A. `* * * * *` Coolify scheduled service running `pnpm tsx scripts/process-search-index-queue.ts`.

Cleanup of stuck `PROCESSING` items is a separate scheduled task (`scripts/cleanup-stale-search-queue.ts`), `0 3 * * 0` (Sunday 03:00 UTC), to keep the main worker tiny and focused.

## Consequences

Positive:
- No new long-running process to monitor / restart / health-check.
- Coolify already manages scheduled jobs; same dashboard, same logs.
- Multiple workers can safely overlap thanks to `FOR UPDATE SKIP LOCKED` on the queue.
- Cold-start overhead (~200ms per invocation × 60/h × 24h ≈ 5 min/day on the CX33 4-vCPU box) is negligible.

Negative:
- Eventually consistent: admin save → visible in search lag is up to 60s.
- Cron min granularity is 1 minute on Coolify; we can't go faster without switching to option B.
- If a worker tick takes >1 minute, the next tick fires while the previous is running. `SKIP LOCKED` handles this safely but you may see two processes contending for new rows.

## Alternatives rejected

- **Long-lived worker** — added ops complexity, no observable benefit at our latency target.
- **BullMQ + Redis** — extra dependency, extra monthly cost for managed Redis; over-engineered for a 20-row-per-minute queue.
