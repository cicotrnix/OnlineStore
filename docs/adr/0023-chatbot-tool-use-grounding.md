# ADR 0023 — Chatbot grounded via tool-use (anti-hallucination + B2B access)

Date: 2026-05-30
Status: Accepted (Fase 4 Corte 2)

## Context

Corte 2 introduces a storefront chatbot that answers product questions like "battery for iPhone 14 Pro?". A naive approach — feed the catalog into the system prompt — has three problems:

1. **Hallucinations.** The model invents products, prices, or specs that don't exist.
2. **B2B access leakage.** The same prompt for everyone leaks private products to orgs without access.
3. **Stale data.** Prompt baked at deploy time; catalog changes don't reach the bot until next deploy.

## Decision

The bot uses **Anthropic tool-use** with three acotated tools instead of catalog-in-prompt:

- `searchProducts(query)` — full-text over name/SKU/description, filtered by `filterForOrg`.
- `getProductDetail(productId)` — single product attributes + resolved price + stock.
- `checkCompatibility(model)` — products whose `compatibleModels` array contains `model`.

Every tool handler runs server-side with the request's `(orgId, locale)` context. Pricing always goes through `pricingService.resolveForOrg` (Fase 1) so logged-in users see their negotiated price. Visibility always goes through `catalog.filterForOrg` (Fase 2) so private products only surface for granted orgs.

The system prompt instructs the model:
- "ONLY answer using data from the provided tools. Do not invent."
- "If a tool returns ok=false, direct the user to support."
- "Stay strictly on-topic. Refuse off-topic politely."
- "Respond in the user's locale."

User input never reaches a prompt with execution power — it's an argument the LLM passes to tools, and tools validate inputs (Zod-style at the call site).

The loop has a hard cap (`MAX_TOOL_ROUNDS = 5`) and returns a "limit reached, contact support" message if the model keeps calling tools without producing text.

## Consequences

Positive:
- Bot can't invent products, prices, or specs. Every claim traces to a tool result that traces to the DB.
- B2B access enforced at tool boundaries; impossible for the bot to leak a private product even if user-prompted to.
- Catalog updates are live — no redeploy, no prompt cache.
- Adding a new capability = adding one more tool handler. The model picks it up from the schema.
- Logging includes `toolCalls[]` trace — observable in Pino which tools the bot used.

Negative:
- More round-trips per query (model calls tool, tool runs, model gets result, model produces text). Latency is the cost of safety. Mitigated by choosing **Haiku 4.5** (fast, cheap) for chat.
- Tools must be carefully scoped; granting "raw SQL access" tool would defeat the purpose.
- The bot can refuse aggressively (off-topic guardrail). Tune system prompt if too restrictive.

## References

- `modules/ai/chat/tools.ts` — `TOOL_SCHEMAS` + `handleTool`
- `modules/ai/chat/service.ts` — `runChat` loop
- `app/api/ai/chat/route.ts` — request handler with rate-limit
- `components/commerce/ChatWidget.tsx` — UI
- Spec: `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §6
