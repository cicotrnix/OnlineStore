# Runbook — AI content generation

## Daily checks

- `/admin/products/[id]` muestra `ProductContent` por locale (`en-US`, `es-419`) con su `status` (DRAFT/PUBLISHED).
- Verificar que el scheduled task `process-ai-content-jobs` corre cada minuto en Coolify (mismo patrón que `process-search-index-queue`).
- Sentry: monitorear `AIBudgetExceededError`, `AIDisabledError`, fallos repetidos del worker.
- Pino logs: cada llamada al LLM emite `{ model, usage: { inputTokens, outputTokens } }` en `'ai completion'`. Buscar costos anómalos.

## Encolar contenido

### Por producto (admin UI)
`/admin/products/[id]` → botón "Generar / Regenerar (EN + ES)" → encola dos jobs.

### Bulk (todo el catálogo)
`/admin/products` → botón "Generar contenido AI (todos)" → encola `productos × LOCALES` jobs.

### Manual (CLI)
```ts
import { enqueueContentJob } from '@/modules/ai'
await enqueueContentJob('<productId>', 'en-US')
```

## Correr el worker

### Scheduled (prod)
Coolify scheduled service: `* * * * *` → `pnpm tsx scripts/process-ai-content-jobs.ts`.

### Manual (dev / debug)
```bash
set -a && . ./.env.local && set +a
pnpm tsx scripts/process-ai-content-jobs.ts
```

Sin `ANTHROPIC_API_KEY` el worker procesa el job y lanza `AIDisabledError` → job pasa a `FAILED` después de `MAX_ATTEMPTS=5` reintentos. Para dev sin API key, dejar la cola vacía.

## Aprobar contenido

Solo `User.isPlatformAdmin = true` puede aprobar. En `/admin/products/[id]`, sección "Contenido AI", click **Publicar** en el card del locale. El server action:

1. Verifica `isPlatformAdmin`.
2. Transiciona `ProductContent.status` de `DRAFT` → `PUBLISHED`.
3. Encola `enqueueIndex(productId, 'UPSERT')` para que Meilisearch reciba el nuevo `searchableText`.

Reindex es eventually consistent: requiere que el worker `process-search-index-queue` esté corriendo.

## Budget (kill-switch)

Env: `AI_MONTHLY_TOKEN_BUDGET` (`0` o ausente = sin límite).

Contador: tabla `AiUsage` con una fila por `periodYm` (`YYYY-MM`). `recordUsage(tokens)` incrementa después de cada llamada exitosa. Antes de cada llamada, `complete()` consulta `isBudgetExceeded()` y lanza `AIBudgetExceededError` si excede.

Auditar uso actual:
```ts
import { prisma } from '@/lib/db/client'
const r = await prisma.aiUsage.findMany({ orderBy: { periodYm: 'desc' } })
```

Resetear (no recomendado fuera de pruebas):
```sql
DELETE FROM "AiUsage" WHERE "periodYm" = '2026-05';
```

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Todos los jobs `FAILED` después de 5 attempts | `ANTHROPIC_API_KEY` ausente en prod | Setear en Coolify env vars, restart |
| Jobs en `PENDING` sin moverse | Scheduled task no corre | Verificar cron Coolify, restart task |
| Contenido publicado no aparece en search | `process-search-index-queue` parado | Restart scheduled task de search |
| `AIBudgetExceededError` constante | Budget mensual agotado | Subir `AI_MONTHLY_TOKEN_BUDGET` o esperar al mes siguiente |
| "store.config.identity.brandVoice missing" | Config rota | Verificar bloque en `store.config.ts` |
| Sección AI vacía en admin para todos los productos | Flag `ai.content` en `false` | Confirmar `store.config.ai.content = true` |

## Modelo

- Content gen: `claude-sonnet-4-6` (configurado en `store.config.ai.contentModel`).
- Cambiar modelo: edit `store.config.ai.contentModel` + redeploy. No requiere migración.
- Chat (Corte 2 cuando se active): `claude-haiku-4-5-20251001`.

## Costos esperados (orientativos)

Para 12 productos × 2 locales = 24 generaciones por bulk:
- ~150-300 input tokens prompt + ~800-1200 output tokens contenido por job.
- Sonnet 4.6 pricing: bulk ~$0.20-0.40 USD.

Regenerar es idempotente: la cola tiene dedup por `(productId, locale)` PENDING.
