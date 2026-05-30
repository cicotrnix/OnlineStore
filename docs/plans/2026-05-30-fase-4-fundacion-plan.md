# Fase 4 · Fundación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar task por task. Los pasos usan checkbox (`- [ ]`).

**Goal:** Levantar la base compartida de la capa de IA (provider + presupuesto/kill-switch + schema de contenido/atributos + cola async + rate-limits) sin encender ninguna feature de cara al usuario.

**Architecture:** Un módulo `modules/ai` cerrado expone el `AIProvider` (wrapper Anthropic con noop fallback), un guardia de presupuesto con kill-switch, y una cola `AiContentJob` clonada del patrón `SearchIndexQueue` (FOR UPDATE SKIP LOCKED). Dominio-como-datos: nada hardcodea "batería". Todo server-side.

**Tech Stack:** Next.js 14 + TypeScript estricto, Prisma 6 + Postgres, `@anthropic-ai/sdk`, Vitest. Patrones existentes a imitar: `lib/voyage.ts` (noop), `lib/rate-limit.ts` (presets), `modules/search/index-queue.ts` (cola+worker).

**Alcance de este plan:** SOLO la Fundación (Tasks 1.1–1.5). Cerrar verde (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`) antes de abrir el plan de Corte 0.5 (i18n). `brandVoice` en config se difiere al plan del Corte 1 (lo consume la generación de contenido — YAGNI). Streaming y `completeStructured` se difieren a sus consumidores (Corte 2). **El script `scripts/process-ai-content-jobs.ts` y su scheduled task en Coolify se entregan en el Corte 1**, cuando exista el handler de generación que inyectar en `processContentJobs` (aquí solo se entregan el modelo y la función de cola).

**Spec de referencia:** `docs/specs/2026-05-30-fase-4-ia-aplicada.md` (rev. 2, §14 son los ajustes de CC que este plan respeta).

---

## File structure

| Archivo | Responsabilidad |
|---|---|
| `modules/ai/provider.ts` | `AIProvider`: `isAIEnabled`, `complete`; integra budget + logging de tokens |
| `modules/ai/budget.ts` | Contador mensual `AiUsage` + `isOverBudget` (puro) + kill-switch |
| `modules/ai/content-jobs.ts` | Cola `AiContentJob`: `enqueueContentJob`, `processContentJobs(handler)` |
| `modules/ai/errors.ts` | `AIDisabledError`, `AIBudgetExceededError` |
| `modules/ai/index.ts` | API pública del módulo |
| `modules/ai/__tests__/*.test.ts` | Tests por unidad |
| `modules/config/schemas.ts` | + bloque `ai` (model, chatModel, contentModel, flags) |
| `lib/rate-limit.ts` | + `AI_CHAT_LIMITS`, `AI_CONTENT_GEN_LIMITS` |
| `prisma/schema.prisma` | + `Product.attributes`, `Product.compatibleModels`, `ProductContent`, `AiContentJob`, enums |

---

## Task 1.1: Config `ai` block + AIProvider

**Files:**
- Modify: `package.json` (dep `@anthropic-ai/sdk`)
- Modify: `modules/config/schemas.ts` (+ `ai` object dentro de `storeConfigSchema`)
- Modify: `modules/config/schemas.test.ts`
- Modify: `store.config.ts` (+ bloque `ai`)
- Create: `modules/ai/errors.ts`
- Create: `modules/ai/provider.ts`
- Create: `modules/ai/index.ts`
- Test: `modules/ai/__tests__/provider.test.ts`

- [ ] **Step 1: Instalar SDK**

Run: `pnpm add @anthropic-ai/sdk`
Expected: se agrega a `dependencies`.

- [ ] **Step 2: Extender el Zod schema de config (test primero)**

En `modules/config/schemas.test.ts`, agregar un caso que exige el bloque `ai`:

```ts
it('valida el bloque ai', () => {
  const cfg = makeValidConfig() // helper existente que arma un config válido
  cfg.ai = {
    model: 'claude-sonnet-4-6',
    contentModel: 'claude-sonnet-4-6',
    chatModel: 'claude-haiku-4-5-20251001',
    content: false,
    chat: false,
    recommendations: false,
  }
  expect(() => storeConfigSchema.parse(cfg)).not.toThrow()
})

it('rechaza config sin bloque ai', () => {
  const cfg = makeValidConfig()
  // @ts-expect-error: ai requerido
  delete cfg.ai
  expect(() => storeConfigSchema.parse(cfg)).toThrow()
})
```

Si no existe `makeValidConfig`, replicar el objeto que ya usan los otros tests del archivo (mismo shape que `store.config.ts`).

- [ ] **Step 3: Correr el test y verlo fallar**

Run: `pnpm vitest run modules/config/schemas.test.ts`
Expected: FAIL (el schema aún no tiene `ai`).

- [ ] **Step 4: Agregar el bloque `ai` al schema**

En `modules/config/schemas.ts`, dentro de `z.object({...})` de `storeConfigSchema`, agregar:

```ts
  ai: z.object({
    model: z.string().min(1),
    chatModel: z.string().min(1),
    contentModel: z.string().min(1),
    content: z.boolean(),
    chat: z.boolean(),
    recommendations: z.boolean(),
  }),
```

- [ ] **Step 5: Reflejar el bloque en `store.config.ts`**

Agregar al objeto exportado (flags en `false` hasta cargar la key — §14.1):

```ts
  ai: {
    model: 'claude-sonnet-4-6',
    contentModel: 'claude-sonnet-4-6',
    chatModel: 'claude-haiku-4-5-20251001',
    content: false,
    chat: false,
    recommendations: false,
  },
```

- [ ] **Step 6: Correr config tests — verde**

Run: `pnpm vitest run modules/config`
Expected: PASS.

- [ ] **Step 7: Errores tipados (sin test propio; los usan otras tasks)**

Crear `modules/ai/errors.ts`:

```ts
export class AIDisabledError extends Error {
  constructor() {
    super('AI is not configured: missing ANTHROPIC_API_KEY')
    this.name = 'AIDisabledError'
  }
}

export class AIBudgetExceededError extends Error {
  constructor(periodYm: string) {
    super(`AI monthly token budget exceeded for ${periodYm}`)
    this.name = 'AIBudgetExceededError'
  }
}
```

- [ ] **Step 8: Test del provider (falla primero)**

Crear `modules/ai/__tests__/provider.test.ts`. Mockear el SDK y verificar (a) que sin key `isAIEnabled` es `false` y `complete` lanza `AIDisabledError`, (b) que con key llama al SDK y devuelve texto + uso de tokens:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create } },
}))

describe('AIProvider', () => {
  beforeEach(() => { create.mockReset(); delete process.env.ANTHROPIC_API_KEY })
  afterEach(() => { delete process.env.ANTHROPIC_API_KEY })

  it('isAIEnabled refleja la env var', async () => {
    const { isAIEnabled } = await import('../provider')
    expect(isAIEnabled()).toBe(false)
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    expect(isAIEnabled()).toBe(true)
  })

  it('complete lanza AIDisabledError sin key', async () => {
    const { complete } = await import('../provider')
    const { AIDisabledError } = await import('../errors')
    await expect(complete('hola', {})).rejects.toBeInstanceOf(AIDisabledError)
  })

  it('complete devuelve texto + usage con key', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    create.mockResolvedValue({
      content: [{ type: 'text', text: 'respuesta' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const { complete } = await import('../provider')
    const out = await complete('prompt', { system: 'eres util', maxTokens: 100 })
    expect(out.text).toBe('respuesta')
    expect(out.usage).toEqual({ inputTokens: 10, outputTokens: 5 })
    expect(create).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 9: Correr y ver fallar**

Run: `pnpm vitest run modules/ai/__tests__/provider.test.ts`
Expected: FAIL ("Cannot find module '../provider'").

- [ ] **Step 10: Implementar el provider**

Crear `modules/ai/provider.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/observability/logger'
import storeConfig from '@/store.config'
import { AIDisabledError } from './errors'

export interface AICompleteOptions {
  system?: string
  maxTokens?: number
  temperature?: number
  model?: string
}

export interface AICompletion {
  text: string
  usage: { inputTokens: number; outputTokens: number }
}

export function isAIEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// Cliente cacheado lazy (mismo patrón que lib/meilisearch.ts::getMeilisearchClient).
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

export async function complete(prompt: string, opts: AICompleteOptions): Promise<AICompletion> {
  if (!isAIEnabled()) throw new AIDisabledError()

  const model = opts.model ?? storeConfig.ai.model
  const msg = await getClient().messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = msg.content[0]
  const text = block && block.type === 'text' ? block.text : ''
  const usage = { inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens }
  logger.info({ model, usage }, 'ai completion')
  return { text, usage }
}
```

- [ ] **Step 11: API pública del módulo**

Crear `modules/ai/index.ts`:

```ts
export { isAIEnabled, complete } from './provider'
export type { AICompleteOptions, AICompletion } from './provider'
export { AIDisabledError, AIBudgetExceededError } from './errors'
```

- [ ] **Step 12: Correr tests — verde**

Run: `pnpm vitest run modules/ai`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add package.json pnpm-lock.yaml modules/config/schemas.ts modules/config/schemas.test.ts store.config.ts modules/ai/
git commit -m "feat(ai): AIProvider con noop fallback + bloque ai en config"
```

---

## Task 1.2: Budget counter + kill-switch

**Files:**
- Modify: `prisma/schema.prisma` (model `AiUsage`)
- Create: `modules/ai/budget.ts`
- Modify: `modules/ai/provider.ts` (integrar check + record)
- Modify: `modules/ai/index.ts`
- Test: `modules/ai/__tests__/budget.test.ts`

- [ ] **Step 1: Modelo `AiUsage` en Prisma**

En `prisma/schema.prisma`:

```prisma
model AiUsage {
  id         String   @id @default(cuid())
  periodYm   String   @unique // "YYYY-MM"
  tokensUsed Int      @default(0)
  updatedAt  DateTime @updatedAt
}
```

- [ ] **Step 2: Generar migración**

Run: `pnpm prisma migrate dev --name ai_usage`
Expected: migración creada + `prisma generate` ok.

- [ ] **Step 3: Test de la lógica pura del umbral (falla primero)**

Crear `modules/ai/__tests__/budget.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isOverBudget, currentPeriodYm } from '../budget'

describe('budget pure logic', () => {
  it('currentPeriodYm da YYYY-MM', () => {
    expect(currentPeriodYm(new Date('2026-05-30T00:00:00Z'))).toBe('2026-05')
  })
  it('isOverBudget true cuando used >= budget', () => {
    expect(isOverBudget(1000, 1000)).toBe(true)
    expect(isOverBudget(1001, 1000)).toBe(true)
    expect(isOverBudget(999, 1000)).toBe(false)
  })
  it('isOverBudget false cuando budget es 0/ausente (sin límite)', () => {
    expect(isOverBudget(999999, 0)).toBe(false)
  })
})
```

- [ ] **Step 4: Correr y ver fallar**

Run: `pnpm vitest run modules/ai/__tests__/budget.test.ts`
Expected: FAIL ("Cannot find module '../budget'").

- [ ] **Step 5: Implementar `budget.ts`**

```ts
import { prisma } from '@/lib/db/client'

export function currentPeriodYm(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

export function monthlyBudget(): number {
  return Number.parseInt(process.env.AI_MONTHLY_TOKEN_BUDGET ?? '0', 10) || 0
}

/** budget 0 (o ausente) = sin límite. */
export function isOverBudget(tokensUsed: number, budget: number): boolean {
  if (budget <= 0) return false
  return tokensUsed >= budget
}

export async function isBudgetExceeded(): Promise<boolean> {
  const budget = monthlyBudget()
  if (budget <= 0) return false
  const row = await prisma.aiUsage.findUnique({ where: { periodYm: currentPeriodYm() } })
  return isOverBudget(row?.tokensUsed ?? 0, budget)
}

export async function recordUsage(tokens: number): Promise<void> {
  const periodYm = currentPeriodYm()
  await prisma.aiUsage.upsert({
    where: { periodYm },
    create: { periodYm, tokensUsed: tokens },
    update: { tokensUsed: { increment: tokens } },
  })
}
```

- [ ] **Step 6: Correr test — verde**

Run: `pnpm vitest run modules/ai/__tests__/budget.test.ts`
Expected: PASS.

- [ ] **Step 7: Mock top-level de `../budget` en el test del provider (test primero)**

Como `complete()` ahora llamará a `isBudgetExceeded`/`recordUsage`, hay que mockear `../budget` a nivel de archivo (no `vi.doMock` dentro del `it`, que es frágil por el cache de módulos). En la cabecera de `modules/ai/__tests__/provider.test.ts`, junto al mock del SDK, agregar:

```ts
vi.mock('../budget', () => ({
  isBudgetExceeded: vi.fn().mockResolvedValue(false),
  recordUsage: vi.fn().mockResolvedValue(undefined),
  currentPeriodYm: vi.fn().mockReturnValue('2026-05'),
}))
```

Y agregar el test del kill-switch, que sobreescribe el default por una sola llamada:

```ts
import { isBudgetExceeded } from '../budget'

it('complete lanza AIBudgetExceededError si se excedió el presupuesto', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test'
  vi.mocked(isBudgetExceeded).mockResolvedValueOnce(true)
  const { complete } = await import('../provider')
  const { AIBudgetExceededError } = await import('../errors')
  await expect(complete('x', {})).rejects.toBeInstanceOf(AIBudgetExceededError)
})
```

- [ ] **Step 8: Correr y ver fallar**

Run: `pnpm vitest run modules/ai/__tests__/provider.test.ts -t presupuesto`
Expected: FAIL (el provider aún no consulta el budget).

- [ ] **Step 9: Conectar budget en `complete`**

En `modules/ai/provider.ts`, importar y usar:

```ts
import { isBudgetExceeded, recordUsage } from './budget'
import { AIBudgetExceededError } from './errors'
import { currentPeriodYm } from './budget'
```

Al inicio de `complete`, tras el check de `isAIEnabled`:

```ts
  if (await isBudgetExceeded()) throw new AIBudgetExceededError(currentPeriodYm())
```

Y después de obtener `usage`, antes del `return`:

```ts
  await recordUsage(usage.inputTokens + usage.outputTokens)
```

- [ ] **Step 10: Correr tests del módulo — verde**

Run: `pnpm vitest run modules/ai`
Expected: PASS.

- [ ] **Step 11: Exportar helpers de budget**

En `modules/ai/index.ts` agregar:

```ts
export { isBudgetExceeded, recordUsage, monthlyBudget } from './budget'
```

- [ ] **Step 12: Documentar la env var**

En `.env.example`, sección IA:

```
# AI (Anthropic) — vacío = IA inerte (noop). Budget 0 = sin límite.
ANTHROPIC_API_KEY=""
AI_MONTHLY_TOKEN_BUDGET="0"
```

- [ ] **Step 13: Commit**

```bash
git add prisma/ modules/ai/ .env.example
git commit -m "feat(ai): kill-switch por presupuesto mensual de tokens"
```

---

## Task 1.3: Schema — atributos de producto + ProductContent

**Files:**
- Modify: `prisma/schema.prisma` (`Product.attributes`, `Product.compatibleModels`, `ProductContent`, enum)
- Test: `modules/ai/__tests__/product-content.schema.test.ts`

- [ ] **Step 1: Extender `Product` y agregar `ProductContent`**

En `prisma/schema.prisma`, dentro de `model Product` agregar campos:

```prisma
  attributes       Json?
  compatibleModels String[]
  content          ProductContent[]
```

Y nuevos:

```prisma
model ProductContent {
  id               String               @id @default(cuid())
  productId        String
  locale           String
  longDescriptionMd String?             @db.Text
  shortDescription String?
  seoTitle         String?
  seoDescription   String?
  status           ProductContentStatus @default(DRAFT)
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, locale])
  @@index([productId])
}

enum ProductContentStatus {
  DRAFT
  PUBLISHED
}
```

- [ ] **Step 2: Migración**

Run: `pnpm prisma migrate dev --name product_content_attributes`
Expected: migración + generate ok.

- [ ] **Step 3: Test de persistencia (falla primero)**

Crear `modules/ai/__tests__/product-content.schema.test.ts` — usa el helper de DB de test del proyecto (mismo patrón que los tests de `modules/search`). Crea categoría+producto, inserta `ProductContent` EN y ES, verifica `@@unique`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'

describe('ProductContent', () => {
  beforeEach(async () => { await cleanDb() })

  it('permite EN y ES por producto, único por (productId, locale)', async () => {
    const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}`, name: 'C' } })
    const p = await prisma.product.create({
      data: { sku: `S-${Date.now()}`, slug: `s-${Date.now()}`, name: 'P', basePrice: '1.00', categoryId: cat.id, compatibleModels: ['iPhone 14'], attributes: { capacity_mah: '3279' } },
    })
    await prisma.productContent.create({ data: { productId: p.id, locale: 'en-US', shortDescription: 'EN' } })
    await prisma.productContent.create({ data: { productId: p.id, locale: 'es-419', shortDescription: 'ES' } })
    await expect(
      prisma.productContent.create({ data: { productId: p.id, locale: 'en-US', shortDescription: 'dup' } })
    ).rejects.toThrow()
    const all = await prisma.productContent.findMany({ where: { productId: p.id } })
    expect(all).toHaveLength(2)
  })
})
```

- [ ] **Step 4: Correr — primero falla (si no migró), luego verde**

Run: `pnpm vitest run modules/ai/__tests__/product-content.schema.test.ts`
Expected: PASS tras la migración del Step 2. Si falla por DB de test desactualizada, correr `pnpm prisma migrate deploy` contra la DB de test.

- [ ] **Step 5: Commit**

```bash
git add prisma/ modules/ai/__tests__/product-content.schema.test.ts
git commit -m "feat(ai): schema ProductContent + atributos/compatibleModels en Product"
```

---

## Task 1.4: Cola `AiContentJob` (modelo + enqueue/process)

**Files:**
- Modify: `prisma/schema.prisma` (`AiContentJob` + enum `AiJobStatus`)
- Create: `modules/ai/content-jobs.ts`
- Modify: `modules/ai/index.ts`
- Test: `modules/ai/__tests__/content-jobs.test.ts`

- [ ] **Step 1: Modelo + enum (clona el patrón `SearchIndexQueue`)**

En `prisma/schema.prisma`:

```prisma
model AiContentJob {
  id          String      @id @default(cuid())
  productId   String
  locale      String
  status      AiJobStatus @default(PENDING)
  attempts    Int         @default(0)
  lastError   String?     @db.Text
  enqueuedAt  DateTime    @default(now())
  processedAt DateTime?

  @@index([status, enqueuedAt])
  @@index([productId])
}

enum AiJobStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}
```

- [ ] **Step 2: Migración**

Run: `pnpm prisma migrate dev --name ai_content_job`
Expected: ok.

- [ ] **Step 3: Test de la cola (falla primero)**

Crear `modules/ai/__tests__/content-jobs.test.ts`. Verifica enqueue idempotente y que `processContentJobs` invoca el handler y marca DONE; si el handler lanza, marca FAILED e incrementa `attempts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { enqueueContentJob, processContentJobs } from '../content-jobs'

async function makeProduct() {
  const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}-${Math.random()}`, name: 'C' } })
  return prisma.product.create({ data: { sku: `S-${Date.now()}-${Math.random()}`, slug: `s-${Date.now()}-${Math.random()}`, name: 'P', basePrice: '1.00', categoryId: cat.id } })
}

describe('AiContentJob queue', () => {
  beforeEach(async () => { await cleanDb() })

  it('enqueue es idempotente por (productId, locale) PENDING', async () => {
    const p = await makeProduct()
    await enqueueContentJob(p.id, 'en-US')
    await enqueueContentJob(p.id, 'en-US')
    const jobs = await prisma.aiContentJob.findMany({ where: { productId: p.id, status: 'PENDING' } })
    expect(jobs).toHaveLength(1)
  })

  it('process marca DONE cuando el handler resuelve', async () => {
    const p = await makeProduct()
    await enqueueContentJob(p.id, 'es-419')
    const handler = vi.fn().mockResolvedValue(undefined)
    const res = await processContentJobs(handler)
    expect(handler).toHaveBeenCalledOnce()
    expect(res.processed).toBe(1)
    const job = await prisma.aiContentJob.findFirst({ where: { productId: p.id } })
    expect(job?.status).toBe('DONE')
  })

  it('un fallo deja el job en PENDING con attempts=1 (reintento, MAX_ATTEMPTS=5)', async () => {
    const p = await makeProduct()
    await enqueueContentJob(p.id, 'en-US')
    const res = await processContentJobs(vi.fn().mockRejectedValue(new Error('boom')))
    expect(res.failed).toBe(1)
    const job = await prisma.aiContentJob.findFirst({ where: { productId: p.id } })
    expect(job?.status).toBe('PENDING')
    expect(job?.attempts).toBe(1)
  })

  it('tras 5 fallos consecutivos marca FAILED', async () => {
    const p = await makeProduct()
    await enqueueContentJob(p.id, 'en-US')
    const failing = vi.fn().mockRejectedValue(new Error('boom'))
    for (let i = 0; i < 5; i++) await processContentJobs(failing)
    const job = await prisma.aiContentJob.findFirst({ where: { productId: p.id } })
    expect(job?.status).toBe('FAILED')
    expect(job?.attempts).toBe(5)
  })
})
```

- [ ] **Step 4: Correr y ver fallar**

Run: `pnpm vitest run modules/ai/__tests__/content-jobs.test.ts`
Expected: FAIL ("Cannot find module '../content-jobs'").

- [ ] **Step 5: Implementar `content-jobs.ts` (mismo locking que index-queue)**

```ts
import { prisma } from '@/lib/db/client'

const BATCH_SIZE = 10
const MAX_ATTEMPTS = 5

export interface ContentJob {
  id: string
  productId: string
  locale: string
}

export interface ProcessJobsResult {
  processed: number
  failed: number
}

export async function enqueueContentJob(productId: string, locale: string): Promise<void> {
  const existing = await prisma.aiContentJob.findFirst({
    where: { productId, locale, status: 'PENDING' },
    select: { id: true },
  })
  if (existing) return
  await prisma.aiContentJob.create({ data: { productId, locale, status: 'PENDING' } })
}

/** handler corre la generación real (la inyecta el Corte 1). */
export async function processContentJobs(
  handler: (job: ContentJob) => Promise<void>
): Promise<ProcessJobsResult> {
  const result: ProcessJobsResult = { processed: 0, failed: 0 }

  const batch = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(`
      SELECT id FROM "AiContentJob"
      WHERE status = 'PENDING'
      ORDER BY "enqueuedAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `)
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    await tx.aiContentJob.updateMany({ where: { id: { in: ids } }, data: { status: 'PROCESSING' } })
    return tx.aiContentJob.findMany({ where: { id: { in: ids } } })
  })

  for (const job of batch) {
    try {
      await handler({ id: job.id, productId: job.productId, locale: job.locale })
      await prisma.aiContentJob.update({ where: { id: job.id }, data: { status: 'DONE', processedAt: new Date() } })
      result.processed++
    } catch (err) {
      const attempts = job.attempts + 1
      await prisma.aiContentJob.update({
        where: { id: job.id },
        data: {
          attempts,
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          lastError: err instanceof Error ? err.message : String(err),
        },
      })
      result.failed++
    }
  }
  return result
}
```

- [ ] **Step 6: Correr tests — verde**

Run: `pnpm vitest run modules/ai/__tests__/content-jobs.test.ts`
Expected: PASS.

- [ ] **Step 7: Exportar**

En `modules/ai/index.ts`:

```ts
export { enqueueContentJob, processContentJobs } from './content-jobs'
export type { ContentJob, ProcessJobsResult } from './content-jobs'
```

- [ ] **Step 8: Commit**

```bash
git add prisma/ modules/ai/
git commit -m "feat(ai): cola AiContentJob con FOR UPDATE SKIP LOCKED"
```

---

## Task 1.5: Presets de rate-limit para IA

**Files:**
- Modify: `lib/rate-limit.ts`
- Test: `lib/__tests__/rate-limit.test.ts` (o el archivo de test existente de rate-limit)

- [ ] **Step 1: Test de los presets (falla primero)**

Agregar al test existente de rate-limit (o crear `lib/__tests__/rate-limit.test.ts`):

```ts
import { describe, expect, it } from 'vitest'
import { AI_CHAT_LIMITS, AI_CONTENT_GEN_LIMITS } from '@/lib/rate-limit'

describe('AI rate-limit presets', () => {
  it('chat es más estricto que content-gen por minuto', () => {
    expect(AI_CHAT_LIMITS).toEqual({ perMinute: 5, perHour: 30 })
    expect(AI_CONTENT_GEN_LIMITS).toEqual({ perMinute: 3, perHour: 10 })
  })
})
```

- [ ] **Step 2: Correr y ver fallar**

Run: `pnpm vitest run lib`
Expected: FAIL (presets no exportados).

- [ ] **Step 3: Agregar presets**

Al final de `lib/rate-limit.ts`, junto a `ANON_SEARCH_LIMITS`:

```ts
export const AI_CHAT_LIMITS: RateLimitConfig = { perMinute: 5, perHour: 30 }
export const AI_CONTENT_GEN_LIMITS: RateLimitConfig = { perMinute: 3, perHour: 10 }
```

- [ ] **Step 4: Correr — verde**

Run: `pnpm vitest run lib`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/rate-limit.ts lib/__tests__/
git commit -m "feat(ai): presets de rate-limit AI_CHAT_LIMITS y AI_CONTENT_GEN_LIMITS"
```

---

## Cierre de la Fundación

- [ ] **Gate verde completo**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: todo PASS. No abrir el plan de Corte 0.5 (i18n) hasta esto.

- [ ] **ADRs**

Escribir borradores de `docs/adr/0020-aiprovider-and-model-choice.md` (incluye el split Haiku/Sonnet y la excepción de estructura del módulo `ai`), `0021-product-attributes-json.md`, `0022-product-content-multilingual.md`. (0023/0024/0025 se escriben con sus cortes.)

---

## Self-Review

**Cobertura del spec (§4 Fundación):**
- AIProvider → Task 1.1 ✅
- `attributes` + `compatibleModels` + `ProductContent` → Task 1.3 ✅
- Kill-switch de presupuesto (§14.5) → Task 1.2 ✅
- Cola async `AiContentJob` (§14.6) → Task 1.4 ✅
- Presets rate-limit IA (§14.7) → Task 1.5 ✅
- Zod schema `ai` block + tests (§14.2) → Task 1.1 ✅
- `brandVoice` → **diferido al Corte 1** (lo consume la generación; YAGNI). Anotado en el header.

**Placeholders:** ninguno; todo paso de código lleva código real.

**Consistencia de tipos:** `complete()`/`AICompletion` consistentes entre 1.1 y 1.2. `processContentJobs(handler)` y `ContentJob` consistentes en 1.4. Modelos Prisma nombrados `AiContentJob`/`AiUsage` → cliente `prisma.aiContentJob`/`prisma.aiUsage` (camelCase limpio, sin la `aI` rara) — usado así en código y tests.

**Reintentos de la cola:** con `MAX_ATTEMPTS = 5`, un único fallo deja el job en `PENDING` con `attempts = 1`; recién al 5º fallo pasa a `FAILED`. Los tests de la Task 1.4 lo cubren explícitamente (un fallo → PENDING; cinco fallos → FAILED).

**Ajustes de revisión de CC aplicados:** test del bloque `ai` con `contentModel` (1.1); cliente Anthropic cacheado lazy (1.1); mock top-level de `../budget` en vez de `vi.doMock` (1.2); `cleanDb()` en `beforeEach` de 1.3 y 1.4; modelo renombrado `AiContentJob`; nota de scope del worker en el header.
