# ADR 0024 — Recommendations via pgvector (no LLM in hot path)

Date: 2026-05-30
Status: Accepted (Fase 4 Corte 3)

## Context

PDP needs "Productos relacionados" (always) and "Recomendado para ti" (logged-in con historial). Options para generar las listas:

- **A. LLM por request** — "given this product, suggest 8 related" via Anthropic. Caro (~$0.005/request), lento (>1s), poco determinista.
- **B. Embedding similarity** — pgvector cosine sobre `Product.embedding` (ya poblado por Fase 3 + Corte 1 indexer). Sub-100ms, $0 marginal por request.
- **C. Co-purchase matrix** — analytics agregadas históricas. Bueno pero requiere histórico y pipeline.

## Decision

Opción B. `modules/ai/recommendations` usa `prisma.$queryRaw` con operador `<=>` (cosine distance) sobre `Product.embedding`. Sin Anthropic SDK en este módulo.

- `getRelatedProducts(productId, orgId, limit)` — vecinos por embedding excluyendo el base. Filtra por `filterAccessibleIds` (Fase 3 ADR-adjacent) para respetar visibilidad B2B.
- `getPersonalizedRecommendations(userId, orgId, limit)` — heurística: trae las últimas 20 órdenes del user, toma hasta 3 productos seed, agrega sus vecinos vector, excluye lo ya comprado. Sin ML real.

LLM **fuera del hot path**. Opcional para generar texto "por qué te lo recomendamos" en el futuro — defer.

## Consequences

Positive:
- Latencia trivial (cosine + HNSW index ADR 0019).
- Costo $0 por request (los embeddings ya están).
- Respeta el principio dominio-como-datos: el motor sirve cualquier vertical mientras los productos tengan embeddings.
- Acceso B2B enforced en cada query via `filterAccessibleIds`.

Negative:
- Calidad depende de qué tan bien Voyage embebe los `searchableText` (name + description + SKU + category + ProductContent published). Mejora pasiva conforme el contenido crece.
- Heurística personalizada es ingenua: ignora recency weighting, dwell time, click-through. Aceptable para 12 SKUs; al escalar necesitará ML real (Fase futura).
- Cuando un producto no tiene embedding (loader nuevo sin Voyage habilitado), la sección renderea vacía. Aceptable; documentado en runbook.

## References

- `modules/ai/recommendations/service.ts`
- `components/commerce/RelatedProducts.tsx`
- `app/(storefront)/products/[slug]/page.tsx` (integración)
- ADR 0019 — HNSW index `Product.embedding`
- Spec: `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §7
