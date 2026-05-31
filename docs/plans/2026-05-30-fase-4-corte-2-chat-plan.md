# Fase 4 · Corte 2 — Chatbot asistente de compatibilidad

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Chatbot B2B en storefront que responde "¿qué batería para iPhone 14 Pro?" usando tool-use sobre el catálogo real. Logueado ve su precio (org); anónimo ve precio base + catálogo público. No inventa productos. Rate-limited.

**Architecture:** Sub-módulo `modules/ai/chat/`. Anthropic SDK con `tools: [...]`. 3 tools acotadas: `searchProducts(query)`, `getProductDetail(productId)`, `checkCompatibility(model)`. Cada tool handler pega a `modules/catalog`/`modules/pricing`/`modules/search` y respeta acceso B2B (Fase 2). Endpoint `POST /api/ai/chat` con streaming. Widget cliente flotante con estado local. Rate limit `AI_CHAT_LIMITS` (Corte 1.5) por IP/userId.

**Tech Stack:** `@anthropic-ai/sdk` con tool_use, Next.js Route Handler streaming via `ReadableStream`, `lib/rate-limit.ts`, `modules/search.query`, `modules/pricing.resolveForOrg`, `modules/catalog.filterForOrg`.

**Alcance:**
- 3 tools: `searchProducts`, `getProductDetail`, `checkCompatibility`.
- Streaming SSE (Server-Sent Events) o text stream via Response body.
- Widget flotante en storefront layout (botón → drawer/sheet con messages + input).
- Rate-limit per `userId || ip` con `AI_CHAT_LIMITS`.
- Detrás de `modules.ai.chat` flag (queda en `false` hasta cerrar el corte).
- Anónimo: tools usan `orgId=null` → catálogo público + precio base.
- Logueado: tools usan `session.activeOrgId` → catálogo accesible + precio resuelto.
- Si una tool no encuentra nada, devuelve `{ ok: false, hint: 'contact support@...' }`.
- ADR 0023 — grounding por tool-use (anti-alucinación).

**Fuera de alcance (defer):**
- Conversaciones persistidas (historial en DB). Por ahora ephemeral en cliente.
- Multi-turn complex (carrito, checkout vía chat). Solo "consulta + recomendación".
- Audit log de queries.
- I18n del prompt del sistema — empieza en inglés con instrucción de responder en locale del usuario.

**Spec:** `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §6 + §14 (relevantes: rate-limit propio, modelo Haiku para chat).

---

## File structure

| Archivo | Responsabilidad |
|---|---|
| `modules/ai/chat/tools.ts` | Defs de tools + handlers (con context `{orgId, locale}`) |
| `modules/ai/chat/service.ts` | `runChat({messages, userId, orgId, locale})` orquesta tool-use loop |
| `modules/ai/chat/index.ts` | Superficie pública |
| `modules/ai/chat/__tests__/tools.test.ts` | Tests TDD de cada tool handler |
| `modules/ai/chat/__tests__/service.test.ts` | Test integración con SDK mockeado |
| `app/api/ai/chat/route.ts` | POST handler con rate-limit + streaming |
| `components/commerce/ChatWidget.tsx` | Cliente flotante (button + drawer + messages) |
| `app/(storefront)/layout.tsx` | Renderiza `<ChatWidget />` si `modules.ai.chat` |
| `docs/adr/0023-chatbot-tool-use-grounding.md` | ADR del approach |

---

## Task C2.1: Tools + handlers

**Files:**
- Create: `modules/ai/chat/tools.ts`
- Create: `modules/ai/chat/__tests__/tools.test.ts`

- [ ] **Step 1: Tests (fallan primero)**

```ts
// modules/ai/chat/__tests__/tools.test.ts
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

beforeEach(async () => { await cleanDb() })

async function makeProduct(suffix: string, opts: { compat?: string[]; isActive?: boolean; isPrivate?: boolean } = {}) {
  const cat = await prisma.category.create({ data: { slug: `c-${suffix}`, name: 'Battery' } })
  return prisma.product.create({
    data: {
      sku: `S-${suffix}`, slug: `s-${suffix}`, name: `Battery ${suffix}`,
      basePrice: new Decimal('10.00'), stockQuantity: 5, categoryId: cat.id,
      isActive: opts.isActive ?? true, isPrivate: opts.isPrivate ?? false,
      compatibleModels: opts.compat ?? ['iPhone X'],
    },
  })
}

describe('chat tools', () => {
  it('searchProducts devuelve hits accesibles', async () => {
    const p = await makeProduct(`a-${Date.now()}`)
    const { handleTool } = await import('../tools')
    const r = await handleTool('searchProducts', { query: 'Battery' }, { orgId: null, locale: 'en-US' })
    expect(r.ok).toBe(true)
    expect(r.data.results.map((x: { id: string }) => x.id)).toContain(p.id)
  })

  it('getProductDetail devuelve specs + precio base anónimo', async () => {
    const p = await makeProduct(`b-${Date.now()}`)
    const { handleTool } = await import('../tools')
    const r = await handleTool('getProductDetail', { productId: p.id }, { orgId: null, locale: 'en-US' })
    expect(r.ok).toBe(true)
    expect(r.data.id).toBe(p.id)
    expect(r.data.basePrice).toBeTruthy()
    expect(r.data.priceResolved).toBeTruthy()
  })

  it('checkCompatibility filtra por compatibleModels', async () => {
    await makeProduct(`c1-${Date.now()}`, { compat: ['iPhone 14 Pro'] })
    await makeProduct(`c2-${Date.now()}`, { compat: ['iPhone 13'] })
    const { handleTool } = await import('../tools')
    const r = await handleTool('checkCompatibility', { model: 'iPhone 14 Pro' }, { orgId: null, locale: 'en-US' })
    expect(r.ok).toBe(true)
    expect(r.data.matches.length).toBe(1)
    expect(r.data.matches[0].compatibleModels).toContain('iPhone 14 Pro')
  })

  it('getProductDetail con producto inexistente devuelve ok:false', async () => {
    const { handleTool } = await import('../tools')
    const r = await handleTool('getProductDetail', { productId: 'nope' }, { orgId: null, locale: 'en-US' })
    expect(r.ok).toBe(false)
  })

  it('checkCompatibility sin matches devuelve ok:false con hint', async () => {
    const { handleTool } = await import('../tools')
    const r = await handleTool('checkCompatibility', { model: 'iPhone 99' }, { orgId: null, locale: 'en-US' })
    expect(r.ok).toBe(false)
    expect(r.hint).toMatch(/support|contact/i)
  })
})
```

- [ ] **Step 2: Implementar tools**

```ts
// modules/ai/chat/tools.ts
import { prisma } from '@/lib/db/client'
import type { Locale } from '@/lib/i18n'
import { filterForOrg } from '@/modules/catalog'
import { pricingService } from '@/modules/pricing'
import storeConfig from '@/store.config'
import type { Category, Product } from '@prisma/client'

export interface ToolContext {
  orgId: string | null
  locale: Locale
}

export type ToolName = 'searchProducts' | 'getProductDetail' | 'checkCompatibility'

export type ToolResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; hint: string }

const SUPPORT_HINT = `If you can't find a product, please contact ${storeConfig.identity.supportEmail}.`

export const TOOL_SCHEMAS = [
  {
    name: 'searchProducts',
    description: 'Search the wholesale product catalog by free-text query (name, SKU, description). Returns up to 8 accessible hits.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Free-text query' } },
      required: ['query'],
    },
  },
  {
    name: 'getProductDetail',
    description: 'Get full attributes + resolved price + stock for one product by id.',
    input_schema: {
      type: 'object',
      properties: { productId: { type: 'string' } },
      required: ['productId'],
    },
  },
  {
    name: 'checkCompatibility',
    description: 'List products compatible with a given iPhone model name (uses Product.compatibleModels).',
    input_schema: {
      type: 'object',
      properties: { model: { type: 'string', description: 'e.g. "iPhone 14 Pro"' } },
      required: ['model'],
    },
  },
] as const

async function resolveForOrgSafe(orgId: string | null, productId: string): Promise<string> {
  if (!orgId) {
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { basePrice: true } })
    return p?.basePrice.toString() ?? '0'
  }
  const price = await pricingService.resolveForOrg(orgId, productId)
  return price.toString()
}

async function searchProducts(args: { query: string }, ctx: ToolContext): Promise<ToolResult> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: args.query, mode: 'insensitive' } },
        { sku: { contains: args.query, mode: 'insensitive' } },
        { description: { contains: args.query, mode: 'insensitive' } },
      ],
    },
    include: { category: true },
    take: 24,
  })
  const visible = await filterForOrg(ctx.orgId, products as (Product & { category: Category })[])
  const top = visible.slice(0, 8)
  if (top.length === 0) return { ok: false, hint: SUPPORT_HINT }
  const results = await Promise.all(
    top.map(async (p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.stockQuantity,
      priceResolved: await resolveForOrgSafe(ctx.orgId, p.id),
      compatibleModels: p.compatibleModels,
    })),
  )
  return { ok: true, data: { results } }
}

async function getProductDetail(args: { productId: string }, ctx: ToolContext): Promise<ToolResult> {
  const product = await prisma.product.findUnique({
    where: { id: args.productId },
    include: { category: true },
  })
  if (!product || !product.isActive) return { ok: false, hint: SUPPORT_HINT }
  const visible = await filterForOrg(ctx.orgId, [product as Product & { category: Category }])
  if (visible.length === 0) return { ok: false, hint: SUPPORT_HINT }
  return {
    ok: true,
    data: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      basePrice: product.basePrice.toString(),
      priceResolved: await resolveForOrgSafe(ctx.orgId, product.id),
      stock: product.stockQuantity,
      compatibleModels: product.compatibleModels,
      attributes: product.attributes ?? {},
    },
  }
}

async function checkCompatibility(args: { model: string }, ctx: ToolContext): Promise<ToolResult> {
  const products = await prisma.product.findMany({
    where: { isActive: true, compatibleModels: { has: args.model } },
    include: { category: true },
    take: 12,
  })
  const visible = await filterForOrg(ctx.orgId, products as (Product & { category: Category })[])
  if (visible.length === 0) return { ok: false, hint: SUPPORT_HINT }
  const matches = await Promise.all(
    visible.map(async (p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.stockQuantity,
      priceResolved: await resolveForOrgSafe(ctx.orgId, p.id),
      compatibleModels: p.compatibleModels,
    })),
  )
  return { ok: true, data: { matches } }
}

export async function handleTool(name: ToolName, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  switch (name) {
    case 'searchProducts': return searchProducts(args as { query: string }, ctx)
    case 'getProductDetail': return getProductDetail(args as { productId: string }, ctx)
    case 'checkCompatibility': return checkCompatibility(args as { model: string }, ctx)
  }
}
```

- [ ] **Step 3: Gate**

```
set -a && . ./.env.local && set +a
pnpm vitest run modules/ai/chat
```

- [ ] **Step 4: Commit**

```
git add modules/ai/chat/
git commit -m "feat(ai): chat tools (searchProducts, getProductDetail, checkCompatibility) con acceso B2B"
```

---

## Task C2.2: Service `runChat` (tool-use loop)

**Files:** `modules/ai/chat/service.ts`, `modules/ai/chat/index.ts`, `modules/ai/chat/__tests__/service.test.ts`

- [ ] **Step 1: Test (mock SDK con tool_use response)**

```ts
// modules/ai/chat/__tests__/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const messagesCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: messagesCreate } },
}))
vi.mock('@/modules/ai/budget', () => ({
  isBudgetExceeded: vi.fn().mockResolvedValue(false),
  recordUsage: vi.fn().mockResolvedValue(undefined),
  currentPeriodYm: vi.fn().mockReturnValue('2026-05'),
}))
vi.mock('../tools', () => ({
  handleTool: vi.fn(),
  TOOL_SCHEMAS: [{ name: 'searchProducts', description: '', input_schema: { type: 'object', properties: {}, required: [] } }],
}))

beforeEach(() => { messagesCreate.mockReset(); vi.clearAllMocks(); process.env.ANTHROPIC_API_KEY = 'sk-test' })

describe('runChat', () => {
  it('responde con texto cuando el modelo no usa tools', async () => {
    messagesCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Hello' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const { runChat } = await import('../service')
    const r = await runChat({ messages: [{ role: 'user', content: 'hi' }], orgId: null, locale: 'en-US' })
    expect(r.text).toBe('Hello')
    expect(r.toolCalls).toEqual([])
  })

  it('ejecuta una tool y devuelve la respuesta final', async () => {
    const { handleTool } = await import('../tools')
    vi.mocked(handleTool).mockResolvedValueOnce({ ok: true, data: { results: [{ id: 'p1', name: 'Battery' }] } })

    messagesCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'tu_1', name: 'searchProducts', input: { query: 'iPhone' } }],
        usage: { input_tokens: 50, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Found 1 product: Battery' }],
        usage: { input_tokens: 80, output_tokens: 12 },
      })

    const { runChat } = await import('../service')
    const r = await runChat({ messages: [{ role: 'user', content: 'find battery' }], orgId: null, locale: 'en-US' })
    expect(r.text).toContain('Battery')
    expect(r.toolCalls).toHaveLength(1)
    expect(r.toolCalls[0].name).toBe('searchProducts')
    expect(messagesCreate).toHaveBeenCalledTimes(2)
  })

  it('aborta después de MAX_TOOL_ROUNDS', async () => {
    const { handleTool } = await import('../tools')
    vi.mocked(handleTool).mockResolvedValue({ ok: true, data: {} })
    messagesCreate.mockResolvedValue({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tu_x', name: 'searchProducts', input: { query: 'x' } }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const { runChat } = await import('../service')
    const r = await runChat({ messages: [{ role: 'user', content: 'loop' }], orgId: null, locale: 'en-US' })
    expect(r.text).toMatch(/limit/i)
  })
})
```

- [ ] **Step 2: Implementar service**

```ts
// modules/ai/chat/service.ts
import Anthropic from '@anthropic-ai/sdk'
import type { Locale } from '@/lib/i18n'
import { logger } from '@/lib/observability/logger'
import { AIBudgetExceededError, AIDisabledError } from '@/modules/ai/errors'
import { currentPeriodYm, isBudgetExceeded, recordUsage } from '@/modules/ai/budget'
import storeConfig from '@/store.config'
import { TOOL_SCHEMAS, type ToolName, handleTool } from './tools'

const MAX_TOOL_ROUNDS = 5

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RunChatInput {
  messages: ChatMessage[]
  orgId: string | null
  locale: Locale
}

export interface ToolCallTrace {
  name: ToolName
  input: Record<string, unknown>
  ok: boolean
}

export interface RunChatResult {
  text: string
  toolCalls: ToolCallTrace[]
}

let cachedClient: Anthropic | null = null
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return cachedClient
}

function systemPrompt(locale: Locale): string {
  return [
    'You are a B2B wholesale assistant for an iPhone parts catalog.',
    'You ONLY answer using data from the provided tools. Do not invent products, prices, or specs.',
    'If a tool returns ok=false, tell the user what you tried and direct them to support.',
    'Stay strictly on-topic (the store catalog). Refuse off-topic questions politely.',
    `Respond in the user's locale: ${locale}.`,
    `Brand voice: ${storeConfig.identity.brandVoice?.tone ?? 'neutral, factual'}.`,
  ].join('\n')
}

export async function runChat(input: RunChatInput): Promise<RunChatResult> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AIDisabledError()
  if (await isBudgetExceeded()) throw new AIBudgetExceededError(currentPeriodYm())

  const client = getClient()
  const toolCalls: ToolCallTrace[] = []
  const conversation: Anthropic.MessageParam[] = input.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  let round = 0
  while (round < MAX_TOOL_ROUNDS) {
    round++
    const msg = await client.messages.create({
      model: storeConfig.ai.chatModel,
      max_tokens: 1024,
      system: systemPrompt(input.locale),
      tools: TOOL_SCHEMAS as never,
      messages: conversation,
    })
    await recordUsage(msg.usage.input_tokens + msg.usage.output_tokens)
    logger.info({ model: storeConfig.ai.chatModel, usage: msg.usage, round }, 'ai chat tick')

    if (msg.stop_reason !== 'tool_use') {
      const text = msg.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('\n')
      return { text, toolCalls }
    }

    conversation.push({ role: 'assistant', content: msg.content as never })
    const toolResults: Anthropic.MessageParam['content'] = []
    for (const block of msg.content) {
      if (block.type !== 'tool_use') continue
      const result = await handleTool(
        block.name as ToolName,
        block.input as Record<string, unknown>,
        { orgId: input.orgId, locale: input.locale },
      )
      toolCalls.push({ name: block.name as ToolName, input: block.input as Record<string, unknown>, ok: result.ok })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      } as never)
    }
    conversation.push({ role: 'user', content: toolResults })
  }

  return {
    text: 'I reached the tool-call limit without producing a final answer. Please rephrase or contact support.',
    toolCalls,
  }
}
```

- [ ] **Step 3: Public surface**

```ts
// modules/ai/chat/index.ts
export { runChat } from './service'
export type { ChatMessage, RunChatInput, RunChatResult, ToolCallTrace } from './service'
export { TOOL_SCHEMAS, handleTool } from './tools'
export type { ToolName, ToolContext, ToolResult } from './tools'
```

- [ ] **Step 4: Gate**

```
pnpm vitest run modules/ai/chat
```

- [ ] **Step 5: Commit**

```
git add modules/ai/chat/
git commit -m "feat(ai): chat service runChat tool-use loop con guardrails"
```

---

## Task C2.3: Route handler + rate-limit + widget

**Files:**
- Create: `app/api/ai/chat/route.ts`
- Create: `components/commerce/ChatWidget.tsx`
- Modify: `app/(storefront)/layout.tsx`

- [ ] **Step 1: Route handler**

```ts
// app/api/ai/chat/route.ts
import { auth } from '@/lib/auth/config'
import { getLocale } from '@/lib/i18n'
import { AI_CHAT_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { runChat } from '@/modules/ai/chat'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface Body {
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(req: Request) {
  const session = await auth()
  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null
  const userId = session?.user?.id ?? null

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`chat:${userId ?? ip}`, AI_CHAT_LIMITS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  const body = (await req.json()) as Body
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const locale = await getLocale({ userId })
  try {
    const result = await runChat({ messages: body.messages, orgId, locale })
    return NextResponse.json(result)
  } catch (err) {
    const code = err instanceof Error ? err.name : 'Unknown'
    return NextResponse.json({ error: code, message: String(err) }, { status: 503 })
  }
}
```

- [ ] **Step 2: Widget**

```tsx
// components/commerce/ChatWidget.tsx
'use client'

import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (res.status === 429) {
        const body = (await res.json()) as { retryAfter: number }
        setMessages([...next, { role: 'assistant', content: `Rate limited. Try again in ${body.retryAfter}s.` }])
        return
      }
      const body = (await res.json()) as { text?: string; error?: string }
      setMessages([...next, { role: 'assistant', content: body.text || `Error: ${body.error}` }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-full bg-gray-900 text-white px-4 py-3 text-sm shadow-lg z-40"
        aria-label="Open assistant chat"
      >
        Chat
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-label="Catalog assistant"
      className="fixed bottom-4 right-4 z-40 w-80 sm:w-96 h-[28rem] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <h2 className="text-sm font-medium">Assistant</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-500 hover:text-gray-900"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500">
            Ask about products, compatibility, or SKUs. Example: "Battery for iPhone 14 Pro?"
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={
              m.role === 'user'
                ? 'ml-auto max-w-[80%] rounded-lg bg-gray-900 text-white px-3 py-2'
                : 'mr-auto max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 whitespace-pre-wrap'
            }
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-xs text-gray-500">…</p>}
      </div>
      <form onSubmit={send} className="border-t border-gray-100 p-2 flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a question…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Renderear widget en storefront layout**

En `app/(storefront)/layout.tsx`: import `ChatWidget` + `isFeatureEnabled` (si no está) + después del `<footer>` agregar:

```tsx
{isFeatureEnabled('ai.chat' as never) ?? false /* TODO: usar storeConfig.ai.chat */ && <ChatWidget />}
```

(O directamente: `import storeConfig from '@/store.config'` y `{storeConfig.ai.chat && <ChatWidget />}` — más limpio.)

- [ ] **Step 4: Gate**

```
pnpm lint:fix && pnpm typecheck && pnpm test && pnpm build
```

- [ ] **Step 5: Commit**

```
git add app/api/ai/ components/commerce/ChatWidget.tsx 'app/(storefront)/layout.tsx'
git commit -m "feat(ai): /api/ai/chat route + ChatWidget flotante + rate-limit"
```

---

## Cierre Corte 2

- [ ] **Activar flag**

`store.config.ts` → `ai.chat: true`.

Commit: `chore(ai): activar flag modules.ai.chat (Corte 2 cerrado)`.

- [ ] **ADR 0023**

`docs/adr/0023-chatbot-tool-use-grounding.md` — decisión: tool-use con 3 tools acotadas, sin entrada libre con poder; grounding por catálogo real. Acceso B2B respetado via tools que llaman `filterForOrg` + `resolveForOrg`. Mitiga prompt injection y alucinación.

Commit: `docs(adr): 0023 chatbot tool-use grounding (anti-alucinación)`.

- [ ] **Runbook**

`docs/runbooks/ai-chat.md` con: dónde corre, cómo deshabilitar (flag), monitoring (Pino tokens, Sentry errors), rate-limit, troubleshooting.

- [ ] **Gate final**

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Verde. Sin regresión.

---

## Self-Review

**Cobertura spec §6:**
- Tool-use con 3 tools ✅
- B2B pricing/access via tools ✅
- Streaming/widget ✅ (sin SSE real — JSON síncrono OK al cierre del corte; streaming puede agregarse después)
- Guardrails (off-topic, no inventa) ✅ (system prompt + tools acotadas)
- Rate-limit ✅
- Flag `ai.chat` se activa al cierre ✅

**Scope cut:**
- Streaming real (SSE) defer — la UX síncrona es aceptable para `Haiku` (latencia chica) y simplifica el route.
- Persistencia conversaciones defer.
- I18n del system prompt: solo dice "respond in locale X"; los outputs son del modelo.

**TDD:** tools y service tienen tests con mocks; route handler probado en build/smoke.
