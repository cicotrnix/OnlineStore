# ADR 0020 — AIProvider abstraction + Anthropic model split (chat vs content) + nested module structure

Date: 2026-05-30
Status: Accepted (Fase 4 Fundación)

## Context

Fase 4 introduces a unified AI layer that powers content generation (Corte 1), chatbot (Corte 2), and recommendations (Corte 3). We need:

- A single abstraction so every consumer goes through the same provider (logging, budget enforcement, noop fallback when `ANTHROPIC_API_KEY` is unset).
- A model strategy that balances cost (chat = high frequency) vs quality (content gen = batch async, quality wins).
- A module structure that holds three sub-features without becoming a monolith.

## Decision

### Provider

`modules/ai/provider.ts` exposes `isAIEnabled()` + `complete(prompt, opts): AICompletion`. Backend is `@anthropic-ai/sdk`. Client is cached lazily (same pattern as `lib/meilisearch.ts::getMeilisearchClient`). Without `ANTHROPIC_API_KEY`, `complete` throws `AIDisabledError` and `isAIEnabled` returns false — no calls, no breakage in tests/CI/dev.

`AICompleteOptions` carries an optional `model` override; default falls back to `storeConfig.ai.model`.

### Model split per use case

Configured via `store.config.ts::ai`:

- `chatModel: 'claude-haiku-4-5-20251001'` — chatbot (Corte 2). Alta frecuencia, latencia importa, costo barato.
- `contentModel: 'claude-sonnet-4-6'` — content generation (Corte 1). Batch async, calidad > latencia.
- `model: 'claude-sonnet-4-6'` — default cuando el consumidor no especifica.

No usamos Opus por default — costo ~10× sin beneficio para los workloads de la tienda.

### Nested module structure (excepción documentada)

Convención del proyecto: un módulo cerrado = un `service.ts` por carpeta (`modules/catalog/service.ts`, etc.). `modules/ai/` rompe ese patrón con sub-archivos por responsabilidad (`provider.ts`, `budget.ts`, `content-jobs.ts`, `errors.ts`) y, en cortes siguientes, sub-directorios anidados (`modules/ai/content/`, `modules/ai/chat/`, `modules/ai/recommendations/`).

Justificación: Fase 4 es el módulo más grande del proyecto y mezcla tres dominios distintos detrás del mismo provider. Forzar `service.ts` único haría un archivo de >2000 líneas. La excepción está acotada a `modules/ai/`; el resto de los módulos sigue la convención.

## Consequences

Positive:
- Una sola abstracción para tres consumidores; uniformidad de logging, rate-limit y kill-switch.
- Cliente cacheado mantiene HTTPS keep-alive entre llamadas (importante en chat).
- Noop fallback hace que dev/test/CI funcionen sin API key — mismo patrón que Voyage/Resend/Meilisearch.
- Cambiar modelo es un edit en `store.config.ts`, no en código.

Negative:
- Tres modelos en config = tres sitios donde gastar tokens; el contador de presupuesto (ADR-adjacent: ver `modules/ai/budget.ts`) es la red de seguridad obligatoria.
- Estructura anidada exclusiva de `modules/ai/` rompe ligeramente la convención global; cualquier developer nuevo debe leer este ADR.
- Anthropic SDK lock-in. Migrar a otro proveedor LLM = una sola implementación de `provider.ts` a rehacer, pero el resto del módulo no cambia.

## References

- `modules/ai/provider.ts`
- `modules/ai/index.ts`
- `store.config.ts` — bloque `ai`
- `modules/config/schemas.ts` — Zod del bloque `ai`
- Spec: `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §3, §14.10
