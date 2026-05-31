# Fase 4 · Corte 1 — Generación de contenido (AI content)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps usan checkbox.

**Goal:** Generar contenido AI bilingüe (EN/ES) por producto: long markdown + short description + SEO title/description. Flow draft → owner approve → published. Renderear en PDP. Reindex post-publish. Worker async con cola `AiContentJob`.

**Architecture:** Sub-módulo `modules/ai/content/`. Prompt builder puro consume `brandVoice` + `attributes` + `name` + `category` + `locale`. Llama `AIProvider.complete` con `contentModel` (Sonnet). Parser de secciones. Persiste en `ProductContent` (DRAFT). Admin (`isPlatformAdmin`) revisa + publica. Script `scripts/process-ai-content-jobs.ts` consume cola y delega al servicio. Reindex post-publish via `enqueueIndex(productId, 'UPSERT')` para que Meilisearch reciba el long description en `searchableText`.

**Tech Stack:** `@anthropic-ai/sdk` (Sonnet 4.6 default), `ProductContent`, `AiContentJob`, `lib/ai/budget`, `lib/i18n` (Corte 0.5). Patterns: `modules/search/index-queue.ts` (worker), `app/admin/_actions-fase2.ts` (platform admin gate), `modules/notifications/email/templates` (fixture style tests).

**Alcance:**
- `brandVoice` block en `store.config.ts` + Zod schema.
- Extender `scripts/load-pipower-catalog.ts` con `attributes` + `compatibleModels` reales por SKU + `imageUrl` apuntando al asset webp.
- Importar imágenes seleccionadas de PiPower (`/Users/cico/Desktop/PiPower/public/branding/products/final-normalized/*.webp`) a `public/products/`. Solo los modelos que están en el lineup actual (12 SKUs, modelos iPhone 13/13 Pro/13 Pro Max/14/14 Pro/14 Pro Max/15/15 Pro/15 Pro Max). Variantes Tag-On Flex reusan imagen del modelo base.
- Módulo `modules/ai/content/` con prompt-builder, parser, service.
- Admin UI: botón "Generar contenido" + bulk "Generar todo" en `/admin/products` y `/admin/products/[id]` (gate platform admin), preview por locale, approve/publish.
- Worker `scripts/process-ai-content-jobs.ts`.
- PDP storefront renderea `ProductContent` del locale activo con fallback EN.
- Badge "Tag-On Flex" en `ProductCard` cuando `attributes.flex_included === 'tag-on'` (o equivalente).
- ADR 0023... wait — 0023 es chatbot. Para Corte 1 sin ADR nuevo (el spec NO lista uno; los ajustes ya están en 0020/0021/0022).
- Activar `modules.ai.content = true` en `store.config.ts` solo al cierre del Corte (post gate verde).

**Fuera de alcance (defer):**
- Chatbot (Corte 2).
- Recomendaciones (Corte 3).
- Bulk approve/publish (por ahora aprobación uno-a-uno; bulk genera, no aprueba).
- Streaming en admin UI.
- Audit trail de aprobaciones (un audit log dedicado puede venir si surge demanda).

**Spec de referencia:** `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §1, §4.3, §5; §14.12 (imágenes webp), §14.13 (Tag-On badge), §14.15 (owner=platform admin).

---

## File structure

| Archivo | Responsabilidad |
|---|---|
| `modules/config/schemas.ts` | + `identity.brandVoice` Zod block |
| `store.config.ts` | + `identity.brandVoice` content + flag `ai.content` queda false hasta cierre |
| `public/products/*.webp` | Imágenes copiadas de PiPower (solo modelos del lineup) |
| `scripts/load-pipower-catalog.ts` | Extender items con `attributes`, `compatibleModels`, `imageUrl` |
| `modules/ai/content/prompt.ts` | `buildContentPrompt({brandVoice, name, category, attributes, locale})` puro |
| `modules/ai/content/parser.ts` | `parseContentSections(text)` → `{longMd, short, seoTitle, seoDesc}` |
| `modules/ai/content/service.ts` | `generateContentForProduct({productId, locale})` orquesta prompt → AIProvider → parser → upsert ProductContent(DRAFT) |
| `modules/ai/content/publish.ts` | `publishContent({productId, locale, byUserId})` valida platform admin, transiciona DRAFT→PUBLISHED, encola search reindex |
| `modules/ai/content/index.ts` | Superficie pública |
| `modules/ai/content/__tests__/*.test.ts` | Tests TDD |
| `modules/ai/content/__tests__/fixtures/*.txt` | Outputs LLM determinísticos |
| `scripts/process-ai-content-jobs.ts` | Worker que llama processContentJobs con handler real |
| `app/admin/products/_ai-actions.ts` | Server actions: generateForOne, generateBulk, approve, reject |
| `app/admin/products/[id]/page.tsx` | + sección "Contenido AI" con preview/approve por locale |
| `app/admin/products/page.tsx` | + botón "Generar todo" (bulk enqueue) |
| `app/(storefront)/products/[slug]/page.tsx` | Renderea ProductContent published, fallback EN |
| `components/commerce/ProductCard.tsx` | Badge "Tag-On Flex" si aplica |
| `docs/runbooks/ai-content.md` | Runbook ops (worker, budget, retries) |

---

## Task C1.1: `brandVoice` block + Zod schema + store.config

**Files:** `modules/config/schemas.ts`, `modules/config/schemas.test.ts`, `store.config.ts`

- [ ] **Step 1: Test del bloque `brandVoice` (falla primero)**

En `modules/config/schemas.test.ts`, agregar:

```ts
it('valida identity.brandVoice', () => {
  const cfg = makeValidConfig()
  cfg.identity.brandVoice = {
    audience: 'Independent iPhone repair shops in USA + LATAM',
    tone: 'technical, precise, no hype',
    rules: ['no emoji', 'no exclamations except CTA', 'metric units first'],
  }
  expect(() => storeConfigSchema.parse(cfg)).not.toThrow()
})

it('brandVoice es opcional', () => {
  const cfg = makeValidConfig()
  expect(cfg.identity.brandVoice).toBeUndefined()
  expect(() => storeConfigSchema.parse(cfg)).not.toThrow()
})
```

- [ ] **Step 2: Implementar schema**

En `modules/config/schemas.ts`, extender `identity`:

```ts
brandVoice: z.object({
  audience: z.string().min(1),
  tone: z.string().min(1),
  rules: z.array(z.string()).default([]),
}).optional(),
```

- [ ] **Step 3: Llenar `store.config.ts`**

Agregar dentro de `identity`:

```ts
brandVoice: {
  audience: 'Independent iPhone repair professionals and authorized service shops across USA and Latin America',
  tone: 'technical, precise, factual, no hype, no marketing fluff',
  rules: [
    'Write in second person ("you") when addressing the buyer.',
    'No emoji.',
    'No exclamation marks except for explicit CTAs.',
    'Metric units first, imperial in parentheses when relevant.',
    'Cite specific compatibility (iPhone model + A-number) when available.',
    'If a spec is missing from the attributes, omit that section. Never fabricate.',
    'Avoid words like "amazing", "revolutionary", "the best".',
  ],
},
```

- [ ] **Step 4: Gate**

```
set -a && . ./.env.local && set +a
pnpm vitest run modules/config && pnpm typecheck
```

Verde.

- [ ] **Step 5: Commit**

```
git add modules/config/ store.config.ts
git commit -m "feat(ai): identity.brandVoice block en store.config + Zod"
```

---

## Task C1.2: Importar imágenes + extender loader con specs

**Files:** `public/products/`, `scripts/load-pipower-catalog.ts`

- [ ] **Step 1: Copiar imágenes seleccionadas**

Solo los modelos del lineup actual. Para cada modelo, usar el archivo `pi-battery-iphone-<model>-pdp.webp` como imagen principal. Variantes "Tag-On Flex" reusan la imagen del modelo base.

Mapping:
- iPhone 13 → `pi-battery-iphone-13-pdp.webp` → `public/products/pi-battery-iphone-13.webp`
- iPhone 13 Pro → `pi-battery-iphone-13-pro-pdp.webp` → `public/products/pi-battery-iphone-13-pro.webp`
- iPhone 13 Pro Max → `pi-battery-iphone-13-pro-max-pdp.webp` → `public/products/pi-battery-iphone-13-pro-max.webp`
- iPhone 14 → idem
- iPhone 14 Pro → idem
- iPhone 14 Pro Max → idem
- iPhone 15 → idem
- iPhone 15 Pro → idem
- iPhone 15 Pro Max → idem

Run:
```bash
mkdir -p public/products
for m in 13 13-pro 13-pro-max 14 14-pro 14-pro-max 15 15-pro 15-pro-max; do
  cp "/Users/cico/Desktop/PiPower/public/branding/products/final-normalized/pi-battery-iphone-${m}-pdp.webp" "public/products/pi-battery-iphone-${m}.webp"
done
ls public/products/
```

Expected: 9 archivos webp.

- [ ] **Step 2: Extender loader**

Modificar `scripts/load-pipower-catalog.ts` para que cada item tenga `attributes`, `compatibleModels`, `imageUrl`. Especificaciones PiPower (capacidad mAh por modelo base, A-numbers, flex incluido en línea iPhone 15 con variante Tag-On Flex):

```ts
const items: Array<{
  sku: string
  name: string
  model: string
  modelSlug: string  // para imageUrl
  price: string
  stock: number
  attributes: Record<string, string | number | boolean>
  compatibleModels: string[]
}> = [
  // iPhone 13
  { sku: 'PI-200450', name: '...', model: 'iPhone 13', modelSlug: '13', price: '6.45', stock: 86,
    compatibleModels: ['iPhone 13'],
    attributes: { capacity_mah: 3279, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2482', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 13 Pro (3095 mAh)
  { sku: 'PI-200451', name: '...', model: 'iPhone 13 Pro', modelSlug: '13-pro', price: '8.98', stock: 220,
    compatibleModels: ['iPhone 13 Pro'],
    attributes: { capacity_mah: 3095, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2483', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 13 Pro Max (4352 mAh)
  { sku: 'PI-200452', name: '...', model: 'iPhone 13 Pro Max', modelSlug: '13-pro-max', price: '11.24', stock: 70,
    compatibleModels: ['iPhone 13 Pro Max'],
    attributes: { capacity_mah: 4352, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2484', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 14 (3279 mAh)
  { sku: 'PI-200453', name: '...', model: 'iPhone 14', modelSlug: '14', price: '7.20', stock: 57,
    compatibleModels: ['iPhone 14'],
    attributes: { capacity_mah: 3279, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2649', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 14 Pro (3200 mAh)
  { sku: 'PI-200454', name: '...', model: 'iPhone 14 Pro', modelSlug: '14-pro', price: '9.16', stock: 182,
    compatibleModels: ['iPhone 14 Pro'],
    attributes: { capacity_mah: 3200, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2650', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 14 Pro Max (4323 mAh)
  { sku: 'PI-200455', name: '...', model: 'iPhone 14 Pro Max', modelSlug: '14-pro-max', price: '11.50', stock: 66,
    compatibleModels: ['iPhone 14 Pro Max'],
    attributes: { capacity_mah: 4323, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2651', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 15 (3349 mAh) — base sin tag-on
  { sku: 'PI-200456', name: '...', model: 'iPhone 15', modelSlug: '15', price: '8.46', stock: 20,
    compatibleModels: ['iPhone 15'],
    attributes: { capacity_mah: 3349, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2846', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 15 con Tag-On Flex
  { sku: 'PI-200459', name: '...', model: 'iPhone 15', modelSlug: '15', price: '7.30', stock: 130,
    compatibleModels: ['iPhone 15'],
    attributes: { capacity_mah: 3349, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2846', flex_included: 'tag-on', pre_programmed_flex_included: true, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 15 Pro (3274 mAh)
  { sku: 'PI-200457', name: '...', model: 'iPhone 15 Pro', modelSlug: '15-pro', price: '10.67', stock: 23,
    compatibleModels: ['iPhone 15 Pro'],
    attributes: { capacity_mah: 3274, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2847', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 15 Pro Tag-On Flex
  { sku: 'PI-200460', name: '...', model: 'iPhone 15 Pro', modelSlug: '15-pro', price: '9.00', stock: 110,
    compatibleModels: ['iPhone 15 Pro'],
    attributes: { capacity_mah: 3274, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2847', flex_included: 'tag-on', pre_programmed_flex_included: true, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 15 Pro Max (4422 mAh)
  { sku: 'PI-200458', name: '...', model: 'iPhone 15 Pro Max', modelSlug: '15-pro-max', price: '12.57', stock: 30,
    compatibleModels: ['iPhone 15 Pro Max'],
    attributes: { capacity_mah: 4422, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2848', flex_included: false, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
  // iPhone 15 Pro Max Tag-On Flex
  { sku: 'PI-200461', name: '...', model: 'iPhone 15 Pro Max', modelSlug: '15-pro-max', price: '10.40', stock: 110,
    compatibleModels: ['iPhone 15 Pro Max'],
    attributes: { capacity_mah: 4422, voltage_v: '3.85', cycles_rated: 800, apple_model_code: 'A2848', flex_included: 'tag-on', pre_programmed_flex_included: true, requires_soldering: false, professional_installation_recommended: true, warranty_months: 12, hazmat_class: '9', requires_ground_shipping: true } },
]
```

Conservar nombres existentes para no perder consistencia. En el `upsert`:

```ts
await prisma.product.upsert({
  where: { sku: item.sku },
  create: {
    sku: item.sku,
    slug: kebabFromSku(item),
    name: item.name,
    basePrice: new Decimal(item.price),
    stockQuantity: item.stock,
    imageUrl: `/products/pi-battery-iphone-${item.modelSlug}.webp`,
    isActive: true,
    categoryId: cat.id,
    attributes: item.attributes,
    compatibleModels: item.compatibleModels,
  },
  update: {
    name: item.name,
    basePrice: new Decimal(item.price),
    stockQuantity: item.stock,
    imageUrl: `/products/pi-battery-iphone-${item.modelSlug}.webp`,
    attributes: item.attributes,
    compatibleModels: item.compatibleModels,
  },
})
```

(Si el slug ya está construido en el loader actual, reusalo.)

- [ ] **Step 3: Smoke**

```bash
set -a && . ./.env.local && set +a
pnpm tsx scripts/load-pipower-catalog.ts
```

Expected: 12 productos upserted, sin error. Verificar:
```bash
pnpm tsx -e "import { prisma } from '@/lib/db/client'; (async () => { const ps = await prisma.product.findMany({ where: { sku: { startsWith: 'PI-' } }, select: { sku: true, imageUrl: true, attributes: true, compatibleModels: true } }); console.log(JSON.stringify(ps[0], null, 2), 'total:', ps.length); await prisma.\$disconnect() })()"
```

- [ ] **Step 4: Commit**

```
git add public/products/ scripts/load-pipower-catalog.ts
git commit -m "feat(catalog): import Pi-Power webp images + attributes + compatibleModels"
```

---

## Task C1.3: Módulo `modules/ai/content` (prompt + parser + service)

**Files:**
- Create: `modules/ai/content/prompt.ts`
- Create: `modules/ai/content/parser.ts`
- Create: `modules/ai/content/service.ts`
- Create: `modules/ai/content/publish.ts`
- Create: `modules/ai/content/index.ts`
- Create: `modules/ai/content/__tests__/prompt.test.ts`
- Create: `modules/ai/content/__tests__/parser.test.ts`
- Create: `modules/ai/content/__tests__/service.test.ts`
- Create: `modules/ai/content/__tests__/publish.test.ts`
- Create: `modules/ai/content/__tests__/fixtures/sample-en.txt`
- Create: `modules/ai/content/__tests__/fixtures/sample-es.txt`

- [ ] **Step 1: Test prompt builder (puro, falla primero)**

```ts
// modules/ai/content/__tests__/prompt.test.ts
import { describe, expect, it } from 'vitest'
import { buildContentPrompt } from '../prompt'

const brandVoice = {
  audience: 'iPhone repair pros',
  tone: 'technical, factual',
  rules: ['no emoji', 'metric units first'],
}

describe('buildContentPrompt', () => {
  it('incluye brandVoice + atributos + locale', () => {
    const p = buildContentPrompt({
      brandVoice,
      productName: 'Battery Pi-Power for iPhone 13',
      categoryName: 'Battery',
      attributes: { capacity_mah: 3279, voltage_v: '3.85' },
      locale: 'en-US',
    })
    expect(p).toContain('iPhone repair pros')
    expect(p).toContain('technical, factual')
    expect(p).toContain('no emoji')
    expect(p).toContain('3279')
    expect(p).toContain('Battery Pi-Power for iPhone 13')
    expect(p).toMatch(/en-US|English/)
  })

  it('omite secciones cuyo atributo es null/undefined', () => {
    const p = buildContentPrompt({
      brandVoice,
      productName: 'X',
      categoryName: 'Y',
      attributes: { capacity_mah: 3279 }, // sin voltage
      locale: 'en-US',
    })
    expect(p).not.toMatch(/voltage/i)
  })

  it('locale es-419 instruye salida en español', () => {
    const p = buildContentPrompt({
      brandVoice, productName: 'X', categoryName: 'Y', attributes: {}, locale: 'es-419',
    })
    expect(p).toMatch(/es-419|Spanish|español/i)
  })

  it('nunca menciona el dominio "batería" hardcoded en el prompt (dominio-como-datos)', () => {
    const p = buildContentPrompt({
      brandVoice, productName: 'Generic widget', categoryName: 'Widgets', attributes: {}, locale: 'en-US',
    })
    expect(p.toLowerCase()).not.toContain('battery')
    expect(p.toLowerCase()).not.toContain('batería')
  })
})
```

- [ ] **Step 2: Implementar prompt builder**

```ts
// modules/ai/content/prompt.ts
import type { Locale } from '@/lib/i18n'

export interface BrandVoice {
  audience: string
  tone: string
  rules: string[]
}

export interface BuildPromptInput {
  brandVoice: BrandVoice
  productName: string
  categoryName: string
  attributes: Record<string, unknown>
  locale: Locale
}

const LOCALE_INSTRUCTION: Record<Locale, string> = {
  'en-US': 'Write all content in English (en-US).',
  'es-419': 'Write all content in Latin American Spanish (es-419).',
}

export function buildContentPrompt(input: BuildPromptInput): string {
  const attrEntries = Object.entries(input.attributes).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  )
  const attrBlock = attrEntries.length
    ? attrEntries.map(([k, v]) => `- ${k}: ${String(v)}`).join('\n')
    : '(no structured attributes provided)'

  return [
    `You are writing wholesale B2B product content for: "${input.productName}" (category: ${input.categoryName}).`,
    '',
    'Audience: ' + input.brandVoice.audience,
    'Tone: ' + input.brandVoice.tone,
    'Voice rules:',
    ...input.brandVoice.rules.map((r) => `- ${r}`),
    '',
    LOCALE_INSTRUCTION[input.locale],
    '',
    'You may ONLY use the structured attributes below. Do NOT invent specs. If a section has no relevant attribute, omit it.',
    '',
    'Attributes:',
    attrBlock,
    '',
    'Output EXACTLY these sections in this order, prefixed by the heading shown:',
    '## OVERVIEW',
    '(2-3 sentences)',
    '## SPECS',
    '(bulleted list from provided attributes only)',
    '## INSTALLATION',
    '(only if attributes mention installation/soldering/flex)',
    '## INCLUDED',
    '(only if attributes mention included items)',
    '## SAFETY',
    '(only if attributes mention hazmat/shipping/handling)',
    '## WARRANTY',
    '(only if attributes mention warranty_months)',
    '## SHORT',
    '(one sentence, max 160 chars, suitable for product card)',
    '## SEO_TITLE',
    '(max 60 chars)',
    '## SEO_DESCRIPTION',
    '(max 160 chars)',
  ].join('\n')
}
```

- [ ] **Step 3: Test parser (falla primero)**

```ts
// modules/ai/content/__tests__/parser.test.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseContentSections } from '../parser'

describe('parseContentSections', () => {
  it('extrae secciones de un output bien formado', () => {
    const sample = readFileSync(join(__dirname, 'fixtures', 'sample-en.txt'), 'utf-8')
    const r = parseContentSections(sample)
    expect(r.longDescriptionMd).toContain('OVERVIEW')
    expect(r.shortDescription).toBeTruthy()
    expect(r.shortDescription.length).toBeLessThanOrEqual(160)
    expect(r.seoTitle.length).toBeLessThanOrEqual(60)
    expect(r.seoDescription.length).toBeLessThanOrEqual(160)
  })

  it('tolera secciones faltantes (devuelve strings vacíos)', () => {
    const r = parseContentSections('## OVERVIEW\nFoo\n## SHORT\nBar')
    expect(r.longDescriptionMd).toContain('OVERVIEW')
    expect(r.shortDescription).toBe('Bar')
    expect(r.seoTitle).toBe('')
    expect(r.seoDescription).toBe('')
  })
})
```

- [ ] **Step 4: Fixtures**

Crear `modules/ai/content/__tests__/fixtures/sample-en.txt`:

```
## OVERVIEW
The Pi-Power Battery Cell for iPhone 13 delivers a 3279 mAh extended capacity replacement designed for independent repair professionals who require precise, technician-grade components.

## SPECS
- Capacity: 3279 mAh
- Voltage: 3.85 V
- Cycles rated: 800
- Apple model code: A2482

## INSTALLATION
Soldering not required. Professional installation recommended.

## WARRANTY
12-month limited warranty against manufacturing defects.

## SHORT
Extended-capacity 3279 mAh replacement battery for iPhone 13, A2482, technician-grade.

## SEO_TITLE
Pi-Power 3279 mAh Battery iPhone 13 A2482

## SEO_DESCRIPTION
Extended capacity 3279 mAh replacement battery for iPhone 13 (A2482). 800 cycles rated. Wholesale to repair shops USA + LATAM.
```

Crear `sample-es.txt` con contenido equivalente en español (mismo formato de headers).

- [ ] **Step 5: Implementar parser**

```ts
// modules/ai/content/parser.ts
export interface ParsedContent {
  longDescriptionMd: string
  shortDescription: string
  seoTitle: string
  seoDescription: string
}

const HEADERS = ['OVERVIEW', 'SPECS', 'INSTALLATION', 'INCLUDED', 'SAFETY', 'WARRANTY']
const META_HEADERS = ['SHORT', 'SEO_TITLE', 'SEO_DESCRIPTION']

function extractSection(text: string, header: string): string {
  const re = new RegExp(`##\\s*${header}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`)
  const m = text.match(re)
  return m?.[1]?.trim() ?? ''
}

export function parseContentSections(text: string): ParsedContent {
  const longParts: string[] = []
  for (const h of HEADERS) {
    const body = extractSection(text, h)
    if (body) longParts.push(`## ${h}\n\n${body}`)
  }
  return {
    longDescriptionMd: longParts.join('\n\n'),
    shortDescription: extractSection(text, 'SHORT'),
    seoTitle: extractSection(text, 'SEO_TITLE'),
    seoDescription: extractSection(text, 'SEO_DESCRIPTION'),
  }
}
```

- [ ] **Step 6: Test service (con mock de AIProvider, falla primero)**

```ts
// modules/ai/content/__tests__/service.test.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'

vi.mock('@/modules/ai/provider', () => ({
  isAIEnabled: vi.fn().mockReturnValue(true),
  complete: vi.fn(),
}))

beforeEach(async () => {
  await cleanDb()
  vi.clearAllMocks()
})

describe('generateContentForProduct', () => {
  it('genera y persiste DRAFT', async () => {
    const sample = readFileSync(join(__dirname, 'fixtures', 'sample-en.txt'), 'utf-8')
    const { complete } = await import('@/modules/ai/provider')
    vi.mocked(complete).mockResolvedValue({ text: sample, usage: { inputTokens: 100, outputTokens: 200 } })

    const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}`, name: 'Battery' } })
    const p = await prisma.product.create({
      data: {
        sku: `S-${Date.now()}`, slug: `s-${Date.now()}`, name: 'Battery X',
        basePrice: '10.00', categoryId: cat.id,
        attributes: { capacity_mah: 3279 } as never,
        compatibleModels: ['iPhone 13'],
      },
    })

    const { generateContentForProduct } = await import('../service')
    const result = await generateContentForProduct({ productId: p.id, locale: 'en-US' })

    expect(result.status).toBe('DRAFT')
    const row = await prisma.productContent.findFirst({ where: { productId: p.id, locale: 'en-US' } })
    expect(row?.status).toBe('DRAFT')
    expect(row?.longDescriptionMd).toContain('OVERVIEW')
  })

  it('lanza si el producto no existe', async () => {
    const { generateContentForProduct } = await import('../service')
    await expect(generateContentForProduct({ productId: 'nope', locale: 'en-US' })).rejects.toThrow()
  })
})
```

- [ ] **Step 7: Implementar service**

```ts
// modules/ai/content/service.ts
import { prisma } from '@/lib/db/client'
import { complete } from '@/modules/ai/provider'
import storeConfig from '@/store.config'
import type { Locale } from '@/lib/i18n'
import { buildContentPrompt } from './prompt'
import { parseContentSections } from './parser'

export interface GenerateInput {
  productId: string
  locale: Locale
}

export async function generateContentForProduct(input: GenerateInput) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { category: { select: { name: true } } },
  })
  if (!product) throw new Error(`Product not found: ${input.productId}`)

  const brandVoice = storeConfig.identity.brandVoice
  if (!brandVoice) throw new Error('store.config.identity.brandVoice missing — required for content generation')

  const prompt = buildContentPrompt({
    brandVoice,
    productName: product.name,
    categoryName: product.category.name,
    attributes: (product.attributes ?? {}) as Record<string, unknown>,
    locale: input.locale,
  })

  const completion = await complete(prompt, {
    model: storeConfig.ai.contentModel,
    maxTokens: 1500,
    temperature: 0.3,
  })

  const parsed = parseContentSections(completion.text)

  const saved = await prisma.productContent.upsert({
    where: { productId_locale: { productId: input.productId, locale: input.locale } },
    create: {
      productId: input.productId,
      locale: input.locale,
      longDescriptionMd: parsed.longDescriptionMd,
      shortDescription: parsed.shortDescription,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
      status: 'DRAFT',
    },
    update: {
      longDescriptionMd: parsed.longDescriptionMd,
      shortDescription: parsed.shortDescription,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
      status: 'DRAFT',
    },
  })

  return saved
}
```

- [ ] **Step 8: Test publish (falla primero)**

```ts
// modules/ai/content/__tests__/publish.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'

vi.mock('@/modules/search', () => ({
  enqueueIndex: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(async () => {
  await cleanDb()
  vi.clearAllMocks()
})

describe('publishContent', () => {
  it('transiciona DRAFT → PUBLISHED y encola reindex', async () => {
    const admin = await prisma.user.create({ data: { email: `a-${Date.now()}@x.com`, isPlatformAdmin: true } })
    const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}`, name: 'C' } })
    const p = await prisma.product.create({
      data: { sku: `S-${Date.now()}`, slug: `s-${Date.now()}`, name: 'P', basePrice: '1.00', categoryId: cat.id },
    })
    await prisma.productContent.create({
      data: { productId: p.id, locale: 'en-US', shortDescription: 'X', status: 'DRAFT' },
    })

    const { publishContent } = await import('../publish')
    const { enqueueIndex } = await import('@/modules/search')
    await publishContent({ productId: p.id, locale: 'en-US', byUserId: admin.id })

    const row = await prisma.productContent.findFirst({ where: { productId: p.id, locale: 'en-US' } })
    expect(row?.status).toBe('PUBLISHED')
    expect(enqueueIndex).toHaveBeenCalledWith(p.id, 'UPSERT')
  })

  it('rechaza si el user no es platform admin', async () => {
    const user = await prisma.user.create({ data: { email: `u-${Date.now()}@x.com`, isPlatformAdmin: false } })
    const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}`, name: 'C' } })
    const p = await prisma.product.create({
      data: { sku: `S-${Date.now()}`, slug: `s-${Date.now()}`, name: 'P', basePrice: '1.00', categoryId: cat.id },
    })
    await prisma.productContent.create({ data: { productId: p.id, locale: 'en-US', status: 'DRAFT' } })
    const { publishContent } = await import('../publish')
    await expect(publishContent({ productId: p.id, locale: 'en-US', byUserId: user.id })).rejects.toThrow(/admin/i)
  })
})
```

- [ ] **Step 9: Implementar publish**

```ts
// modules/ai/content/publish.ts
import { prisma } from '@/lib/db/client'
import { enqueueIndex } from '@/modules/search'
import type { Locale } from '@/lib/i18n'

export interface PublishInput {
  productId: string
  locale: Locale
  byUserId: string
}

export async function publishContent(input: PublishInput): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: input.byUserId },
    select: { isPlatformAdmin: true },
  })
  if (!u?.isPlatformAdmin) throw new Error('Forbidden — only platform admins can publish content')

  await prisma.productContent.update({
    where: { productId_locale: { productId: input.productId, locale: input.locale } },
    data: { status: 'PUBLISHED' },
  })

  await enqueueIndex(input.productId, 'UPSERT')
}
```

- [ ] **Step 10: Superficie pública**

```ts
// modules/ai/content/index.ts
export { generateContentForProduct } from './service'
export { publishContent } from './publish'
export { buildContentPrompt } from './prompt'
export { parseContentSections } from './parser'
export type { ParsedContent } from './parser'
```

- [ ] **Step 11: Gate**

```
set -a && . ./.env.local && set +a
pnpm lint:fix && pnpm typecheck && pnpm vitest run modules/ai/content
```

Verde.

- [ ] **Step 12: Commit**

```
git add modules/ai/content/
git commit -m "feat(ai): content module — prompt builder + parser + service + publish"
```

---

## Task C1.4: Worker script + admin UI

**Files:**
- Create: `scripts/process-ai-content-jobs.ts`
- Create: `app/admin/products/_ai-actions.ts`
- Modify: `app/admin/products/page.tsx` (botón "Generar todo")
- Modify: `app/admin/products/[id]/page.tsx` si existe, o crear sección AI en page existente

- [ ] **Step 1: Worker script**

```ts
// scripts/process-ai-content-jobs.ts
import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import { processContentJobs } from '@/modules/ai'
import { generateContentForProduct } from '@/modules/ai/content'
import { isSupportedLocale } from '@/lib/i18n'

async function main() {
  const result = await processContentJobs(async (job) => {
    if (!isSupportedLocale(job.locale)) throw new Error(`Unsupported locale ${job.locale}`)
    await generateContentForProduct({ productId: job.productId, locale: job.locale })
  })
  logger.info({ result }, 'ai content jobs tick')
}

main()
  .catch((err) => {
    logger.error({ err }, 'process-ai-content-jobs failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Server actions admin**

```ts
// app/admin/products/_ai-actions.ts
'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { enqueueContentJob } from '@/modules/ai'
import { publishContent } from '@/modules/ai/content'
import { LOCALES, isSupportedLocale } from '@/lib/i18n'
import { revalidatePath } from 'next/cache'

async function requirePlatformAdmin() {
  const user = await requireAuth()
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { isPlatformAdmin: true } })
  if (!u?.isPlatformAdmin) throw new Error('Forbidden — platform admin only')
  return user
}

export async function enqueueContentGenAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin()
  const productId = String(formData.get('productId'))
  for (const locale of LOCALES) {
    await enqueueContentJob(productId, locale)
  }
  revalidatePath(`/admin/products/${productId}`)
}

export async function enqueueBulkContentGenAction(): Promise<void> {
  await requirePlatformAdmin()
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { id: true } })
  for (const p of products) {
    for (const locale of LOCALES) {
      await enqueueContentJob(p.id, locale)
    }
  }
  revalidatePath('/admin/products')
}

export async function publishContentAction(formData: FormData): Promise<void> {
  const user = await requirePlatformAdmin()
  const productId = String(formData.get('productId'))
  const locale = String(formData.get('locale'))
  if (!isSupportedLocale(locale)) throw new Error('Invalid locale')
  await publishContent({ productId, locale, byUserId: user.id })
  revalidatePath(`/admin/products/${productId}`)
}
```

- [ ] **Step 3: Botón "Generar todo" en `/admin/products`**

Encontrar `app/admin/products/page.tsx` y agregar al final del header (cerca del título "Productos"):

```tsx
<form action={enqueueBulkContentGenAction}>
  <Button type="submit" variant="secondary" size="sm">
    Generar contenido AI (todos)
  </Button>
</form>
```

Import: `import { enqueueBulkContentGenAction } from './_ai-actions'`.

- [ ] **Step 4: Sección "Contenido AI" en page detail**

Si `app/admin/products/[id]/page.tsx` no existe, crear uno mínimo que liste ProductContent rows + botones. Si existe, agregar sección. Mostrar por locale:

```tsx
{LOCALES.map((locale) => {
  const c = contents.find((x) => x.locale === locale)
  return (
    <div key={locale} className="border rounded p-3">
      <h3>{locale}</h3>
      <div>Status: {c?.status ?? '—'}</div>
      {c?.shortDescription && <p>{c.shortDescription}</p>}
      {c?.longDescriptionMd && <details><summary>Long</summary><pre>{c.longDescriptionMd}</pre></details>}
      {c?.status === 'DRAFT' && (
        <form action={publishContentAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" size="sm">Publicar</Button>
        </form>
      )}
    </div>
  )
})}

<form action={enqueueContentGenAction}>
  <input type="hidden" name="productId" value={product.id} />
  <Button type="submit">Generar / Regenerar contenido AI</Button>
</form>
```

- [ ] **Step 5: Gate**

```
set -a && . ./.env.local && set +a
pnpm lint:fix && pnpm typecheck && pnpm vitest run && pnpm build
```

Verde. Sin regresión.

- [ ] **Step 6: Commit**

```
git add scripts/process-ai-content-jobs.ts app/admin/products/
git commit -m "feat(ai): worker script + admin UI para generar y publicar contenido"
```

---

## Task C1.5: Storefront PDP + ProductCard Tag-On Flex badge

**Files:**
- Modify: `app/(storefront)/products/[slug]/page.tsx`
- Modify: `components/commerce/ProductCard.tsx`

- [ ] **Step 1: PDP renderea ProductContent del locale activo**

En `app/(storefront)/products/[slug]/page.tsx`:

- Importar `getLocale`, `DEFAULT_LOCALE`.
- Resolver locale: `const locale = await getLocale({ userId: session?.user?.id ?? null })`.
- Después de obtener `product`, consultar:

```ts
const content =
  (await prisma.productContent.findFirst({
    where: { productId: product.id, locale, status: 'PUBLISHED' },
  })) ??
  (await prisma.productContent.findFirst({
    where: { productId: product.id, locale: DEFAULT_LOCALE, status: 'PUBLISHED' },
  }))
```

- Renderear `content?.longDescriptionMd` (con render markdown simple — si no hay lib, `<div className="whitespace-pre-wrap">{content.longDescriptionMd}</div>`). `content?.shortDescription` arriba del precio. Si no hay content publicado, ocultar la sección (no mostrar nada nuevo, dejar el PDP existente como estaba).

- Set `<title>` y `<meta name="description">` via `generateMetadata` con `content?.seoTitle` / `content?.seoDescription` cuando existan.

- [ ] **Step 2: Badge Tag-On Flex en ProductCard**

En `components/commerce/ProductCard.tsx`:

```tsx
{product.attributes && (product.attributes as Record<string, unknown>).flex_included === 'tag-on' && (
  <Badge variant="info" className="mt-1">Tag-On Flex</Badge>
)}
```

Si `Badge` no se importa, agregar. Si `attributes` no llega al componente, propagarlo desde el server (extend select).

- [ ] **Step 3: Smoke manual**

```bash
pnpm dev
```

Visitar `/products/<slug>` con un producto que tenga ProductContent published EN. Cambiar idioma vía LocaleSwitch → debería cambiar el contenido si hay ES published, sino fallback a EN.

- [ ] **Step 4: Gate**

```
set -a && . ./.env.local && set +a
pnpm lint:fix && pnpm typecheck && pnpm vitest run && pnpm build
```

Verde. Sin regresión.

- [ ] **Step 5: Commit**

```
git add app/\(storefront\)/products/ components/commerce/ProductCard.tsx
git commit -m "feat(storefront): PDP rendea ProductContent por locale + Tag-On Flex badge"
```

---

## Cierre Corte 1

- [ ] **Activar flag**

En `store.config.ts`, cambiar `ai.content` de `false` a `true`.

```
git add store.config.ts
git commit -m "chore(ai): activar flag modules.ai.content (Corte 1 cerrado)"
```

- [ ] **Runbook**

Crear `docs/runbooks/ai-content.md` con:
- Cómo encolar generación (admin UI / script manual).
- Cómo correr el worker manualmente (`pnpm tsx scripts/process-ai-content-jobs.ts`).
- Setup scheduled task Coolify: `* * * * *` (mismo patrón que `process-search-index-queue`).
- Cómo aprobar contenido (admin UI gate platform admin).
- Cómo verificar budget (env `AI_MONTHLY_TOKEN_BUDGET`, log Pino).
- Troubleshooting: noop fallback, FAILED jobs, retry.

Commit: `docs(runbooks): ai-content operations`.

- [ ] **Gate final**

```
set -a && . ./.env.local && set +a
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Verde. Sin regresión.

---

## Self-Review

**Cobertura spec §5:**
- Prompt builder + brandVoice + atributos + locale ✅ (C1.1, C1.3)
- Guardrail "no inventa specs ausentes" ✅ (test del prompt + instrucción explícita)
- Generación EN+ES con `LOCALES` ✅
- Admin UI con generar uno/bulk + preview + approve ✅ (C1.4)
- Owner = platform admin ✅ (C1.3 publish + C1.4 actions)
- PDP rendea published locale + fallback EN ✅ (C1.5)
- Reindex post-publish ✅ (`enqueueIndex` en publishContent)
- Worker async ✅ (C1.4)
- Tag-On Flex badge ✅ (C1.5)
- Imágenes webp ✅ (C1.2)

**Placeholders:** ninguno; los puntos suspensivos `'...'` en items del loader son por brevedad — el ejecutor copia los nombres reales del loader existente sin alterarlos.

**Consistencia de tipos:** `Locale` consistente. `BrandVoice` definido en `modules/ai/content/prompt.ts` y reusado por el service. `GenerateInput` / `PublishInput` consistentes entre service/publish/actions/worker.

**Scope cut:**
- `ai.content` flag se activa al cierre, no antes.
- Sin scheduled task Coolify automático (manual setup post-merge — está en runbook).
- Markdown rendering: directo `whitespace-pre-wrap`; si Cowork pide librería (react-markdown), se agrega después.
- Audit log de aprobaciones: defer.

**TDD aplicado:** prompt, parser, service, publish son testables sin red. AIProvider mockeado. cleanDb usado en tests con DB.
