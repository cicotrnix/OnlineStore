# Fase 4 · Corte 3 — Recomendaciones (pgvector, sin LLM en hot path)

> **For agentic workers:** subagent-driven-development. Steps usan checkbox.

**Goal:** Mostrar "Productos relacionados" en cada PDP usando vecinos más cercanos por embedding pgvector (HNSW cosine, ADR 0019 reusado). Para logueado, mezclar con historial de órdenes. Sin LLM en el hot path — el embedding ya está calculado por Fase 3 / Corte 1.

**Architecture:** Sub-módulo `modules/ai/recommendations/`. Pure `$queryRaw` sobre `Product.embedding`. `filterAccessibleIds` post-query (defense-in-depth). Para logueado: heurística sobre `OrderLine` historial → bias hacia categorías compradas. Render en PDP como sección debajo de specs.

**Tech Stack:** `prisma.$queryRaw` con operador `<=>` cosine, `filterAccessibleIds` (Fase 3), `formatVectorForPostgres` (ADR 0019). Sin Anthropic SDK acá.

**Alcance:**
- `getRelatedProducts(productId, orgId, limit=8)` — vecinos pgvector excluyendo el producto base.
- `getPersonalizedRecommendations(userId, orgId, limit=8)` — heurística sobre `OrderLine` del user (categorías compradas + vecinos vector de productos recientes).
- Integrar en PDP storefront como sección "Productos relacionados" (anónimo) o "Recomendado para ti" (logueado con historial).
- Flag `modules.ai.recommendations` se activa al cierre.
- ADR 0024 — pgvector recos sin LLM.
- Runbook corto.

**Fuera de alcance:**
- LLM en hot path (defer; el spec lo deja opcional para "por qué te lo recomendamos").
- Personalización ML real (clicks, views, dwell time). Defer.
- Caché Redis. Defer.

**Spec:** `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §7.

---

## File structure

| Archivo | Responsabilidad |
|---|---|
| `modules/ai/recommendations/service.ts` | `getRelatedProducts` + `getPersonalizedRecommendations` |
| `modules/ai/recommendations/index.ts` | Superficie pública |
| `modules/ai/recommendations/__tests__/service.test.ts` | Tests TDD |
| `app/(storefront)/products/[slug]/page.tsx` | Sección "Productos relacionados" |
| `components/commerce/RelatedProducts.tsx` | RSC que recibe productos y renderea ProductCard grid |
| `docs/adr/0024-recommendations-pgvector-no-llm.md` | ADR |
| `docs/runbooks/ai-recommendations.md` | Runbook |

---

## Task C3.1: Service `getRelatedProducts`

**Files:** `modules/ai/recommendations/service.ts`, `index.ts`, test

- [ ] **Step 1: Test (cleanDb + producto con embedding fake)**

Para test sin Voyage, escribir embeddings determinísticos directamente vía `$executeRawUnsafe`. El test verifica que con 3 productos y embeddings cercanos en pares (A↔B vs C), `getRelatedProducts(A)` devuelve B antes que C.

```ts
// modules/ai/recommendations/__tests__/service.test.ts
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

async function makeProductWithEmbedding(suffix: string, vec: number[]) {
  const cat = await prisma.category.create({ data: { slug: `c-${suffix}`, name: 'C' } })
  const p = await prisma.product.create({
    data: {
      sku: `S-${suffix}`, slug: `s-${suffix}`, name: `P-${suffix}`,
      basePrice: new Decimal('1.00'), categoryId: cat.id, isActive: true,
    },
  })
  const literal = `[${vec.join(',')}]`
  await prisma.$executeRawUnsafe(
    `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
    literal, p.id,
  )
  return p
}

function vec(seed: number): number[] {
  const a = new Array(512).fill(0)
  a[0] = seed
  a[1] = 1 - seed
  return a
}

beforeEach(async () => { await cleanDb() })

describe('getRelatedProducts', () => {
  it('devuelve vecinos pgvector excluyendo el producto base', async () => {
    const a = await makeProductWithEmbedding(`a-${Date.now()}`, vec(0.9))
    const b = await makeProductWithEmbedding(`b-${Date.now() + 1}`, vec(0.85)) // cerca de A
    const c = await makeProductWithEmbedding(`c-${Date.now() + 2}`, vec(0.1))  // lejos de A

    const { getRelatedProducts } = await import('../service')
    const result = await getRelatedProducts({ productId: a.id, orgId: null, limit: 5 })

    expect(result.map((p) => p.id)).not.toContain(a.id)
    expect(result[0]?.id).toBe(b.id) // B más cerca que C
  })

  it('devuelve lista vacía si producto base no tiene embedding', async () => {
    const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}`, name: 'C' } })
    const p = await prisma.product.create({
      data: {
        sku: `S-${Date.now()}`, slug: `s-${Date.now()}`, name: 'X',
        basePrice: new Decimal('1.00'), categoryId: cat.id, isActive: true,
      },
    })
    const { getRelatedProducts } = await import('../service')
    expect(await getRelatedProducts({ productId: p.id, orgId: null, limit: 5 })).toEqual([])
  })
})
```

- [ ] **Step 2: Implementar service**

```ts
// modules/ai/recommendations/service.ts
import { prisma } from '@/lib/db/client'
import { filterAccessibleIds } from '@/modules/search'
import type { Category, Product } from '@prisma/client'

export interface GetRelatedInput {
  productId: string
  orgId: string | null
  limit?: number
}

export type RelatedProduct = Product & { category: Category }

const DEFAULT_LIMIT = 8

export async function getRelatedProducts(input: GetRelatedInput): Promise<RelatedProduct[]> {
  const limit = input.limit ?? DEFAULT_LIMIT

  // Necesitamos el embedding del producto base. Como Prisma client no expone
  // vector (ADR 0019), traemos el id y verificamos existencia, luego un raw
  // query que ordena por <=> embedding del base.
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(`
    SELECT p2.id
    FROM "Product" p1
    JOIN "Product" p2 ON p2.id <> p1.id
    WHERE p1.id = $1
      AND p1.embedding IS NOT NULL
      AND p2.embedding IS NOT NULL
      AND p2."isActive" = true
    ORDER BY p2.embedding <=> p1.embedding
    LIMIT $2
  `, input.productId, limit * 2)

  if (rows.length === 0) return []
  const candidateIds = rows.map((r) => r.id)
  const accessibleIds = await filterAccessibleIds(input.orgId, candidateIds)
  const top = accessibleIds.slice(0, limit)

  const products = await prisma.product.findMany({
    where: { id: { in: top } },
    include: { category: true },
  })
  // Mantener orden de la query vectorial
  const byId = new Map(products.map((p) => [p.id, p]))
  return top.map((id) => byId.get(id)).filter((p): p is RelatedProduct => Boolean(p))
}

export interface GetPersonalizedInput {
  userId: string
  orgId: string | null
  limit?: number
}

export async function getPersonalizedRecommendations(
  input: GetPersonalizedInput,
): Promise<RelatedProduct[]> {
  const limit = input.limit ?? DEFAULT_LIMIT

  // Últimas 20 órdenes del usuario → productos comprados.
  const recentLines = await prisma.orderLine.findMany({
    where: { order: { placedByUserId: input.userId } },
    orderBy: { id: 'desc' },
    take: 20,
    select: { productId: true },
  })

  if (recentLines.length === 0) return []

  // Trae 1-3 productos base recientes únicos, sus vecinos por embedding,
  // luego filtra accesibles y excluye ya comprados.
  const purchased = new Set(recentLines.map((l) => l.productId))
  const seedIds = Array.from(purchased).slice(0, 3)

  const allCandidates: string[] = []
  for (const seed of seedIds) {
    const nbrs = await getRelatedProducts({ productId: seed, orgId: input.orgId, limit })
    for (const p of nbrs) {
      if (!purchased.has(p.id) && !allCandidates.includes(p.id)) {
        allCandidates.push(p.id)
      }
    }
  }

  if (allCandidates.length === 0) return []
  const top = allCandidates.slice(0, limit)
  const products = await prisma.product.findMany({
    where: { id: { in: top } },
    include: { category: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  return top.map((id) => byId.get(id)).filter((p): p is RelatedProduct => Boolean(p))
}
```

- [ ] **Step 3: index.ts**

```ts
export { getRelatedProducts, getPersonalizedRecommendations } from './service'
export type {
  GetRelatedInput, GetPersonalizedInput, RelatedProduct,
} from './service'
```

- [ ] **Step 4: Gate**

```
set -a && . ./.env.local && set +a
pnpm vitest run modules/ai/recommendations
```

Verde.

- [ ] **Step 5: Commit**

```
git add modules/ai/recommendations/
git commit -m "feat(ai): recommendations module — getRelatedProducts + getPersonalizedRecommendations (pgvector, sin LLM)"
```

---

## Task C3.2: PDP integration

**Files:**
- Create: `components/commerce/RelatedProducts.tsx`
- Modify: `app/(storefront)/products/[slug]/page.tsx`

- [ ] **Step 1: Componente**

```tsx
// components/commerce/RelatedProducts.tsx
import { Card, CardBody } from '@/components/ui/Card'
import { formatMoney } from '@/lib/money'
import storeConfig from '@/store.config'
import type { Category, Product } from '@prisma/client'
import Link from 'next/link'

type Props = {
  title: string
  products: (Product & { category: Category })[]
  signedIn: boolean
}

export function RelatedProducts({ title, products, signedIn }: Props) {
  if (products.length === 0) return null
  return (
    <section aria-labelledby="related-heading" className="mt-12 md:col-span-2">
      <h2 id="related-heading" className="text-lg font-medium tracking-tight">
        {title}
      </h2>
      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.slug}`}>
              <Card className="hover:border-gray-400 h-full">
                <CardBody>
                  <h3 className="font-medium text-sm line-clamp-2">{p.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{p.category.name}</p>
                  {signedIn ? (
                    <p className="mt-2 text-sm font-medium tabular-nums">
                      {formatMoney(p.basePrice, storeConfig.currency.base)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500 italic">Inicia sesión</p>
                  )}
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: PDP usa el componente (logged-in con historial OR fallback related)**

En `app/(storefront)/products/[slug]/page.tsx`, después de la tier table y antes del cierre del `<div>` principal, agregar:

```tsx
const recos = storeConfig.ai.recommendations
  ? session?.user?.id
    ? (await getPersonalizedRecommendations({ userId: session.user.id, orgId, limit: 8 })) ||
      []
    : []
  : []
const related =
  storeConfig.ai.recommendations
    ? recos.length > 0
      ? recos
      : await getRelatedProducts({ productId: product.id, orgId, limit: 8 })
    : []
```

(O envolver con try/catch — si el query vectorial falla cuando el producto no tiene embedding, devuelve `[]`.)

Y al final del JSX:

```tsx
{related.length > 0 && (
  <RelatedProducts
    title={recos.length > 0 ? 'Recomendado para ti' : 'Productos relacionados'}
    products={related}
    signedIn={!!session?.user}
  />
)}
```

Imports: `import { RelatedProducts } from '@/components/commerce/RelatedProducts'` + `import { getRelatedProducts, getPersonalizedRecommendations } from '@/modules/ai/recommendations'`.

- [ ] **Step 3: Gate**

```
set -a && . ./.env.local && set +a
pnpm lint:fix && pnpm typecheck && pnpm test && pnpm build
```

Verde.

- [ ] **Step 4: Commit**

```
git add components/commerce/RelatedProducts.tsx 'app/(storefront)/products/[slug]/page.tsx'
git commit -m "feat(storefront): PDP muestra recomendaciones (personalizadas o relacionadas)"
```

---

## Cierre Corte 3

- [ ] **Activar flag**

`store.config.ts` → `ai.recommendations: true`.

Commit: `chore(ai): activar flag modules.ai.recommendations (Corte 3 cerrado)`.

- [ ] **ADR 0024**

`docs/adr/0024-recommendations-pgvector-no-llm.md`. Decisión: pgvector cosine + filterAccessibleIds + heurística historial; LLM fuera del hot path. Justificación: latencia/costo controlados, embeddings ya existen (Fase 3 / Corte 1).

Commit: `docs(adr): 0024 recommendations via pgvector sin LLM en hot path`.

- [ ] **Runbook**

`docs/runbooks/ai-recommendations.md` — endpoints, fallback cuando productos no tienen embedding, troubleshooting.

Commit: `docs(runbooks): ai-recommendations operations`.

- [ ] **Gate final**

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Verde.

---

## Self-Review

**Cobertura spec §7:**
- Productos relacionados en PDP por pgvector ✅
- Personalizado para logueado vía historial ✅
- Sin LLM en hot path ✅
- ADR 0024 ✅

**Scope cut:**
- "Por qué te lo recomendamos" via LLM: defer.
- Personalización ML real: defer.
- Caché: defer (cada PDP es server-rendered, cacheable a nivel CDN si performance importa).

**TDD:** test del service con embeddings sintéticos vía raw SQL (evita dependencia Voyage). Cubre vecinos + producto sin embedding.

**Dependencias:** asume embeddings poblados en `Product.embedding`. En dev local sin Voyage, los productos no tienen embedding → el service devuelve `[]` y la sección no renderea. Aceptable.
