# Runbook — AI recommendations

## Donde corre

- Service: `modules/ai/recommendations/service.ts`.
- Render: PDP storefront (`app/(storefront)/products/[slug]/page.tsx`) → componente `RelatedProducts`.
- Sin endpoint dedicado — todo server-side dentro del RSC del PDP.
- Sin LLM. Solo pgvector + Prisma.

## Habilitar/deshabilitar

`store.config.ts → ai.recommendations: true|false`. Cuando `false`, la sección no renderea. Sin LLM dependency, así que no hace falta `ANTHROPIC_API_KEY`.

## Cómo funciona

**Anónimo:** PDP llama `getRelatedProducts(productId, orgId=null, 8)`. SQL ordena vecinos por `embedding <=> base.embedding` (cosine), filtra por `filterAccessibleIds(null, ids)` (drop privados).

**Logueado:** PDP intenta `getPersonalizedRecommendations(userId, orgId, 8)` primero. Si el user tiene órdenes pasadas, agrega vecinos vector de los productos comprados (hasta 3 seeds), excluye lo ya comprado. Si vacío → fallback a `getRelatedProducts`.

Título dinámico: "Recomendado para ti" si personalizadas, "Productos relacionados" si fallback.

## Fallback cuando no hay embeddings

Si el producto base no tiene `embedding` (loader sin Voyage habilitado), el SQL no devuelve filas → service devuelve `[]` → componente no renderea. Sin error visible.

Para poblar: setear `ANTHROPIC_API_KEY` / `VOYAGE_API_KEY` en Coolify + correr worker de Corte 1 + Fase 3 (`process-search-index-queue` rebuilds Meilisearch y trigger embeddings via Voyage). Con embeddings poblados, recos aparecen automáticamente.

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Sección no aparece en PDP | Flag `ai.recommendations: false` | Activar en `store.config.ts` |
| Sección vacía aunque flag activo | Producto base sin embedding | Verificar `Product.embedding IS NOT NULL` en SQL; correr `bootstrap-search-index.ts` |
| Recos repiten productos privados que el user no debería ver | `filterAccessibleIds` no se ejecutó | Bug crítico — chequear service.ts; verificar `OrganizationCatalogAccess` rows |
| Recos siempre los mismos para todos | Vector espacio muy chico (12 productos) | Esperado a esta escala. Mejora con catálogo más grande |
| Personalizado igual que anónimo para user logueado | User sin órdenes | Esperado — el service cae a fallback related |
| Latencia alta en PDP | Query vector lenta | Verificar HNSW index existe: `\di product_embedding_hnsw_idx` en psql |

## Costos

$0 marginal por request. Embeddings se calculan una vez (Fase 3 / Corte 1 indexer) y se reusan para search + recomendaciones. La única llamada cara es la generación inicial del embedding, no la búsqueda de vecinos.

## Mejorar la calidad

- Reembed productos cuando cambia ProductContent published (ya pasa: `publishContent` encola `enqueueIndex` → `process-search-index-queue` regenera embedding si `searchableText` cambió).
- Para mejor personalización: agregar tracking de clicks (defer) o usar `OrderLine.qty` como weight (defer).
- Si querés LLM-generated "why recommended", llamar `complete()` con los 8 resultados + producto base. Solo para usuarios que clickean "explicar" (no auto). Defer.
