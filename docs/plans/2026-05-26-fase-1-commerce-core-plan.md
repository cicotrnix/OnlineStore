# Fase 1 — Commerce core B2B · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir commerce core B2B funcional: catálogo con SKUs simples, precios por cliente, carrito persistente por usuario, checkout 4-step B2B, órdenes con snapshot inmutable, admin con impersonation.

**Architecture:** 5 módulos nuevos en `modules/` (catalog, pricing, cart, checkout, orders) + extensiones a customers (OrganizationAddress) y User/Session. TDD obligatorio en módulos de negocio. Vertical slice: schemas y módulos primero, después UI.

**Tech Stack:** Next.js 14 (App Router), TypeScript estricto, Prisma + Postgres 18, Auth.js v5, tRPC, Tailwind + shadcn/ui, Vitest, Playwright.

**Spec de referencia:** `docs/specs/2026-05-26-fase-1-commerce-core.md` (rev. 2, APPROVED FOR PLAN).

---

## Parte 1 — Schema + migraciones

### Task 1: Extender User y Session, type augmentation Auth.js

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `types/next-auth.d.ts`

- [ ] **Step 1: Agregar enum y campos a User**

En `prisma/schema.prisma` agregar después de los enums existentes:

```prisma
enum CatalogView {
  CARDS
  LIST
}
```

Modificar el modelo `User` para añadir:

```prisma
model User {
  // ... campos existentes
  isPlatformAdmin      Boolean     @default(false)
  preferredCatalogView CatalogView @default(CARDS)

  // Nuevas relaciones (van al final del modelo)
  cancelledOrders   Order[]            @relation("OrderCancelledBy")
  impersonationLogs ImpersonationLog[] @relation("ImpersonationAdmin")
}
```

- [ ] **Step 2: Extender Session**

Reemplazar el modelo `Session` existente con:

```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  activeOrgId        String?
  impersonatingOrgId String?
  lastSeenAt         DateTime @default(now())

  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  activeOrg        Organization? @relation("SessionActiveOrg",        fields: [activeOrgId],        references: [id], onDelete: SetNull)
  impersonatingOrg Organization? @relation("SessionImpersonatingOrg", fields: [impersonatingOrgId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([activeOrgId])
  @@index([impersonatingOrgId])
}
```

Modificar el modelo `Organization` para añadir relaciones inversas:

```prisma
model Organization {
  // ... campos existentes
  activeSessions        Session[]          @relation("SessionActiveOrg")
  impersonatingSessions Session[]          @relation("SessionImpersonatingOrg")
  impersonationLogs     ImpersonationLog[] @relation("ImpersonationTarget")
  addresses             OrganizationAddress[]
  customerPrices        CustomerPrice[]
  orders                Order[]
}
```

- [ ] **Step 3: Type augmentation**

Reemplazar `types/next-auth.d.ts`:

```typescript
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isPlatformAdmin: boolean
    } & DefaultSession['user']
    activeOrgId: string | null
    impersonatingOrgId: string | null
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: Errores en `lib/auth/config.ts` (callbacks no expone los nuevos campos). Los arreglamos en Task 24.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma types/next-auth.d.ts
git commit -m "feat(schema): extend User and Session for active org and impersonation"
```

---

### Task 2: Agregar OrganizationAddress al módulo customers

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar modelo OrganizationAddress**

En `prisma/schema.prisma`, después del modelo `Invitation`:

```prisma
model OrganizationAddress {
  id                String   @id @default(cuid())
  organizationId    String
  label             String
  recipient         String
  line1             String
  line2             String?
  city              String
  state             String?
  postalCode        String
  country           String
  phone             String?
  isDefaultBilling  Boolean  @default(false)
  isDefaultShipping Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  billingForOrders  Order[]      @relation("OrderBilling")
  shippingForOrders Order[]      @relation("OrderShipping")

  @@index([organizationId])
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add OrganizationAddress model"
```

---

### Task 3: Agregar modelos de catalog, pricing, cart, orders

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar modelos al final del schema**

```prisma
// ─── catalog ───

model Category {
  id          String    @id @default(cuid())
  slug        String    @unique
  name        String
  description String?
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  products    Product[]
}

model Product {
  id            String   @id @default(cuid())
  sku           String   @unique
  slug          String   @unique
  name          String
  description   String?
  basePrice     Decimal  @db.Decimal(12, 2)
  stockQuantity Int      @default(0)
  imageUrl      String?
  isActive      Boolean  @default(true)
  categoryId    String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  category       Category        @relation(fields: [categoryId], references: [id])
  customerPrices CustomerPrice[]
  cartItems      CartItem[]
  orderLines     OrderLine[]

  @@index([categoryId])
  @@index([isActive])
}

// ─── pricing ───

model CustomerPrice {
  id             String    @id @default(cuid())
  organizationId String
  productId      String
  price          Decimal   @db.Decimal(12, 2)
  validFrom      DateTime?
  validUntil     DateTime?
  notes          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  product      Product      @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([organizationId, productId])
  @@index([organizationId])
}

// ─── cart ───

model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items CartItem[]
}

model CartItem {
  id                String   @id @default(cuid())
  cartId            String
  productId         String
  quantity          Int
  unitPriceSnapshot Decimal  @db.Decimal(12, 2)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@unique([cartId, productId])
  @@index([cartId])
}

// ─── orders ───

enum OrderStatus {
  PENDING_PAYMENT
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

model Order {
  id                String      @id @default(cuid())
  orderNumber       String      @unique
  organizationId    String
  placedByUserId    String
  status            OrderStatus @default(PENDING_PAYMENT)
  poNumber          String?
  notes             String?
  billingAddressId  String
  shippingAddressId String
  subtotal          Decimal     @db.Decimal(12, 2)
  total             Decimal     @db.Decimal(12, 2)
  currency          String
  placedAt          DateTime    @default(now())
  confirmedAt       DateTime?
  shippedAt         DateTime?
  deliveredAt       DateTime?
  cancelledAt       DateTime?
  cancelledByUserId String?

  organization    Organization        @relation(fields: [organizationId], references: [id])
  placedBy        User                @relation(fields: [placedByUserId], references: [id])
  cancelledBy     User?               @relation("OrderCancelledBy", fields: [cancelledByUserId], references: [id])
  billingAddress  OrganizationAddress @relation("OrderBilling",     fields: [billingAddressId],  references: [id])
  shippingAddress OrganizationAddress @relation("OrderShipping",    fields: [shippingAddressId], references: [id])
  lines           OrderLine[]

  @@index([organizationId])
  @@index([status])
}

model OrderLine {
  id             String   @id @default(cuid())
  orderId        String
  productId      String
  sku            String
  name           String
  unitPrice      Decimal  @db.Decimal(12, 2)
  quantity       Int
  discountAmount Decimal  @db.Decimal(12, 2) @default(0)
  lineTotal      Decimal  @db.Decimal(12, 2)
  createdAt      DateTime @default(now())

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
}

// ─── audit ───

enum ImpersonationAction {
  START
  STOP
}

model ImpersonationLog {
  id          String              @id @default(cuid())
  adminUserId String
  targetOrgId String
  action      ImpersonationAction
  reason      String?
  createdAt   DateTime            @default(now())

  adminUser User         @relation("ImpersonationAdmin",  fields: [adminUserId], references: [id])
  targetOrg Organization @relation("ImpersonationTarget", fields: [targetOrgId], references: [id])

  @@index([adminUserId])
  @@index([targetOrgId])
  @@index([createdAt])
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add catalog, pricing, cart, orders, impersonation models"
```

---

### Task 4: Migrar y verificar

**Files:**
- Modify: `prisma/migrations/...`

- [ ] **Step 1: Verificar Postgres local corre**

Run:
```bash
docker compose ps
```
Expected: `online-store-postgres` running healthy. Si no, `docker compose up -d`.

- [ ] **Step 2: Crear migración**

Run:
```bash
pnpm exec prisma migrate dev --name fase1_commerce_core
```

Expected: migración generada en `prisma/migrations/YYYYMMDDhhmmss_fase1_commerce_core/migration.sql`, Prisma Client regenerado sin errores.

- [ ] **Step 3: Verificar grep de Decimal(10, 2)**

Run:
```bash
grep -rn "Decimal(10" prisma/
```
Expected: 0 resultados (todo debe ser `(12, 2)`).

- [ ] **Step 4: Sanity check con Prisma Studio**

Run:
```bash
pnpm exec prisma studio &
```
Abrir http://localhost:5555, verificar que existen las tablas nuevas. Cerrar.

- [ ] **Step 5: Commit migración**

```bash
git add prisma/migrations/
git commit -m "chore(db): migration for fase 1 schema"
```

---

## Parte 2 — Money utility

### Task 5: lib/money.ts con TDD

**Files:**
- Create: `lib/money.ts`
- Create: `lib/money.test.ts`

- [ ] **Step 1: Test que falla**

Crear `lib/money.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { formatMoney, addMoney, multiplyMoney, isPositiveMoney } from './money'

describe('formatMoney', () => {
  it('formats integer USD', () => {
    expect(formatMoney(new Decimal('25.00'), 'USD')).toBe('$25.00')
  })

  it('formats decimal USD', () => {
    expect(formatMoney(new Decimal('25.50'), 'USD')).toBe('$25.50')
  })

  it('formats large amount with thousand separators', () => {
    expect(formatMoney(new Decimal('12345.67'), 'USD')).toBe('$12,345.67')
  })
})

describe('addMoney', () => {
  it('adds two decimals correctly', () => {
    const result = addMoney(new Decimal('10.10'), new Decimal('20.20'))
    expect(result.toString()).toBe('30.3')
  })
})

describe('multiplyMoney', () => {
  it('multiplies decimal by integer', () => {
    const result = multiplyMoney(new Decimal('12.50'), 3)
    expect(result.toString()).toBe('37.5')
  })
})

describe('isPositiveMoney', () => {
  it('returns true for positive', () => {
    expect(isPositiveMoney(new Decimal('0.01'))).toBe(true)
  })
  it('returns false for zero', () => {
    expect(isPositiveMoney(new Decimal('0'))).toBe(false)
  })
  it('returns false for negative', () => {
    expect(isPositiveMoney(new Decimal('-1'))).toBe(false)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test lib/money`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Crear `lib/money.ts`:

```typescript
import { Decimal } from '@prisma/client/runtime/library'

export function formatMoney(amount: Decimal, currency: string): string {
  const value = amount.toNumber()
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function addMoney(...amounts: Decimal[]): Decimal {
  return amounts.reduce((acc, n) => acc.add(n), new Decimal(0))
}

export function multiplyMoney(amount: Decimal, factor: number): Decimal {
  return amount.mul(factor)
}

export function isPositiveMoney(amount: Decimal): boolean {
  return amount.greaterThan(0)
}
```

- [ ] **Step 4: Verificar pasa**

Run: `pnpm test lib/money`
Expected: PASS 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/money.ts lib/money.test.ts
git commit -m "feat(money): formatMoney helpers with Decimal precision"
```

---

## Parte 3 — Módulo pricing (TDD)

### Task 6: pricing schemas y resolveForOrg con todas las edge cases

**Files:**
- Create: `modules/pricing/schemas.ts`
- Create: `modules/pricing/repository.ts`
- Create: `modules/pricing/service.ts`
- Create: `modules/pricing/service.test.ts`
- Create: `modules/pricing/index.ts`

- [ ] **Step 1: Schemas Zod**

Crear `modules/pricing/schemas.ts`:

```typescript
import { z } from 'zod'

export const setCustomerPriceSchema = z.object({
  organizationId: z.string().cuid(),
  productId: z.string().cuid(),
  price: z.number().positive().multipleOf(0.01),
  validFrom: z.date().optional().nullable(),
  validUntil: z.date().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export type SetCustomerPriceInput = z.infer<typeof setCustomerPriceSchema>
```

- [ ] **Step 2: Tests primero (todas las edge cases)**

Crear `modules/pricing/service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db/client'
import { pricingService } from './service'

async function seed() {
  await prisma.customerPrice.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()

  const category = await prisma.category.create({
    data: { slug: 'cat-test', name: 'Test', sortOrder: 0 },
  })
  const product = await prisma.product.create({
    data: {
      sku: 'SKU-1',
      slug: 'p-1',
      name: 'Producto 1',
      basePrice: new Decimal('10.00'),
      categoryId: category.id,
    },
  })
  const org = await prisma.organization.create({
    data: { name: 'Org A', slug: 'org-a' },
  })
  return { product, org }
}

describe('pricingService.resolveForOrg', () => {
  beforeEach(async () => await seed())

  it('returns customer override when active', async () => {
    const { product, org } = await seed()
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        price: new Decimal('8.00'),
      },
    })
    const price = await pricingService.resolveForOrg(org.id, product.id)
    expect(price.toString()).toBe('8')
  })

  it('returns base price when no override exists', async () => {
    const { product, org } = await seed()
    const price = await pricingService.resolveForOrg(org.id, product.id)
    expect(price.toString()).toBe('10')
  })

  it('returns base price when override validFrom is in future', async () => {
    const { product, org } = await seed()
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        price: new Decimal('5.00'),
        validFrom: future,
      },
    })
    const price = await pricingService.resolveForOrg(org.id, product.id)
    expect(price.toString()).toBe('10')
  })

  it('returns base price when override validUntil is in past', async () => {
    const { product, org } = await seed()
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        price: new Decimal('5.00'),
        validUntil: past,
      },
    })
    const price = await pricingService.resolveForOrg(org.id, product.id)
    expect(price.toString()).toBe('10')
  })

  it('throws when product does not exist', async () => {
    const { org } = await seed()
    await expect(
      pricingService.resolveForOrg(org.id, 'nonexistent-id')
    ).rejects.toThrow(/product not found/i)
  })
})

describe('pricingService.batchResolveForOrg', () => {
  it('returns map of productId → price for multiple products', async () => {
    const { org } = await seed()
    const cat = await prisma.category.findFirstOrThrow()
    const p1 = await prisma.product.findFirstOrThrow()
    const p2 = await prisma.product.create({
      data: {
        sku: 'SKU-2',
        slug: 'p-2',
        name: 'Producto 2',
        basePrice: new Decimal('20.00'),
        categoryId: cat.id,
      },
    })
    await prisma.customerPrice.create({
      data: { organizationId: org.id, productId: p1.id, price: new Decimal('7.00') },
    })

    const result = await pricingService.batchResolveForOrg(org.id, [p1.id, p2.id])
    expect(result.get(p1.id)?.toString()).toBe('7')
    expect(result.get(p2.id)?.toString()).toBe('20')
  })
})
```

- [ ] **Step 3: Verificar fallan**

Run: `pnpm test modules/pricing`
Expected: FAIL (service no existe).

- [ ] **Step 4: Implementar repository**

Crear `modules/pricing/repository.ts`:

```typescript
import { prisma } from '@/lib/db/client'

export const pricingRepository = {
  async findActiveOverride(orgId: string, productId: string) {
    const now = new Date()
    return prisma.customerPrice.findFirst({
      where: {
        organizationId: orgId,
        productId,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
    })
  },

  async findActiveOverridesForProducts(orgId: string, productIds: string[]) {
    const now = new Date()
    return prisma.customerPrice.findMany({
      where: {
        organizationId: orgId,
        productId: { in: productIds },
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
    })
  },

  async getProductBasePrice(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { basePrice: true },
    })
  },

  async getProductsBasePrices(productIds: string[]) {
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, basePrice: true },
    })
  },
}
```

- [ ] **Step 5: Implementar service**

Crear `modules/pricing/service.ts`:

```typescript
import type { Decimal } from '@prisma/client/runtime/library'
import { pricingRepository } from './repository'

export const pricingService = {
  async resolveForOrg(orgId: string, productId: string): Promise<Decimal> {
    const override = await pricingRepository.findActiveOverride(orgId, productId)
    if (override) return override.price

    const product = await pricingRepository.getProductBasePrice(productId)
    if (!product) throw new Error(`Product not found: ${productId}`)
    return product.basePrice
  },

  async batchResolveForOrg(
    orgId: string,
    productIds: string[]
  ): Promise<Map<string, Decimal>> {
    const [overrides, products] = await Promise.all([
      pricingRepository.findActiveOverridesForProducts(orgId, productIds),
      pricingRepository.getProductsBasePrices(productIds),
    ])

    const overridesByProductId = new Map(overrides.map((o) => [o.productId, o.price]))
    const result = new Map<string, Decimal>()
    for (const product of products) {
      const override = overridesByProductId.get(product.id)
      result.set(product.id, override ?? product.basePrice)
    }
    return result
  },
}
```

- [ ] **Step 6: index.ts**

Crear `modules/pricing/index.ts`:

```typescript
export { pricingService } from './service'
export { setCustomerPriceSchema } from './schemas'
export type { SetCustomerPriceInput } from './schemas'
```

- [ ] **Step 7: Tests pasan**

Run: `pnpm test modules/pricing`
Expected: PASS 6 tests.

- [ ] **Step 8: Commit**

```bash
git add modules/pricing/
git commit -m "feat(pricing): resolveForOrg with override + batch resolution + tests"
```

---

## Parte 4 — Módulo catalog (TDD)

### Task 7: Catalog schemas

**Files:**
- Create: `modules/catalog/schemas.ts`

- [ ] **Step 1: Schemas Zod**

```typescript
import { z } from 'zod'

const slug = z.string().regex(/^[a-z0-9-]+$/).min(1).max(80)
const sku = z.string().regex(/^[A-Z0-9-]+$/).min(1).max(40)

export const createCategorySchema = z.object({
  slug,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().cuid(),
})

export const createProductSchema = z.object({
  sku,
  slug,
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  basePrice: z.number().positive().multipleOf(0.01),
  stockQuantity: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional().nullable(),
  categoryId: z.string().cuid(),
  isActive: z.boolean().default(true),
})

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().cuid(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
```

- [ ] **Step 2: Commit**

```bash
git add modules/catalog/schemas.ts
git commit -m "feat(catalog): Zod schemas for Category and Product"
```

---

### Task 8: Catalog repository

**Files:**
- Create: `modules/catalog/repository.ts`

- [ ] **Step 1: Implementar repository**

```typescript
import { prisma } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

export const catalogRepository = {
  // Categories
  async createCategory(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data })
  },
  async updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data })
  },
  async deleteCategory(id: string) {
    return prisma.category.delete({ where: { id } })
  },
  async findCategoryBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } })
  },
  async listCategories(activeOnly = true) {
    return prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    })
  },

  // Products
  async createProduct(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data })
  },
  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data })
  },
  async findProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    })
  },
  async findProductById(id: string) {
    return prisma.product.findUnique({ where: { id } })
  },
  async listProducts(opts: {
    categoryId?: string
    activeOnly?: boolean
    take?: number
    skip?: number
  }) {
    return prisma.product.findMany({
      where: {
        ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
        ...(opts.activeOnly ?? true ? { isActive: true } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
    })
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add modules/catalog/repository.ts
git commit -m "feat(catalog): repository for Category and Product CRUD"
```

---

### Task 9: Catalog service con TDD

**Files:**
- Create: `modules/catalog/service.ts`
- Create: `modules/catalog/service.test.ts`
- Create: `modules/catalog/index.ts`

- [ ] **Step 1: Tests primero**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/client'
import { catalogService } from './service'

beforeEach(async () => {
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
})

describe('catalogService — categories', () => {
  it('creates category', async () => {
    const cat = await catalogService.createCategory({
      slug: 'cosmeticos',
      name: 'Cosméticos',
      sortOrder: 1,
    })
    expect(cat.id).toBeTruthy()
    expect(cat.slug).toBe('cosmeticos')
  })

  it('rejects duplicate slug', async () => {
    await catalogService.createCategory({ slug: 'limpieza', name: 'Limpieza' })
    await expect(
      catalogService.createCategory({ slug: 'limpieza', name: 'Otro' })
    ).rejects.toThrow()
  })

  it('lists active categories sorted', async () => {
    await catalogService.createCategory({ slug: 'a', name: 'A', sortOrder: 2 })
    await catalogService.createCategory({ slug: 'b', name: 'B', sortOrder: 1 })
    const cats = await catalogService.listCategories()
    expect(cats.map((c) => c.slug)).toEqual(['b', 'a'])
  })
})

describe('catalogService — products', () => {
  async function makeCategory() {
    return catalogService.createCategory({ slug: 'cat-1', name: 'Cat 1' })
  }

  it('creates product', async () => {
    const cat = await makeCategory()
    const p = await catalogService.createProduct({
      sku: 'SKU-001',
      slug: 'producto-1',
      name: 'Producto 1',
      basePrice: 10.5,
      stockQuantity: 100,
      categoryId: cat.id,
    })
    expect(p.id).toBeTruthy()
    expect(p.basePrice.toString()).toBe('10.5')
  })

  it('rejects negative price', async () => {
    const cat = await makeCategory()
    await expect(
      catalogService.createProduct({
        sku: 'SKU-X',
        slug: 'p-x',
        name: 'X',
        basePrice: -1,
        categoryId: cat.id,
      })
    ).rejects.toThrow()
  })

  it('lists products by category, active only by default', async () => {
    const cat = await makeCategory()
    await catalogService.createProduct({
      sku: 'A1',
      slug: 'a-1',
      name: 'A',
      basePrice: 1,
      categoryId: cat.id,
    })
    const inactive = await catalogService.createProduct({
      sku: 'B1',
      slug: 'b-1',
      name: 'B',
      basePrice: 1,
      categoryId: cat.id,
    })
    await catalogService.updateProduct({
      id: inactive.id,
      isActive: false,
    })

    const products = await catalogService.listProducts({ categoryId: cat.id })
    expect(products.map((p) => p.sku)).toEqual(['A1'])
  })

  it('finds product by slug includes category', async () => {
    const cat = await makeCategory()
    await catalogService.createProduct({
      sku: 'SKU-Z',
      slug: 'producto-z',
      name: 'Z',
      basePrice: 5,
      categoryId: cat.id,
    })
    const p = await catalogService.findProductBySlug('producto-z')
    expect(p?.category.slug).toBe('cat-1')
  })
})
```

- [ ] **Step 2: Verificar fallan**

Run: `pnpm test modules/catalog/service`
Expected: FAIL.

- [ ] **Step 3: Implementar service**

```typescript
import { Decimal } from '@prisma/client/runtime/library'
import { catalogRepository } from './repository'
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  type CreateCategoryInput,
  type CreateProductInput,
} from './schemas'
import type { z } from 'zod'

export const catalogService = {
  async createCategory(input: CreateCategoryInput) {
    const data = createCategorySchema.parse(input)
    return catalogRepository.createCategory(data)
  },

  async updateCategory(input: z.infer<typeof updateCategorySchema>) {
    const { id, ...data } = updateCategorySchema.parse(input)
    return catalogRepository.updateCategory(id, data)
  },

  async listCategories(activeOnly = true) {
    return catalogRepository.listCategories(activeOnly)
  },

  async findCategoryBySlug(slug: string) {
    return catalogRepository.findCategoryBySlug(slug)
  },

  async createProduct(input: CreateProductInput) {
    const data = createProductSchema.parse(input)
    return catalogRepository.createProduct({
      ...data,
      basePrice: new Decimal(data.basePrice),
      category: { connect: { id: data.categoryId } },
      categoryId: undefined as unknown as string,
    } as never)
  },

  async updateProduct(input: z.infer<typeof updateProductSchema>) {
    const { id, basePrice, categoryId, ...rest } = updateProductSchema.parse(input)
    return catalogRepository.updateProduct(id, {
      ...rest,
      ...(basePrice !== undefined ? { basePrice: new Decimal(basePrice) } : {}),
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    })
  },

  async listProducts(opts: {
    categoryId?: string
    activeOnly?: boolean
    take?: number
    skip?: number
  }) {
    return catalogRepository.listProducts(opts)
  },

  async findProductBySlug(slug: string) {
    return catalogRepository.findProductBySlug(slug)
  },
}
```

- [ ] **Step 4: index.ts**

```typescript
export { catalogService } from './service'
export {
  createCategorySchema,
  createProductSchema,
  updateCategorySchema,
  updateProductSchema,
} from './schemas'
```

- [ ] **Step 5: Tests pasan**

Run: `pnpm test modules/catalog/service`
Expected: PASS 7 tests.

- [ ] **Step 6: Commit**

```bash
git add modules/catalog/
git commit -m "feat(catalog): service for categories and products with TDD"
```

---

## Parte 5 — Extensión customers (OrganizationAddress)

### Task 10: OrganizationAddress CRUD

**Files:**
- Modify: `modules/customers/schemas.ts`
- Modify: `modules/customers/repository.ts`
- Modify: `modules/customers/service.ts`
- Modify: `modules/customers/service.test.ts`
- Modify: `modules/customers/index.ts`

- [ ] **Step 1: Agregar schema**

En `modules/customers/schemas.ts` agregar:

```typescript
export const createAddressSchema = z.object({
  organizationId: z.string().cuid(),
  label: z.string().min(1).max(80),
  recipient: z.string().min(1).max(200),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().max(30).optional().nullable(),
  isDefaultBilling: z.boolean().default(false),
  isDefaultShipping: z.boolean().default(false),
})

export type CreateAddressInput = z.infer<typeof createAddressSchema>
```

- [ ] **Step 2: Tests primero**

En `modules/customers/service.test.ts` agregar:

```typescript
describe('customersService.addresses', () => {
  it('creates address', async () => {
    const user = await prisma.user.create({ data: { email: 'a@b.com' } })
    const org = await customersService.createOrganization({
      name: 'O', slug: 'o', ownerUserId: user.id,
    })
    const addr = await customersService.createAddress({
      organizationId: org.id,
      label: 'Bodega',
      recipient: 'Acme Receiving',
      line1: '123 Main',
      city: 'Miami',
      postalCode: '33101',
      country: 'US',
      isDefaultBilling: true,
      isDefaultShipping: true,
    })
    expect(addr.id).toBeTruthy()
  })

  it('lists addresses for org', async () => {
    const user = await prisma.user.create({ data: { email: 'b@c.com' } })
    const org = await customersService.createOrganization({
      name: 'O', slug: 'o', ownerUserId: user.id,
    })
    await customersService.createAddress({
      organizationId: org.id,
      label: 'A',
      recipient: 'X',
      line1: 'L',
      city: 'C',
      postalCode: 'P',
      country: 'US',
    })
    const list = await customersService.listAddresses(org.id)
    expect(list).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Repository methods**

En `modules/customers/repository.ts`:

```typescript
async createAddress(data: Prisma.OrganizationAddressUncheckedCreateInput) {
  return prisma.organizationAddress.create({ data })
},
async listAddresses(orgId: string) {
  return prisma.organizationAddress.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
  })
},
async findDefaultBilling(orgId: string) {
  return prisma.organizationAddress.findFirst({
    where: { organizationId: orgId, isDefaultBilling: true },
  })
},
async findDefaultShipping(orgId: string) {
  return prisma.organizationAddress.findFirst({
    where: { organizationId: orgId, isDefaultShipping: true },
  })
},
```

- [ ] **Step 4: Service methods**

En `modules/customers/service.ts`:

```typescript
async createAddress(input: CreateAddressInput) {
  const parsed = createAddressSchema.parse(input)
  return customersRepository.createAddress(parsed)
},
async listAddresses(orgId: string) {
  return customersRepository.listAddresses(orgId)
},
```

- [ ] **Step 5: Update index.ts**

Exportar `createAddressSchema` y `CreateAddressInput`.

- [ ] **Step 6: Tests pasan**

Run: `pnpm test modules/customers`
Expected: PASS (los nuevos + los existentes).

- [ ] **Step 7: Commit**

```bash
git add modules/customers/
git commit -m "feat(customers): OrganizationAddress CRUD"
```

---

## Parte 6 — Módulo cart (TDD)

### Task 11: Cart get/addItem con snapshot

**Files:**
- Create: `modules/cart/schemas.ts`
- Create: `modules/cart/repository.ts`
- Create: `modules/cart/service.ts`
- Create: `modules/cart/service.test.ts`
- Create: `modules/cart/index.ts`

- [ ] **Step 1: Schemas**

```typescript
import { z } from 'zod'

export const addCartItemSchema = z.object({
  userId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number().int().positive(),
  orgId: z.string().cuid(),
})

export const updateQuantitySchema = z.object({
  userId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number().int().min(0),
})

export type AddCartItemInput = z.infer<typeof addCartItemSchema>
```

- [ ] **Step 2: Repository**

```typescript
import { prisma } from '@/lib/db/client'
import type { Decimal } from '@prisma/client/runtime/library'

export const cartRepository = {
  async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    })
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } },
      })
    }
    return cart
  },

  async upsertItem(cartId: string, productId: string, quantity: number, unitPriceSnapshot: Decimal) {
    return prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: { cartId, productId, quantity, unitPriceSnapshot },
      update: { quantity, unitPriceSnapshot },
    })
  },

  async updateQuantity(cartId: string, productId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { cartId_productId: { cartId, productId } },
      data: { quantity },
    })
  },

  async removeItem(cartId: string, productId: string) {
    return prisma.cartItem.delete({
      where: { cartId_productId: { cartId, productId } },
    })
  },

  async clearCart(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cartId } })
  },
}
```

- [ ] **Step 3: Tests primero**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db/client'
import { cartService } from './service'
import { customersService } from '@/modules/customers'
import { catalogService } from '@/modules/catalog'

async function seed() {
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.customerPrice.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({ data: { email: 'u@test.com' } })
  const org = await customersService.createOrganization({
    name: 'Org', slug: 'org', ownerUserId: user.id,
  })
  const cat = await catalogService.createCategory({ slug: 'c', name: 'C' })
  const product = await catalogService.createProduct({
    sku: 'S1', slug: 'p-1', name: 'P1', basePrice: 10, stockQuantity: 100, categoryId: cat.id,
  })
  return { user, org, product }
}

describe('cartService.addItem', () => {
  beforeEach(async () => await seed())

  it('creates cart on first add and snapshots price', async () => {
    const { user, org, product } = await seed()
    const cart = await cartService.addItem({
      userId: user.id, productId: product.id, quantity: 2, orgId: org.id,
    })
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]?.unitPriceSnapshot.toString()).toBe('10')
    expect(cart.items[0]?.quantity).toBe(2)
  })

  it('snapshots customer price when override exists', async () => {
    const { user, org, product } = await seed()
    await prisma.customerPrice.create({
      data: { organizationId: org.id, productId: product.id, price: new Decimal('7.50') },
    })
    const cart = await cartService.addItem({
      userId: user.id, productId: product.id, quantity: 1, orgId: org.id,
    })
    expect(cart.items[0]?.unitPriceSnapshot.toString()).toBe('7.5')
  })

  it('upserts if item already in cart', async () => {
    const { user, org, product } = await seed()
    await cartService.addItem({ userId: user.id, productId: product.id, quantity: 1, orgId: org.id })
    const cart = await cartService.addItem({
      userId: user.id, productId: product.id, quantity: 3, orgId: org.id,
    })
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]?.quantity).toBe(3)
  })
})
```

- [ ] **Step 4: Verificar fallan**

Run: `pnpm test modules/cart`
Expected: FAIL.

- [ ] **Step 5: Service implementation**

```typescript
import { cartRepository } from './repository'
import { pricingService } from '@/modules/pricing'
import { addCartItemSchema, updateQuantitySchema, type AddCartItemInput } from './schemas'

export const cartService = {
  async get(userId: string) {
    return cartRepository.getOrCreateCart(userId)
  },

  async addItem(input: AddCartItemInput) {
    const { userId, productId, quantity, orgId } = addCartItemSchema.parse(input)
    const cart = await cartRepository.getOrCreateCart(userId)
    const unitPriceSnapshot = await pricingService.resolveForOrg(orgId, productId)
    await cartRepository.upsertItem(cart.id, productId, quantity, unitPriceSnapshot)
    return cartRepository.getOrCreateCart(userId)
  },

  async updateQuantity(input: { userId: string; productId: string; quantity: number }) {
    const { userId, productId, quantity } = updateQuantitySchema.parse(input)
    const cart = await cartRepository.getOrCreateCart(userId)
    if (quantity === 0) {
      await cartRepository.removeItem(cart.id, productId)
    } else {
      await cartRepository.updateQuantity(cart.id, productId, quantity)
    }
    return cartRepository.getOrCreateCart(userId)
  },

  async removeItem(userId: string, productId: string) {
    const cart = await cartRepository.getOrCreateCart(userId)
    await cartRepository.removeItem(cart.id, productId)
    return cartRepository.getOrCreateCart(userId)
  },

  async clear(userId: string) {
    const cart = await cartRepository.getOrCreateCart(userId)
    await cartRepository.clearCart(cart.id)
    return cartRepository.getOrCreateCart(userId)
  },
}
```

- [ ] **Step 6: index.ts**

```typescript
export { cartService } from './service'
export { cartRepository } from './repository'
export type { AddCartItemInput } from './schemas'
```

- [ ] **Step 7: Tests pasan**

Run: `pnpm test modules/cart`
Expected: PASS 3 tests.

- [ ] **Step 8: Commit**

```bash
git add modules/cart/
git commit -m "feat(cart): get, addItem with price snapshot, update, remove, clear"
```

---

## Parte 7 — Módulo orders (TDD)

### Task 12: orderNumber generator con sequence dedicada por año

**Files:**
- Create: `modules/orders/orderNumber.ts`
- Create: `modules/orders/orderNumber.test.ts`

- [ ] **Step 1: Test concurrent y secuencial**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/client'
import { generateOrderNumber } from './orderNumber'

beforeEach(async () => {
  // limpiar sequence del año actual si existe
  const year = new Date().getFullYear()
  await prisma.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS order_seq_${year}`)
})

describe('generateOrderNumber', () => {
  it('generates first number ORD-{year}-000001', async () => {
    const num = await generateOrderNumber()
    const year = new Date().getFullYear()
    expect(num).toBe(`ORD-${year}-000001`)
  })

  it('generates sequential numbers', async () => {
    const a = await generateOrderNumber()
    const b = await generateOrderNumber()
    const c = await generateOrderNumber()
    const year = new Date().getFullYear()
    expect(a).toBe(`ORD-${year}-000001`)
    expect(b).toBe(`ORD-${year}-000002`)
    expect(c).toBe(`ORD-${year}-000003`)
  })

  it('handles 50 concurrent calls without collision', async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => generateOrderNumber())
    )
    const unique = new Set(results)
    expect(unique.size).toBe(50)
  })
})
```

- [ ] **Step 2: Verificar fallan**

Run: `pnpm test modules/orders/orderNumber`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```typescript
import { prisma } from '@/lib/db/client'

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const seqName = `order_seq_${year}`

  // Crear secuencia lazy con advisory lock para evitar carrera al crearla.
  // El lock se libera al final de la transacción.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('${seqName}'))`)
    await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`)
  })

  const rows = await prisma.$queryRawUnsafe<Array<{ nextval: bigint }>>(
    `SELECT nextval('${seqName}') AS nextval`
  )
  const n = Number(rows[0]?.nextval ?? 0)
  const padded = n.toString().padStart(6, '0')
  return `ORD-${year}-${padded}`
}
```

- [ ] **Step 4: Tests pasan**

Run: `pnpm test modules/orders/orderNumber`
Expected: PASS 3 tests.

- [ ] **Step 5: Commit**

```bash
git add modules/orders/orderNumber.ts modules/orders/orderNumber.test.ts
git commit -m "feat(orders): orderNumber generator with Postgres sequence per year"
```

---

### Task 13: Orders service — create con snapshot, stock decrement atómico, cart clear

**Files:**
- Create: `modules/orders/schemas.ts`
- Create: `modules/orders/repository.ts`
- Create: `modules/orders/service.ts`
- Create: `modules/orders/service.test.ts`
- Create: `modules/orders/errors.ts`
- Create: `modules/orders/index.ts`

- [ ] **Step 1: Schemas**

```typescript
import { z } from 'zod'

export const placeOrderSchema = z.object({
  userId: z.string().cuid(),
  orgId: z.string().cuid(),
  billingAddressId: z.string().cuid(),
  shippingAddressId: z.string().cuid(),
  poNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>
```

- [ ] **Step 2: Custom errors**

```typescript
export class InsufficientStockError extends Error {
  constructor(
    public productId: string,
    public available: number,
    public requested: number
  ) {
    super(`Insufficient stock for product ${productId}: available ${available}, requested ${requested}`)
    this.name = 'InsufficientStockError'
  }
}

export class ProductInactiveError extends Error {
  constructor(public productId: string) {
    super(`Product ${productId} is no longer active`)
    this.name = 'ProductInactiveError'
  }
}

export class EmptyCartError extends Error {
  constructor() {
    super('Cart is empty')
    this.name = 'EmptyCartError'
  }
}
```

- [ ] **Step 3: Tests primero**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/client'
import { ordersService } from './service'
import { InsufficientStockError, ProductInactiveError, EmptyCartError } from './errors'
import { customersService } from '@/modules/customers'
import { catalogService } from '@/modules/catalog'
import { cartService } from '@/modules/cart'

async function seed() {
  await prisma.orderLine.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.organizationAddress.deleteMany()
  await prisma.customerPrice.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({ data: { email: 'buyer@test.com' } })
  const org = await customersService.createOrganization({
    name: 'Buyer Co', slug: 'buyer', ownerUserId: user.id,
  })
  const cat = await catalogService.createCategory({ slug: 'c', name: 'C' })
  const product = await catalogService.createProduct({
    sku: 'SKU-1', slug: 'p-1', name: 'P1', basePrice: 10, stockQuantity: 5, categoryId: cat.id,
  })
  const billing = await customersService.createAddress({
    organizationId: org.id, label: 'B', recipient: 'R', line1: 'L', city: 'C', postalCode: 'P', country: 'US',
    isDefaultBilling: true,
  })
  const shipping = await customersService.createAddress({
    organizationId: org.id, label: 'S', recipient: 'R', line1: 'L', city: 'C', postalCode: 'P', country: 'US',
    isDefaultShipping: true,
  })
  return { user, org, product, billing, shipping }
}

describe('ordersService.placeOrder', () => {
  beforeEach(async () => await seed())

  it('creates order with snapshot lines, decrements stock, clears cart', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({ userId: user.id, productId: product.id, quantity: 2, orgId: org.id })

    const order = await ordersService.placeOrder({
      userId: user.id,
      orgId: org.id,
      billingAddressId: billing.id,
      shippingAddressId: shipping.id,
      poNumber: 'PO-123',
      notes: 'Entregar AM',
    })

    expect(order.orderNumber).toMatch(/^ORD-\d{4}-000\d{3}$/)
    expect(order.status).toBe('PENDING_PAYMENT')
    expect(order.lines).toHaveLength(1)
    expect(order.lines[0]?.sku).toBe('SKU-1')
    expect(order.lines[0]?.unitPrice.toString()).toBe('10')
    expect(order.lines[0]?.quantity).toBe(2)
    expect(order.subtotal.toString()).toBe('20')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stockQuantity).toBe(3)

    const cart = await cartService.get(user.id)
    expect(cart.items).toHaveLength(0)
  })

  it('throws InsufficientStockError when stock too low', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({ userId: user.id, productId: product.id, quantity: 10, orgId: org.id })

    await expect(
      ordersService.placeOrder({
        userId: user.id, orgId: org.id,
        billingAddressId: billing.id, shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(InsufficientStockError)
  })

  it('throws ProductInactiveError when product is inactive', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({ userId: user.id, productId: product.id, quantity: 1, orgId: org.id })
    await catalogService.updateProduct({ id: product.id, isActive: false })

    await expect(
      ordersService.placeOrder({
        userId: user.id, orgId: org.id,
        billingAddressId: billing.id, shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(ProductInactiveError)
  })

  it('throws EmptyCartError when cart is empty', async () => {
    const { user, org, billing, shipping } = await seed()
    await expect(
      ordersService.placeOrder({
        userId: user.id, orgId: org.id,
        billingAddressId: billing.id, shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(EmptyCartError)
  })
})

describe('ordersService.cancel', () => {
  beforeEach(async () => await seed())

  it('restores stock and sets cancelledByUserId', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({ userId: user.id, productId: product.id, quantity: 3, orgId: org.id })
    const order = await ordersService.placeOrder({
      userId: user.id, orgId: org.id,
      billingAddressId: billing.id, shippingAddressId: shipping.id,
    })

    const stockBefore = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(stockBefore.stockQuantity).toBe(2)

    const cancelled = await ordersService.cancel({ orderId: order.id, byUserId: user.id })
    expect(cancelled.status).toBe('CANCELLED')
    expect(cancelled.cancelledByUserId).toBe(user.id)
    expect(cancelled.cancelledAt).toBeTruthy()

    const stockAfter = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(stockAfter.stockQuantity).toBe(5)
  })
})
```

- [ ] **Step 4: Verificar fallan**

Run: `pnpm test modules/orders/service`
Expected: FAIL.

- [ ] **Step 5: Implementar service**

```typescript
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db/client'
import { placeOrderSchema, type PlaceOrderInput } from './schemas'
import { generateOrderNumber } from './orderNumber'
import { EmptyCartError, InsufficientStockError, ProductInactiveError } from './errors'
import storeConfig from '@/store.config'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const ordersService = {
  async placeOrder(input: PlaceOrderInput) {
    const { userId, orgId, billingAddressId, shippingAddressId, poNumber, notes } =
      placeOrderSchema.parse(input)

    return prisma.$transaction(async (tx) => {
      // Get cart with items + products (lock products FOR UPDATE)
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
      })
      if (!cart || cart.items.length === 0) throw new EmptyCartError()

      const productIds = cart.items.map((i) => i.productId)
      const lockedProducts = await tx.$queryRaw<
        Array<{ id: string; stockQuantity: number; isActive: boolean; sku: string; name: string }>
      >`
        SELECT id, "stockQuantity", "isActive", sku, name
        FROM "Product"
        WHERE id IN (${productIds.length ? productIds : ['__none__']})
        FOR UPDATE
      `
      const productMap = new Map(lockedProducts.map((p) => [p.id, p]))

      // Validate stock + active for each item
      let subtotal = new Decimal(0)
      for (const item of cart.items) {
        const p = productMap.get(item.productId)
        if (!p) throw new Error(`Product not found: ${item.productId}`)
        if (!p.isActive) throw new ProductInactiveError(item.productId)
        if (p.stockQuantity < item.quantity) {
          throw new InsufficientStockError(item.productId, p.stockQuantity, item.quantity)
        }
        subtotal = subtotal.add(item.unitPriceSnapshot.mul(item.quantity))
      }

      // Decrement stock
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        })
      }

      const orderNumber = await generateOrderNumber()
      const order = await tx.order.create({
        data: {
          orderNumber,
          organizationId: orgId,
          placedByUserId: userId,
          status: 'PENDING_PAYMENT',
          poNumber: poNumber ?? null,
          notes: notes ?? null,
          billingAddressId,
          shippingAddressId,
          subtotal,
          total: subtotal,
          currency: storeConfig.currency.base,
          lines: {
            create: cart.items.map((item) => {
              const p = productMap.get(item.productId)!
              const lineTotal = item.unitPriceSnapshot.mul(item.quantity)
              return {
                productId: item.productId,
                sku: p.sku,
                name: p.name,
                unitPrice: item.unitPriceSnapshot,
                quantity: item.quantity,
                lineTotal,
              }
            }),
          },
        },
        include: { lines: true },
      })

      // Clear cart items (cart parent remains)
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

      return order
    })
  },

  async cancel(input: { orderId: string; byUserId: string }) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { lines: true },
      })
      if (!order) throw new Error('Order not found')
      if (!VALID_TRANSITIONS[order.status]?.includes('CANCELLED')) {
        throw new Error(`Cannot cancel order in status ${order.status}`)
      }

      // Restore stock
      for (const line of order.lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stockQuantity: { increment: line.quantity } },
        })
      }

      return tx.order.update({
        where: { id: input.orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledByUserId: input.byUserId,
        },
      })
    })
  },

  async transitionStatus(input: { orderId: string; newStatus: 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' }) {
    const order = await prisma.order.findUnique({ where: { id: input.orderId } })
    if (!order) throw new Error('Order not found')
    if (!VALID_TRANSITIONS[order.status]?.includes(input.newStatus)) {
      throw new Error(`Invalid transition ${order.status} → ${input.newStatus}`)
    }
    const timestampField = ({
      CONFIRMED: 'confirmedAt',
      SHIPPED: 'shippedAt',
      DELIVERED: 'deliveredAt',
    } as const)[input.newStatus]
    return prisma.order.update({
      where: { id: input.orderId },
      data: { status: input.newStatus, [timestampField]: new Date() },
    })
  },

  async listForOrg(orgId: string) {
    return prisma.order.findMany({
      where: { organizationId: orgId },
      include: { lines: true },
      orderBy: { placedAt: 'desc' },
    })
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        lines: { include: { product: true } },
        billingAddress: true,
        shippingAddress: true,
        organization: true,
        placedBy: true,
      },
    })
  },
}
```

- [ ] **Step 6: index.ts**

```typescript
export { ordersService } from './service'
export { generateOrderNumber } from './orderNumber'
export { InsufficientStockError, ProductInactiveError, EmptyCartError } from './errors'
export type { PlaceOrderInput } from './schemas'
```

- [ ] **Step 7: Tests pasan**

Run: `pnpm test modules/orders`
Expected: PASS 5 tests.

- [ ] **Step 8: Commit**

```bash
git add modules/orders/
git commit -m "feat(orders): placeOrder with atomic stock decrement + cart clear, cancel with restore, status transitions"
```

---

## Parte 8 — Módulo checkout

### Task 14: Checkout review y confirm

**Files:**
- Create: `modules/checkout/schemas.ts`
- Create: `modules/checkout/service.ts`
- Create: `modules/checkout/service.test.ts`
- Create: `modules/checkout/index.ts`

- [ ] **Step 1: Schemas**

```typescript
import { z } from 'zod'

export const reviewCheckoutSchema = z.object({
  userId: z.string().cuid(),
  orgId: z.string().cuid(),
})

export const confirmCheckoutSchema = z.object({
  userId: z.string().cuid(),
  orgId: z.string().cuid(),
  billingAddressId: z.string().cuid(),
  shippingAddressId: z.string().cuid(),
  poNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type ReviewCheckoutInput = z.infer<typeof reviewCheckoutSchema>
export type ConfirmCheckoutInput = z.infer<typeof confirmCheckoutSchema>
```

- [ ] **Step 2: Service test + impl**

```typescript
import { reviewCheckoutSchema, confirmCheckoutSchema, type ReviewCheckoutInput, type ConfirmCheckoutInput } from './schemas'
import { cartService } from '@/modules/cart'
import { pricingService } from '@/modules/pricing'
import { ordersService } from '@/modules/orders'
import { ProductInactiveError, InsufficientStockError } from '@/modules/orders'

export const checkoutService = {
  async review(input: ReviewCheckoutInput) {
    const { userId, orgId } = reviewCheckoutSchema.parse(input)
    const cart = await cartService.get(userId)
    if (cart.items.length === 0) return { items: [], subtotal: 0, issues: ['empty'] }

    const issues: string[] = []
    const reviewedItems = []
    for (const item of cart.items) {
      const issue: string[] = []
      if (!item.product.isActive) issue.push('inactive')
      if (item.product.stockQuantity < item.quantity) issue.push('insufficient-stock')
      const currentPrice = await pricingService.resolveForOrg(orgId, item.product.id)
      if (!currentPrice.equals(item.unitPriceSnapshot)) issue.push('price-changed')
      reviewedItems.push({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        snapshotPrice: item.unitPriceSnapshot.toString(),
        currentPrice: currentPrice.toString(),
        availableStock: item.product.stockQuantity,
        issues: issue,
      })
      if (issue.length > 0) issues.push(...issue)
    }
    return { items: reviewedItems, issues: Array.from(new Set(issues)) }
  },

  async confirm(input: ConfirmCheckoutInput) {
    const parsed = confirmCheckoutSchema.parse(input)
    // Delegate to ordersService.placeOrder which does atomic stock + cart clear
    return ordersService.placeOrder({
      userId: parsed.userId,
      orgId: parsed.orgId,
      billingAddressId: parsed.billingAddressId,
      shippingAddressId: parsed.shippingAddressId,
      poNumber: parsed.poNumber,
      notes: parsed.notes,
    })
  },
}
```

- [ ] **Step 3: Tests**

Crear `modules/checkout/service.test.ts` con tests para:
- `review` reporta items con sus issues (active, stock, price-changed).
- `confirm` happy path crea orden y vacía carrito (delega a ordersService — el test grueso vive en orders).
- `confirm` propaga InsufficientStockError, ProductInactiveError, EmptyCartError.

(Estructura similar a tests previos; usar el patrón seed() del módulo orders.)

- [ ] **Step 4: index.ts**

```typescript
export { checkoutService } from './service'
export type { ReviewCheckoutInput, ConfirmCheckoutInput } from './schemas'
```

- [ ] **Step 5: Tests pasan**

Run: `pnpm test modules/checkout`

- [ ] **Step 6: Commit**

```bash
git add modules/checkout/
git commit -m "feat(checkout): review and confirm delegating to ordersService.placeOrder"
```

---

## Parte 9 — Auth / Session / Impersonation

### Task 15: Session middleware actualiza lastSeenAt y auto-expira impersonation

**Files:**
- Create: `lib/auth/middleware.ts`
- Modify: `middleware.ts` (root)
- Modify: `lib/auth/config.ts`

- [ ] **Step 1: lib/auth/middleware.ts**

```typescript
import type { NextRequest } from 'next/server'
import { auth } from './config'
import { prisma } from '@/lib/db/client'

const IMPERSONATION_TIMEOUT_MS = 30 * 60 * 1000

export async function maintainSession(req: NextRequest) {
  const session = await auth()
  if (!session) return

  // Update lastSeenAt
  const sessionToken = req.cookies.get('authjs.session-token')?.value
    ?? req.cookies.get('__Secure-authjs.session-token')?.value
  if (!sessionToken) return

  const now = new Date()
  const sess = await prisma.session.findUnique({
    where: { sessionToken },
    select: { id: true, impersonatingOrgId: true, lastSeenAt: true },
  })
  if (!sess) return

  // Auto-expire impersonation after 30 min idle
  if (sess.impersonatingOrgId && now.getTime() - sess.lastSeenAt.getTime() > IMPERSONATION_TIMEOUT_MS) {
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sess.id },
        data: { impersonatingOrgId: null, lastSeenAt: now },
      }),
      prisma.impersonationLog.create({
        data: {
          adminUserId: session.user.id,
          targetOrgId: sess.impersonatingOrgId,
          action: 'STOP',
          reason: 'auto-expired',
        },
      }),
    ])
  } else {
    await prisma.session.update({
      where: { id: sess.id },
      data: { lastSeenAt: now },
    })
  }
}
```

- [ ] **Step 2: Integrar en `middleware.ts` root**

```typescript
import { auth } from '@/lib/auth'
import { maintainSession } from '@/lib/auth/middleware'
import { NextResponse } from 'next/server'

export default auth(async (req) => {
  await maintainSession(req)

  const isAdmin = req.nextUrl.pathname.startsWith('/admin')
  if (isAdmin && !req.auth) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
})

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/cart', '/checkout/:path*', '/catalog/:path*'],
}
```

- [ ] **Step 3: Auth.js session callback expone nuevos campos**

En `lib/auth/config.ts` modificar callbacks:

```typescript
callbacks: {
  async session({ session, user }) {
    if (session.user) {
      session.user.id = user.id
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isPlatformAdmin: true },
      })
      session.user.isPlatformAdmin = dbUser?.isPlatformAdmin ?? false

      const sessionToken = (session as unknown as { sessionToken?: string }).sessionToken
      if (sessionToken) {
        const sess = await prisma.session.findUnique({
          where: { sessionToken },
          select: { activeOrgId: true, impersonatingOrgId: true },
        })
        session.activeOrgId = sess?.activeOrgId ?? null
        session.impersonatingOrgId = sess?.impersonatingOrgId ?? null
      } else {
        session.activeOrgId = null
        session.impersonatingOrgId = null
      }
    }
    return session
  },
},
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth/ middleware.ts
git commit -m "feat(auth): session middleware updates lastSeenAt and auto-expires impersonation"
```

---

### Task 16: account.switchActiveOrg y admin.impersonationStart/Stop

**Files:**
- Create: `lib/auth/actions.ts`

- [ ] **Step 1: Server actions**

```typescript
'use server'

import { prisma } from '@/lib/db/client'
import { auth } from './config'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

async function getSessionToken(): Promise<string | null> {
  const c = await cookies()
  return c.get('authjs.session-token')?.value ?? c.get('__Secure-authjs.session-token')?.value ?? null
}

export async function switchActiveOrg(orgId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Not authenticated')

  // Verify membership
  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  })
  if (!member) throw new Error('Not a member of this organization')

  const token = await getSessionToken()
  if (!token) throw new Error('No session token')

  // Clear cart items because price snapshots may not apply to new org
  const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } })
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }

  await prisma.session.update({
    where: { sessionToken: token },
    data: { activeOrgId: orgId },
  })

  revalidatePath('/', 'layout')
}

export async function impersonationStart(targetOrgId: string, reason?: string) {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) {
    throw new Error('Only platform admins can impersonate')
  }

  const token = await getSessionToken()
  if (!token) throw new Error('No session token')

  await prisma.$transaction([
    prisma.session.update({
      where: { sessionToken: token },
      data: { impersonatingOrgId: targetOrgId, lastSeenAt: new Date() },
    }),
    prisma.impersonationLog.create({
      data: {
        adminUserId: session.user.id,
        targetOrgId,
        action: 'START',
        reason: reason ?? null,
      },
    }),
  ])

  revalidatePath('/', 'layout')
}

export async function impersonationStop() {
  const session = await auth()
  if (!session?.user) throw new Error('Not authenticated')

  const token = await getSessionToken()
  if (!token) throw new Error('No session token')

  const sess = await prisma.session.findUnique({ where: { sessionToken: token } })
  if (!sess?.impersonatingOrgId) return

  await prisma.$transaction([
    prisma.session.update({
      where: { sessionToken: token },
      data: { impersonatingOrgId: null },
    }),
    prisma.impersonationLog.create({
      data: {
        adminUserId: session.user.id,
        targetOrgId: sess.impersonatingOrgId,
        action: 'STOP',
      },
    }),
  ])

  revalidatePath('/', 'layout')
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/actions.ts
git commit -m "feat(auth): server actions for switchActiveOrg and impersonation start/stop"
```

---

## Parte 10 — tRPC routers

### Task 17: Setup root router + integrar todos los módulos

**Files:**
- Modify: `lib/trpc/router.ts`
- Create: `lib/trpc/routers/catalog.ts`
- Create: `lib/trpc/routers/pricing.ts`
- Create: `lib/trpc/routers/cart.ts`
- Create: `lib/trpc/routers/orders.ts`
- Create: `lib/trpc/routers/customers.ts`
- Create: `lib/trpc/routers/admin.ts`
- Create: `lib/trpc/routers/account.ts`

- [ ] **Step 1: Procedure helpers**

En `lib/trpc/server.ts` (o crear si no hay), asegurar que existen:

```typescript
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session.user.isPlatformAdmin) throw new TRPCError({ code: 'FORBIDDEN' })
  return next()
})
```

- [ ] **Step 2: Catalog router**

```typescript
import { z } from 'zod'
import { publicProcedure, adminProcedure, router } from '../server'
import { catalogService, createCategorySchema, createProductSchema, updateCategorySchema, updateProductSchema } from '@/modules/catalog'

export const catalogRouter = router({
  listCategories: publicProcedure.query(() => catalogService.listCategories()),
  listProducts: publicProcedure
    .input(z.object({ categoryId: z.string().optional(), take: z.number().optional(), skip: z.number().optional() }))
    .query(({ input }) => catalogService.listProducts(input)),
  productBySlug: publicProcedure
    .input(z.string())
    .query(({ input }) => catalogService.findProductBySlug(input)),
  // admin
  createCategory: adminProcedure.input(createCategorySchema).mutation(({ input }) => catalogService.createCategory(input)),
  updateCategory: adminProcedure.input(updateCategorySchema).mutation(({ input }) => catalogService.updateCategory(input)),
  createProduct: adminProcedure.input(createProductSchema).mutation(({ input }) => catalogService.createProduct(input)),
  updateProduct: adminProcedure.input(updateProductSchema).mutation(({ input }) => catalogService.updateProduct(input)),
})
```

- [ ] **Step 3: Pricing, cart, orders, customers routers**

Análogo (cada router expone los métodos del service correspondiente, con procedure adecuado: pricing es `protectedProcedure` que toma `orgId` del session.activeOrgId o impersonatingOrgId; cart es `protectedProcedure` con userId del session; orders idem; customers admin para customer prices).

- [ ] **Step 4: Admin router (impersonation)**

```typescript
import { z } from 'zod'
import { adminProcedure, router } from '../server'
import { impersonationStart, impersonationStop } from '@/lib/auth/actions'

export const adminRouter = router({
  impersonationStart: adminProcedure
    .input(z.object({ orgId: z.string().cuid(), reason: z.string().optional() }))
    .mutation(async ({ input }) => { await impersonationStart(input.orgId, input.reason); return { ok: true } }),
  impersonationStop: adminProcedure.mutation(async () => { await impersonationStop(); return { ok: true } }),
})
```

- [ ] **Step 5: Root router**

```typescript
export const appRouter = router({
  catalog: catalogRouter,
  pricing: pricingRouter,
  cart: cartRouter,
  orders: ordersRouter,
  customers: customersRouter,
  admin: adminRouter,
  account: accountRouter,
})
export type AppRouter = typeof appRouter
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/trpc/
git commit -m "feat(trpc): routers for catalog, pricing, cart, orders, customers, admin, account"
```

---

## Parte 11 — shadcn/ui

### Task 18: Instalar componentes shadcn necesarios

**Files:**
- Modify: `components/ui/` (componentes shadcn)

- [ ] **Step 1: Install shadcn components**

Run:
```bash
pnpm dlx shadcn@latest add button input label card form dialog dropdown-menu select textarea table badge separator alert toast
```

- [ ] **Step 2: Verificar imports funcionan**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ui/ package.json pnpm-lock.yaml
git commit -m "chore(ui): add shadcn components for commerce UI"
```

---

## Parte 12 — Storefront pages

### Task 19: Componentes commerce (ProductCard, PriceTag, etc.)

**Files:**
- Create: `components/commerce/PriceTag.tsx`
- Create: `components/commerce/ProductCard.tsx`
- Create: `components/commerce/ProductListItem.tsx`
- Create: `components/commerce/QuantityInput.tsx`
- Create: `components/commerce/AddToCartButton.tsx`
- Create: `components/commerce/CatalogToggle.tsx`
- Create: `components/commerce/CartLineItem.tsx`
- Create: `components/commerce/CheckoutStepper.tsx`
- Create: `components/commerce/OrderStatusBadge.tsx`
- Create: `components/commerce/ImpersonationBanner.tsx`

- [ ] **Step 1: PriceTag**

```typescript
import { formatMoney } from '@/lib/money'
import type { Decimal } from '@prisma/client/runtime/library'

type Props = {
  basePrice: Decimal
  customerPrice?: Decimal | null
  currency: string
}

export function PriceTag({ basePrice, customerPrice, currency }: Props) {
  const hasOverride = customerPrice && !customerPrice.equals(basePrice)
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-medium">
        {formatMoney(hasOverride ? customerPrice : basePrice, currency)}
      </span>
      {hasOverride && (
        <>
          <span className="text-xs text-gray-400 line-through">{formatMoney(basePrice, currency)}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-800">
            TU PRECIO
          </span>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: ProductCard**

```typescript
import Image from 'next/image'
import Link from 'next/link'
import { PriceTag } from './PriceTag'
import { QuantityInput } from './QuantityInput'
import { AddToCartButton } from './AddToCartButton'
import type { Decimal } from '@prisma/client/runtime/library'

type Props = {
  product: {
    id: string
    slug: string
    sku: string
    name: string
    basePrice: Decimal
    stockQuantity: number
    imageUrl: string | null
    category: { name: string }
  }
  customerPrice: Decimal | null
  currency: string
}

export function ProductCard({ product, customerPrice, currency }: Props) {
  return (
    <article className="bg-white border rounded-lg p-3 flex flex-col gap-2">
      <Link href={`/products/${product.slug}`} className="block aspect-[6/5] bg-gray-100 rounded">
        {product.imageUrl && (
          <Image src={product.imageUrl} alt={product.name} width={300} height={250} className="w-full h-full object-cover rounded" />
        )}
      </Link>
      <Link href={`/products/${product.slug}`} className="text-sm font-medium hover:underline">
        {product.name}
      </Link>
      <p className="text-xs text-gray-500">{product.sku} · {product.category.name}</p>
      <PriceTag basePrice={product.basePrice} customerPrice={customerPrice} currency={currency} />
      <p className={`text-xs ${product.stockQuantity < 20 ? 'text-amber-600' : 'text-gray-600'}`}>
        {product.stockQuantity > 0 ? `En stock · ${product.stockQuantity}u` : 'Agotado'}
      </p>
      <div className="flex gap-1 mt-1">
        <QuantityInput productId={product.id} max={product.stockQuantity} />
        <AddToCartButton productId={product.id} disabled={product.stockQuantity === 0} />
      </div>
    </article>
  )
}
```

- [ ] **Step 3: QuantityInput, AddToCartButton, CatalogToggle, CheckoutStepper, OrderStatusBadge, ImpersonationBanner**

Implementar cada uno siguiendo patrones similares. Cada uno como Client Component si tiene estado o handlers. `ImpersonationBanner` lee `session.impersonatingOrgId` y muestra una barra amarilla persistente con botón "Salir" que invoca `trpc.admin.impersonationStop`.

- [ ] **Step 4: Commit**

```bash
git add components/commerce/
git commit -m "feat(ui): commerce components (cards, price tag, qty input, toggle, banner)"
```

---

### Task 20: /catalog page con toggle

**Files:**
- Create: `app/(storefront)/catalog/page.tsx`
- Create: `app/(storefront)/catalog/[category]/page.tsx`

- [ ] **Step 1: /catalog/page.tsx**

```typescript
import { catalogService } from '@/modules/catalog'
import { pricingService } from '@/modules/pricing'
import { auth } from '@/lib/auth'
import { ProductCard } from '@/components/commerce/ProductCard'
import { ProductListItem } from '@/components/commerce/ProductListItem'
import { CatalogToggle } from '@/components/commerce/CatalogToggle'
import storeConfig from '@/store.config'
import { prisma } from '@/lib/db/client'

export default async function CatalogPage() {
  const session = await auth()
  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null

  const [categories, products] = await Promise.all([
    catalogService.listCategories(),
    catalogService.listProducts({ activeOnly: true }),
  ])

  const priceMap = orgId
    ? await pricingService.batchResolveForOrg(orgId, products.map((p) => p.id))
    : null

  const user = session?.user
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { preferredCatalogView: true } })
    : null
  const view = user?.preferredCatalogView ?? 'CARDS'

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium">Catálogo</h1>
        <CatalogToggle initialView={view} />
      </div>

      <nav className="flex gap-2 flex-wrap mb-6">
        <a href="/catalog" className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">Todos</a>
        {categories.map((c) => (
          <a key={c.id} href={`/catalog/${c.slug}`} className="px-3 py-1 rounded-full text-sm border bg-white">
            {c.name}
          </a>
        ))}
      </nav>

      {view === 'CARDS' ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} customerPrice={priceMap?.get(p.id) ?? null} currency={storeConfig.currency.base} />
          ))}
        </section>
      ) : (
        <section className="border rounded-lg overflow-hidden">
          {products.map((p) => (
            <ProductListItem key={p.id} product={p} customerPrice={priceMap?.get(p.id) ?? null} currency={storeConfig.currency.base} />
          ))}
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 2: /catalog/[category]/page.tsx**

Análogo a `/catalog`, filtrando por `categoryId` resuelto del slug.

- [ ] **Step 3: Commit**

```bash
git add app/\(storefront\)/catalog/
git commit -m "feat(storefront): catalog page with cards/list toggle and category filter"
```

---

### Task 21: /products/[slug], /cart, /checkout, /account/orders

Cada uno como tarea/commit separado. Por brevedad, esbozo lo mínimo:

**Files Tasks 21a-21d:**
- `app/(storefront)/products/[slug]/page.tsx` — ficha completa
- `app/(storefront)/cart/page.tsx` — tabla con qty editable, subtotal, "Checkout"
- `app/(storefront)/checkout/page.tsx` — wizard 4 steps (server actions)
- `app/(account)/orders/page.tsx` y `app/(account)/orders/[id]/page.tsx`

Patrón común: Server Component carga data via service modules; Client Component para interactivos (qty, forms); server actions para mutaciones.

Cada uno: implementar → manual test en `pnpm dev` → commit.

```bash
git commit -m "feat(storefront): product detail page"
git commit -m "feat(storefront): cart page"
git commit -m "feat(storefront): checkout wizard 4 steps"
git commit -m "feat(account): orders list and detail"
```

---

## Parte 13 — Admin pages

### Task 22-26: Admin CRUD productos, categorías, órdenes, customers, prices

Cada uno como task. Para cada admin page:
- Server Component que llama `catalogService` / `ordersService` / `customersService`.
- Forms con server actions.
- shadcn Table + Dialog para CRUD.

Para `/admin/customers/[id]`: botón "Ver storefront como esta org" invoca `trpc.admin.impersonationStart`. Antes muestra dialog confirmando.

Commits separados:
```bash
git commit -m "feat(admin): products CRUD"
git commit -m "feat(admin): categories CRUD with sortOrder"
git commit -m "feat(admin): orders management with status transitions"
git commit -m "feat(admin): customers listing and detail"
git commit -m "feat(admin): customer prices bulk editor + impersonation entry point"
```

---

## Parte 14 — E2E tests

### Task 27: E2E happy path + pricing override + snapshot

**Files:**
- Create: `tests/e2e/commerce-happy-path.spec.ts`

- [ ] **Step 1: Test happy path**

```typescript
import { test, expect } from '@playwright/test'

test('user can browse, add to cart, checkout, see order', async ({ page, request }) => {
  // Setup via API helper (seed un user, org, product, address)
  // ... auth user via cookie injection
  await page.goto('/catalog')
  await expect(page.getByText('Acme Wholesale')).toBeVisible()
  await page.getByRole('button', { name: /agregar/i }).first().click()
  await page.goto('/cart')
  await expect(page.getByText(/subtotal/i)).toBeVisible()
  await page.getByRole('link', { name: /checkout/i }).click()
  // step through wizard...
  await page.getByRole('button', { name: /colocar orden/i }).click()
  await expect(page).toHaveURL(/\/account\/orders\/.+/)
  await expect(page.getByText(/ORD-\d{4}-\d{6}/)).toBeVisible()
})
```

- [ ] **Step 2: Tests adicionales pricing override, snapshot inmutable, cancel restore stock, impersonation, multi-org switch, inactive product, toggle persistence, order states**

Cada E2E sigue el patrón seed → interact → assert. Para asuntos de DB (cambiar isActive de un producto mid-test), usar `prisma` directo via helper.

- [ ] **Step 3: Run all E2E**

Run: `pnpm test:e2e`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/
git commit -m "test(e2e): commerce flows including pricing, snapshot, cancel, impersonation, multi-org"
```

---

## Parte 15 — Seed

### Task 28: prisma/seed.ts con demo data

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Seed completo**

```typescript
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  // Platform admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { isPlatformAdmin: true },
    create: { email: 'admin@example.com', name: 'Platform Admin', isPlatformAdmin: true, emailVerified: new Date() },
  })

  // Customer org with 2 members
  const buyer1 = await prisma.user.upsert({
    where: { email: 'buyer1@acme.com' },
    update: {},
    create: { email: 'buyer1@acme.com', name: 'Buyer One', emailVerified: new Date() },
  })
  const buyer2 = await prisma.user.upsert({
    where: { email: 'buyer2@acme.com' },
    update: {},
    create: { email: 'buyer2@acme.com', name: 'Buyer Two', emailVerified: new Date() },
  })

  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: { name: 'Acme Corp', slug: 'acme-corp' },
  })

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: buyer1.id } },
    update: {},
    create: { organizationId: org.id, userId: buyer1.id, role: 'OWNER' },
  })
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: buyer2.id } },
    update: {},
    create: { organizationId: org.id, userId: buyer2.id, role: 'BUYER' },
  })

  // Addresses
  await prisma.organizationAddress.upsert({
    where: { id: 'addr-billing-acme' },
    update: {},
    create: {
      id: 'addr-billing-acme', organizationId: org.id, label: 'Headquarters',
      recipient: 'Acme Corp', line1: '500 Wholesale Ave', city: 'Miami',
      state: 'FL', postalCode: '33101', country: 'US', isDefaultBilling: true,
    },
  })
  await prisma.organizationAddress.upsert({
    where: { id: 'addr-shipping-acme' },
    update: {},
    create: {
      id: 'addr-shipping-acme', organizationId: org.id, label: 'Warehouse',
      recipient: 'Acme Receiving', line1: '700 Dock Rd', city: 'Miami',
      state: 'FL', postalCode: '33102', country: 'US', isDefaultShipping: true,
    },
  })

  // Categories
  const catCosmetic = await prisma.category.upsert({
    where: { slug: 'cosmeticos' },
    update: {},
    create: { slug: 'cosmeticos', name: 'Cosméticos', sortOrder: 1 },
  })
  const catCleaning = await prisma.category.upsert({
    where: { slug: 'limpieza' },
    update: {},
    create: { slug: 'limpieza', name: 'Limpieza', sortOrder: 2 },
  })

  // Products
  const products = [
    { sku: 'COSM-001', slug: 'crema-hidratante-500ml', name: 'Crema Hidratante 500ml', basePrice: '22.00', stockQuantity: 120, categoryId: catCosmetic.id },
    { sku: 'COSM-002', slug: 'serum-vit-c', name: 'Sérum Vitamina C', basePrice: '35.00', stockQuantity: 60, categoryId: catCosmetic.id },
    { sku: 'COSM-003', slug: 'mascara-facial', name: 'Mascarilla Facial Premium', basePrice: '14.50', stockQuantity: 200, categoryId: catCosmetic.id },
    { sku: 'CLEAN-001', slug: 'detergente-pro-5l', name: 'Detergente Pro 5L', basePrice: '12.40', stockQuantity: 84, categoryId: catCleaning.id },
    { sku: 'CLEAN-002', slug: 'jabon-liquido-1l', name: 'Jabón Líquido 1L', basePrice: '7.50', stockQuantity: 65, categoryId: catCleaning.id },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, basePrice: new Decimal(p.basePrice) },
    })
  }

  // One custom price for Acme Corp
  const cosmetic1 = await prisma.product.findUniqueOrThrow({ where: { sku: 'COSM-001' } })
  await prisma.customerPrice.upsert({
    where: { organizationId_productId: { organizationId: org.id, productId: cosmetic1.id } },
    update: { price: new Decimal('18.90') },
    create: { organizationId: org.id, productId: cosmetic1.id, price: new Decimal('18.90'), notes: 'Negociado contrato 2026' },
  })

  console.log('✅ Seed completed: admin@example.com, buyer1@acme.com, buyer2@acme.com')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => prisma.$disconnect())
```

- [ ] **Step 2: Agregar script en package.json**

```json
"db:seed": "tsx prisma/seed.ts"
```

Y en `prisma`:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Correr seed**

Run:
```bash
pnpm exec prisma migrate reset --force
```

Expected: DB reset y seed corrido sin errores.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat(seed): demo catalog with admin, org, members, addresses, categories, products, custom price"
```

---

## Parte 16 — Documentación

### Task 29: ADRs 0004-0009

**Files:**
- Create: `docs/adr/0004-product-model-simple-skus.md`
- Create: `docs/adr/0005-customer-price-overrides.md`
- Create: `docs/adr/0006-impersonation-design.md`
- Create: `docs/adr/0007-trpc-and-server-actions-coexistence.md`
- Create: `docs/adr/0008-money-handling.md`
- Create: `docs/adr/0009-order-number-generation.md`

- [ ] **Step 1: Crear los 6 ADRs**

Cada ADR sigue formato: Status / Context / Decision / Consequences / Alternatives considered.

Para 0009 (orderNumber), mencionar explícitamente el caveat de replicación lógica de sequences en Postgres 16 y la decisión de crear sequence lazy en service.ts en vez de migración SQL manual.

- [ ] **Step 2: Commit**

```bash
git add docs/adr/
git commit -m "docs(adr): 0004-0009 product model, pricing, impersonation, tRPC, money, orderNumber"
```

---

### Task 30: Runbooks

**Files:**
- Create: `docs/runbooks/order-state-management.md`
- Create: `docs/runbooks/customer-pricing.md`
- Create: `docs/runbooks/impersonation.md`

- [ ] **Step 1: Crear runbooks**

Cada uno: pasos concretos para el admin del store.

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/
git commit -m "docs(runbooks): order states, customer pricing, impersonation"
```

---

### Task 31: README + ROADMAP updates

- [ ] **Step 1: Actualizar README con quick start del storefront y admin demo**

- [ ] **Step 2: Marcar Fase 1 in progress en ROADMAP.md**

- [ ] **Step 3: Commit**

```bash
git add README.md ROADMAP.md
git commit -m "docs: update README and ROADMAP for Phase 1"
```

---

## Parte 17 — Validación + cierre

### Task 32: Full validation pass

- [ ] **Step 1: Lint + typecheck + tests + build**

Run:
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build
```

Expected: todo verde.

- [ ] **Step 2: Grep Decimal(10, 2)**

Run:
```bash
grep -rn "Decimal(10" prisma/ modules/ lib/
```

Expected: 0 resultados.

- [ ] **Step 3: Manual acceptance checklist**

Recorrer los 25 criterios del spec sección 11 uno por uno en una sesión local (`pnpm dev` + seed) y marcar cada uno. Cualquiera que falle abre un follow-up.

- [ ] **Step 4: Verificar cobertura**

Run: `pnpm test:coverage`
Expected: `pricing` 100%, `cart` 90%, `checkout` 95%, `orders` 90%, `catalog` 85%.

- [ ] **Step 5: WCAG check**

Usar `design:accessibility-review` skill en cada página nueva. Documentar findings en `docs/runbooks/accessibility-audit-phase-1.md`.

---

### Task 33: Tag v1.0.0

- [ ] **Step 1: Update ROADMAP**

Marcar Fase 1 como cerrada en la tabla "Estado del proyecto".

- [ ] **Step 2: Commit doc updates**

```bash
git add ROADMAP.md docs/
git commit -m "docs(roadmap): close Phase 1"
```

- [ ] **Step 3: Tag + push**

```bash
git tag -a v1.0.0 -m "Phase 1: commerce core complete

- Catalog with simple SKUs and single-level categories
- Pricing with per-customer overrides
- Cart per user with price snapshots
- Checkout 4-step B2B (review, addresses, PO, confirm)
- Orders with snapshot lines, atomic stock decrement, sequence-based numbering
- Cancel orders restore stock atomically
- Admin CRUD for products, categories, customer prices
- Impersonation 'view as customer X' with audit log and 30-min expiry
- 11 E2E tests covering happy path + edge cases"
git push origin main
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0 — Phase 1: Commerce Core" --notes "First B2B commerce-ready release. See spec at docs/specs/2026-05-26-fase-1-commerce-core.md"
```

- [ ] **Step 4: Notificar en Cowork**

"Fase 1 cerrada, lista para revisión y brainstorming de Fase 2 (Especialización B2B: RFQ, crédito, aprobaciones)."

---

## Resumen

**33 tasks principales** organizadas en 17 partes. Cada task es uno o más commits con TDD obligatorio en módulos de negocio.

**Tiempo estimado:** 3-4 semanas full-time, 6-8 semanas part-time.

**Próximo paso:** invocar `superpowers:subagent-driven-development` o `superpowers:executing-plans`.
