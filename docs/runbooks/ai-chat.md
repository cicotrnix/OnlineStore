# Runbook — AI chatbot

## Donde corre

- Endpoint: `POST /api/ai/chat`. Body: `{ messages: [{ role, content }] }`.
- Widget client: `components/commerce/ChatWidget.tsx` flotante, montado por `app/(storefront)/layout.tsx` cuando `storeConfig.ai.chat === true`.
- Modelo: `claude-haiku-4-5-20251001` (configurable en `store.config.ai.chatModel`).

## Deshabilitar

Editar `store.config.ts`:
```ts
ai: { ..., chat: false, ... }
```
Redeploy. El widget desaparece. El endpoint sigue respondiendo (devuelve `AIDisabledError` si tampoco hay key), pero como nadie lo llama, es benigno.

Para deshabilitar también el endpoint, vaciar `ANTHROPIC_API_KEY` en Coolify → todo cae al noop fallback.

## Rate limit

`AI_CHAT_LIMITS = { perMinute: 5, perHour: 30 }`. Keyed por `userId || ip`. Endpoint devuelve `429` con `Retry-After` cuando se excede. Widget muestra el mensaje al usuario.

Para tunear, edit `lib/rate-limit.ts`. Cambios entran al next request (no requiere restart).

## Monitoring

- Pino: cada round del loop emite `'ai chat tick'` con `{ model, usage: { input_tokens, output_tokens }, round }`.
- Pino: cada tool call queda registrado en `toolCalls[]` del result (incluido en logs si lo necesitás).
- Sentry: `AIDisabledError`, `AIBudgetExceededError`, errores de Anthropic (5xx, 429, malformed response) → status `503` al cliente.

Audit de uso vía `AiUsage` table (compartido con Corte 1).

## Tools

3 acotadas:
- `searchProducts(query)` — texto libre, filtrado por `filterForOrg`.
- `getProductDetail(productId)` — specs + precio resuelto.
- `checkCompatibility(model)` — productos cuyo `compatibleModels` array contiene el modelo.

Todas pasan por `pricingService.resolveForOrg` y `catalog.filterForOrg`. Logueado ve precio negociado + catálogo accesible. Anónimo ve precio base + catálogo público.

Agregar tool nueva:
1. Definí schema en `TOOL_SCHEMAS` (`modules/ai/chat/tools.ts`).
2. Implementá el handler.
3. Agregá rama en el `switch` de `handleTool`.
4. Test unit con `cleanDb`.

El modelo descubre la tool automáticamente desde el schema; no hay que tocar el system prompt.

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| 503 `AIDisabledError` | `ANTHROPIC_API_KEY` vacío | Setear en Coolify env, restart |
| 503 `AIBudgetExceededError` | Mes excedió `AI_MONTHLY_TOKEN_BUDGET` | Subir presupuesto o esperar |
| 429 constantes para un usuario | Posible bot scraping | Verificar IP en logs, blacklist si necesario |
| Bot menciona productos inexistentes | Tool grounding falló | Debug: inspeccionar `toolCalls` en logs; revisar `handleTool` |
| Bot revela producto privado a org sin acceso | `filterForOrg` no se llamó | Bug crítico — verificar handler que devolvió el producto |
| Bot responde off-topic | System prompt insuficiente | Ajustar `systemPrompt()` en `modules/ai/chat/service.ts` |
| Loop infinito de tool calls | Hit `MAX_TOOL_ROUNDS=5` | Devuelve "limit reached" — investigar query que lo dispara, considerar refinar prompt |
| Latencia alta (>5s) | Modelo grande o muchos rounds | Verificar `storeConfig.ai.chatModel` = Haiku; reducir `MAX_TOOL_ROUNDS` |

## Costos esperados

Haiku 4.5 input ~$0.80/MT, output ~$4/MT. Conversación típica = 2-3 rounds × ~300 tokens cada uno = ~$0.002 por query. 30 q/h × 24h = ~$1.5/día max por usuario (rate-limit ya lo acota).

## Cambiar de modelo

Edit `store.config.ts → ai.chatModel`. Sin migración. Si subís a Sonnet/Opus, monitorea costos.
