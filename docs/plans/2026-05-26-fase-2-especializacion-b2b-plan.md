# Fase 2 — Especialización B2B · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar Fase 2 (v2.0.0): 6 features de especialización B2B (RFQ, crédito Net 30, catálogos privados, aprobaciones internas, descuentos por volumen, re-orden rápido) + sistema de notificaciones in-app/email, todas opt-in via `store.config.ts`.

**Architecture:** Approach C — Híbrido: 4 módulos nuevos (`quotes`, `accounts`, `approvals`, `notifications`) + extensiones a `catalog` y `pricing`. RSC + server actions como patrón principal (ADR 0007 de Fase 1). Closed modules con `index.ts` único punto de entrada. Feature flags consultados en cada server action / RSC. Workflows transaccionales con Prisma `$transaction` + `SELECT FOR UPDATE` para race conditions.

**Tech Stack:** Next.js 14 App Router · TypeScript estricto · Prisma 6 + PostgreSQL 16 · Auth.js v5 · Resend · Tailwind + shadcn/ui · Biome · Vitest (fileParallelism: false) · Playwright · Decimal(12,2) global · Pino + Sentry · Coolify scheduled services.

**Spec:** `docs/specs/2026-05-26-fase-2-especializacion-b2b.md`

**Branch:** `feature/fase-2-especializacion-b2b` (worktree desde `main` post-v1.0.0)

**Tag final:** `v2.0.0`

---

## Estructura de archivos a crear/modificar

### Schema y migrations
- Modify: `prisma/schema.prisma` — 8 modelos nuevos + 7 enums + extensiones a Organization, Product, Category, Order, CartItem
- Create: `prisma/migrations/YYYYMMDDHHMMSS_phase2_models/migration.sql` — auto-generada
- Create: `prisma/migrations/YYYYMMDDHHMMSS_phase2_extensions/migration.sql` — auto-generada
- Create: `prisma/migrations/YYYYMMDDHHMMSS_phase2_sql_custom/migration.sql` — manual (sequences + XOR check)
- Modify: `prisma/seed.ts` — agregar seed Fase 2

### Feature flags (extensión de Fase 0)
- Modify: `lib/store-config.ts` (o equivalente de Fase 0) — agregar tipo `Features`
- Modify: `store.config.ts` — agregar `features` con valores por defecto
- Create: `lib/features.ts` — helper `assertFeature(name)` + `isFeatureEnabled(name)`

### Módulo `notifications`
- Create: `modules/notifications/index.ts` — API pública (dispatch, listForUser, markAsRead, countUnread)
- Create: `modules/notifications/service.ts` — implementación de dispatch + retry
- Create: `modules/notifications/email/index.ts` — render + send via Resend
- Create: `modules/notifications/email/templates/quote-submitted.tsx`
- Create: `modules/notifications/email/templates/quote-quoted.tsx`
- Create: `modules/notifications/email/templates/quote-revised.tsx`
- Create: `modules/notifications/email/templates/approval-requested.tsx`
- Create: `modules/notifications/email/templates/approval-granted.tsx`
- Create: `modules/notifications/email/templates/approval-rejected.tsx`
- Create: `modules/notifications/email/templates/invoice-due-soon.tsx`
- Create: `modules/notifications/email/templates/invoice-overdue.tsx`
- Create: `modules/notifications/email/templates/invoice-paid.tsx`
- Create: `modules/notifications/email/templates/credit-warning.tsx`
- Create: `modules/notifications/email/templates/credit-blocked.tsx`
- Create: `modules/notifications/__tests__/dispatch.test.ts`
- Create: `modules/notifications/__tests__/retry.test.ts`
- Create: `scripts/retry-failed-notifications.ts`

### Módulo `approvals`
- Create: `modules/approvals/index.ts` — API pública (request, decide, canApprove, subscribe)
- Create: `modules/approvals/service.ts` — implementación
- Create: `modules/approvals/registry.ts` — subscriber pattern
- Create: `modules/approvals/__tests__/request.test.ts`
- Create: `modules/approvals/__tests__/decide.test.ts`
- Create: `modules/approvals/__tests__/idempotency.test.ts`

### Módulo `accounts`
- Create: `modules/accounts/index.ts` — API pública
- Create: `modules/accounts/credit.ts` — checkCreditEligibility + recalcCreditUsed
- Create: `modules/accounts/invoices.ts` — createInvoice, markPaid, markOverdue
- Create: `modules/accounts/numbers.ts` — generateInvoiceNumber (sequence)
- Create: `modules/accounts/__tests__/credit.test.ts`
- Create: `modules/accounts/__tests__/invoices.test.ts`
- Create: `modules/accounts/__tests__/scheduled.test.ts`
- Create: `scripts/mark-invoices-overdue.ts`
- Create: `scripts/send-invoice-due-soon.ts`

### Módulo `quotes`
- Create: `modules/quotes/index.ts` — API pública
- Create: `modules/quotes/service.ts` — submit, quote, revise, accept, reject
- Create: `modules/quotes/conversion.ts` — Quote → Order transaction
- Create: `modules/quotes/numbers.ts` — generateQuoteNumber (sequence)
- Create: `modules/quotes/expire.ts` — expirar quotes vencidas
- Create: `modules/quotes/__tests__/submit.test.ts`
- Create: `modules/quotes/__tests__/quote.test.ts`
- Create: `modules/quotes/__tests__/revise.test.ts`
- Create: `modules/quotes/__tests__/accept.test.ts`
- Create: `modules/quotes/__tests__/conversion.test.ts`
- Create: `modules/quotes/__tests__/expire.test.ts`
- Create: `scripts/mark-quotes-expired.ts`
- Create: `scripts/send-quote-expiring-soon.ts`
- Create: `scripts/cleanup-stale-quote-drafts.ts`

### Extensión `catalog`
- Modify: `modules/catalog/index.ts` — exportar `filterForOrg`, `grantAccess`, `revokeAccess`
- Create: `modules/catalog/visibility.ts` — filterForOrg + grant/revoke
- Modify: `modules/catalog/service.ts` — aplicar filter en queries de storefront
- Create: `modules/catalog/__tests__/visibility.test.ts`

### Extensión `pricing`
- Modify: `modules/pricing/index.ts` — actualizar firma de `resolveForOrg`
- Modify: `modules/pricing/service.ts` — agregar lookup de tiers
- Create: `modules/pricing/tiers.ts` — CRUD de ProductPriceTier
- Modify: `modules/pricing/__tests__/resolve.test.ts` — tests con tiers
- Create: `modules/pricing/__tests__/tiers.test.ts`

### Extensión `orders` (Fase 1)
- Modify: `modules/orders/service.ts` — agregar PENDING_APPROVAL handling + paymentMethod snapshot + creditUsed update
- Modify: `modules/orders/index.ts` — exportar `restoreStock` (para hook approval reject)

### Extensión `cart` (Fase 1)
- Modify: `modules/cart/service.ts` — re-snapshot al cambiar qty para volume tier; discountAmountSnapshot

### Storefront pages
- Create: `app/(storefront)/quotes/page.tsx` — inbox del buyer
- Create: `app/(storefront)/quotes/draft/page.tsx` — builder del DRAFT
- Create: `app/(storefront)/quotes/[id]/page.tsx` — view con accept/reject
- Create: `app/(storefront)/quotes/_actions.ts` — server actions
- Create: `app/(storefront)/quotes/_components/QuoteLines.tsx`
- Create: `app/(storefront)/invoices/page.tsx`
- Create: `app/(storefront)/invoices/[id]/page.tsx`
- Create: `app/(storefront)/approvals/page.tsx`
- Create: `app/(storefront)/approvals/[id]/page.tsx`
- Create: `app/(storefront)/approvals/_actions.ts`
- Create: `app/(storefront)/notifications/page.tsx`
- Create: `app/(storefront)/notifications/_actions.ts`
- Modify: `app/(storefront)/catalog/page.tsx` — botones RFQ + badges
- Modify: `app/(storefront)/products/[slug]/page.tsx` — tier table + private badge
- Modify: `app/(storefront)/cart/page.tsx` — discount visualization
- Modify: `app/(storefront)/checkout/_actions.ts` — credit check + approval routing
- Modify: `app/(storefront)/checkout/step-2/page.tsx` — Net 30 selector
- Modify: `app/(storefront)/checkout/step-4/page.tsx` — approval banner
- Modify: `app/(storefront)/orders/[id]/page.tsx` — re-order button + approval status
- Modify: `app/(storefront)/orders/[id]/_actions.ts` — re-order action
- Modify: `components/layout/Header.tsx` — bell badge
- Create: `components/layout/NotificationBadge.tsx`

### Admin pages
- Create: `app/admin/quotes/page.tsx`
- Create: `app/admin/quotes/[id]/page.tsx`
- Create: `app/admin/quotes/_actions.ts`
- Create: `app/admin/invoices/page.tsx`
- Create: `app/admin/invoices/[id]/page.tsx`
- Create: `app/admin/invoices/_actions.ts`
- Create: `app/admin/approvals/page.tsx`
- Create: `app/admin/customers/[id]/credit/page.tsx`
- Create: `app/admin/customers/[id]/credit/_actions.ts`
- Create: `app/admin/customers/[id]/approvals/page.tsx`
- Create: `app/admin/customers/[id]/approvals/_actions.ts`
- Create: `app/admin/customers/[id]/catalog-access/page.tsx`
- Create: `app/admin/customers/[id]/catalog-access/_actions.ts`
- Modify: `app/admin/customers/[id]/layout.tsx` — sidebar con nuevos tabs
- Modify: `app/admin/products/[id]/page.tsx` — tabs Visibilidad + Volumen
- Modify: `app/admin/products/[id]/_actions.ts` — toggle isPrivate + CRUD tiers
- Modify: `app/admin/categories/page.tsx` — toggle isPrivate
- Modify: `app/admin/page.tsx` (dashboard) — widgets nuevos

### Lib y utilidades
- Modify: `lib/errors.ts` — agregar error classes nuevas
- Modify: `lib/auth/middleware.ts` — verificar `canApprove` para rutas /approvals/*

### ADRs
- Create: `docs/adr/0010-rfq-hybrid-workflow.md`
- Create: `docs/adr/0011-approval-engine-genericity.md`
- Create: `docs/adr/0012-credit-net30-model.md`
- Create: `docs/adr/0013-volume-pricing-via-discount-amount.md`
- Create: `docs/adr/0014-notifications-dispatcher.md`

### Runbooks
- Create: `docs/runbooks/quotes.md`
- Create: `docs/runbooks/credit-net30.md`
- Create: `docs/runbooks/approvals.md`
- Create: `docs/runbooks/notifications.md`
- Create: `docs/runbooks/phase-2-rollback.md`

### Misc
- Modify: `CLAUDE.md` — actualizar estado al cerrar fase
- Modify: `ROADMAP.md` — marcar Fase 2 cerrada
- Modify: `CHANGELOG.md` — entry v2.0.0
- Modify: `package.json` — version 2.0.0

---

## Parte 1 — Schema, migrations y feature flags

### Task 1.1: Agregar modelos al schema Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar enums nuevos al final del schema**

```prisma
// ─── Fase 2: enums ───

enum QuoteStatus {
  DRAFT
  SUBMITTED
  QUOTED
  ACCEPTED
  REJECTED
  EXPIRED
}

enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
  CANCELLED
}

enum PaymentTerms {
  PREPAID
  NET_15
  NET_30
  NET_60
}

enum PaymentMethod {
  PREPAID
  NET_TERMS
}

enum ApprovalSubject {
  ORDER
  QUOTE
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ApprovalRole {
  OWNER
  ADMIN
}

enum NotificationType {
  QUOTE_SUBMITTED
  QUOTE_QUOTED
  QUOTE_REVISED
  QUOTE_ACCEPTED
  QUOTE_REJECTED
  QUOTE_EXPIRING
  APPROVAL_REQUESTED
  APPROVAL_GRANTED
  APPROVAL_REJECTED
  INVOICE_DUE_SOON
  INVOICE_OVERDUE
  INVOICE_PAID
  CREDIT_LIMIT_WARNING
  CREDIT_BLOCKED
}
```

- [ ] **Step 2: Agregar `PENDING_APPROVAL` al enum `OrderStatus` existente**

```prisma
enum OrderStatus {
  PENDING_PAYMENT
  PENDING_APPROVAL     // ← nuevo en Fase 2
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

- [ ] **Step 3: Agregar campos a `Organization`**

```prisma
model Organization {
  // ... campos existentes
  creditLimit       Decimal?        @db.Decimal(12, 2)
  creditUsed        Decimal         @db.Decimal(12, 2) @default(0)
  paymentTerms      PaymentTerms    @default(PREPAID)
  approvalThreshold Decimal?        @db.Decimal(12, 2)
  approvalRoles     ApprovalRole[]  @default([OWNER, ADMIN])

  // relaciones nuevas
  quotes            Quote[]
  invoices          Invoice[]
  approvalRequests  ApprovalRequest[]
  catalogAccess     OrganizationCatalogAccess[]
}
```

- [ ] **Step 4: Agregar campos a `Product`, `Category`, `Order`, `CartItem`**

```prisma
model Product {
  // ... existentes
  isPrivate     Boolean @default(false)
  priceTiers    ProductPriceTier[]
  catalogAccess OrganizationCatalogAccess[]
  quoteLines    QuoteLine[]
}

model Category {
  // ... existentes
  isPrivate     Boolean @default(false)
  catalogAccess OrganizationCatalogAccess[]
}

model Order {
  // ... existentes
  paymentMethod PaymentMethod @default(PREPAID)
  invoice       Invoice?
  approvedFromQuote Quote?
}

model CartItem {
  // ... existentes
  discountAmountSnapshot Decimal @db.Decimal(12, 2) @default(0)
}
```

- [ ] **Step 5: Agregar modelos nuevos**

```prisma
// ─── Fase 2: quotes ───

model Quote {
  id              String       @id @default(cuid())
  number          String       @unique
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  requestedById   String
  requestedBy     User         @relation("QuoteRequester", fields: [requestedById], references: [id])
  status          QuoteStatus  @default(DRAFT)
  submittedAt     DateTime?
  quotedAt        DateTime?
  quotedById      String?
  quotedBy        User?        @relation("QuoteAuthor", fields: [quotedById], references: [id])
  validUntil      DateTime?
  decidedAt       DateTime?
  decidedById     String?
  notes           String?      @db.Text
  adminNotes      String?      @db.Text
  currency        String
  subtotal        Decimal      @db.Decimal(12, 2) @default(0)
  total           Decimal      @db.Decimal(12, 2) @default(0)
  revisionCount   Int          @default(0)
  lastRevisedAt   DateTime?
  convertedOrderId String?     @unique
  convertedOrder  Order?       @relation(fields: [convertedOrderId], references: [id])
  lines           QuoteLine[]
  auditLog        QuoteAuditLog[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([organizationId, status])
  @@index([requestedById])
}

model QuoteLine {
  id              String   @id @default(cuid())
  quoteId         String
  quote           Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  sku             String
  name            String
  qty             Int
  unitPriceBase   Decimal  @db.Decimal(12, 2)
  unitPriceQuoted Decimal? @db.Decimal(12, 2)
  lineTotal       Decimal  @db.Decimal(12, 2) @default(0)
  order           Int      @default(0)

  @@index([quoteId])
}

model QuoteAuditLog {
  id          String   @id @default(cuid())
  quoteId     String
  quote       Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  action      String
  actorId     String?
  actor       User?    @relation(fields: [actorId], references: [id])
  payload     Json?
  createdAt   DateTime @default(now())

  @@index([quoteId])
}

// ─── Fase 2: accounts ───

model Invoice {
  id              String        @id @default(cuid())
  number          String        @unique
  organizationId  String
  organization    Organization  @relation(fields: [organizationId], references: [id])
  orderId         String        @unique
  order           Order         @relation(fields: [orderId], references: [id])
  status          InvoiceStatus @default(PENDING)
  amount          Decimal       @db.Decimal(12, 2)
  currency        String
  issuedAt        DateTime      @default(now())
  dueDate         DateTime
  paidAt          DateTime?
  paidNote        String?       @db.Text
  paidById        String?
  paidBy          User?         @relation(fields: [paidById], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([organizationId, status])
  @@index([dueDate, status])
}

// ─── Fase 2: approvals ───

model ApprovalRequest {
  id              String         @id @default(cuid())
  organizationId  String
  organization    Organization   @relation(fields: [organizationId], references: [id])
  subjectType     ApprovalSubject
  subjectId       String
  requestedById   String
  requestedBy     User           @relation("ApprovalRequester", fields: [requestedById], references: [id])
  threshold       Decimal        @db.Decimal(12, 2)
  amount          Decimal        @db.Decimal(12, 2)
  status          ApprovalStatus @default(PENDING)
  decidedById     String?
  decidedBy       User?          @relation("ApprovalDecider", fields: [decidedById], references: [id])
  decidedAt       DateTime?
  reason          String?        @db.Text
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([organizationId, status])
  @@index([subjectType, subjectId])
}

// ─── Fase 2: notifications ───

model Notification {
  id                String           @id @default(cuid())
  userId            String
  user              User             @relation(fields: [userId], references: [id])
  type              NotificationType
  subjectType       String?
  subjectId         String?
  title             String
  body              String           @db.Text
  link              String?
  readAt            DateTime?
  emailSentAt       DateTime?
  emailFailedReason String?
  emailRetryCount   Int              @default(0)
  createdAt         DateTime         @default(now())

  @@index([userId, readAt])
  @@index([createdAt])
  @@index([emailSentAt])
}

// ─── Fase 2: catalog extensions ───

model OrganizationCatalogAccess {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  productId       String?
  product         Product?     @relation(fields: [productId], references: [id], onDelete: Cascade)
  categoryId      String?
  category        Category?    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  grantedById     String
  grantedBy       User         @relation(fields: [grantedById], references: [id])
  createdAt       DateTime     @default(now())

  @@unique([organizationId, productId])
  @@unique([organizationId, categoryId])
  @@index([organizationId])
}

// ─── Fase 2: pricing extension ───

model ProductPriceTier {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  minQty      Int
  unitPrice   Decimal  @db.Decimal(12, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([productId, minQty])
  @@index([productId])
}
```

- [ ] **Step 6: Agregar relaciones inversas en User**

```prisma
model User {
  // ... existentes
  quotesRequested       Quote[]           @relation("QuoteRequester")
  quotesAuthored        Quote[]           @relation("QuoteAuthor")
  quoteAuditLogs        QuoteAuditLog[]
  approvalsRequested    ApprovalRequest[] @relation("ApprovalRequester")
  approvalsDecided      ApprovalRequest[] @relation("ApprovalDecider")
  notifications         Notification[]
  invoicesPaidBy        Invoice[]
  catalogAccessGranted  OrganizationCatalogAccess[]
}
```

- [ ] **Step 7: Validar schema con `prisma format`**

Run: `cd /Users/cico/Documents/Claude/Projects/Online\ Store && pnpm prisma format`
Expected: schema formatted sin errores.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add Phase 2 models and enums (quotes, accounts, approvals, notifications)"
```

### Task 1.2: Generar migrations Prisma (auto)

**Files:**
- Create: `prisma/migrations/<timestamp>_phase2_models/migration.sql`

- [ ] **Step 1: Crear migration**

Run: `pnpm prisma migrate dev --create-only --name phase2_models`
Expected: nueva carpeta de migration generada con SQL para todos los modelos nuevos.

- [ ] **Step 2: Revisar migration generada**

Verificar que el SQL incluye: CREATE TABLE para Quote, QuoteLine, QuoteAuditLog, Invoice, ApprovalRequest, Notification, OrganizationCatalogAccess, ProductPriceTier; ALTER TABLE en Organization, Product, Category, Order, CartItem; ALTER TYPE para OrderStatus.

- [ ] **Step 3: Aplicar migration localmente**

Run: `pnpm prisma migrate dev`
Expected: migration aplicada, prisma client regenerado.

- [ ] **Step 4: Smoke test prisma client**

```ts
// scripts/smoke-phase2-models.ts (temporal)
import { prisma } from '@/lib/prisma';
async function smoke() {
  const counts = await Promise.all([
    prisma.quote.count(),
    prisma.invoice.count(),
    prisma.approvalRequest.count(),
    prisma.notification.count(),
    prisma.organizationCatalogAccess.count(),
    prisma.productPriceTier.count(),
  ]);
  console.log({ quote: counts[0], invoice: counts[1], approval: counts[2], notif: counts[3], access: counts[4], tier: counts[5] });
}
smoke().finally(() => prisma.$disconnect());
```

Run: `pnpm tsx scripts/smoke-phase2-models.ts`
Expected: imprime conteos de 0 para todos. Borrar script después del smoke.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(db): migration for Phase 2 models"
```

### Task 1.3: Migration SQL custom (sequences + XOR constraint)

**Files:**
- Create: `prisma/migrations/<timestamp>_phase2_sql_custom/migration.sql`

- [ ] **Step 1: Crear migration vacía**

Run: `pnpm prisma migrate dev --create-only --name phase2_sql_custom`

- [ ] **Step 2: Editar el SQL generado**

```sql
-- prisma/migrations/<timestamp>_phase2_sql_custom/migration.sql

-- Sequences por año para Quote e Invoice (mismo patrón que order_seq_{year} de Fase 1)
CREATE SEQUENCE IF NOT EXISTS quote_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_seq_2026 START 1;

-- XOR constraint en OrganizationCatalogAccess: exactamente uno de productId o categoryId
ALTER TABLE "OrganizationCatalogAccess"
  ADD CONSTRAINT "exactly_one_target" CHECK (
    ("product_id" IS NOT NULL AND "category_id" IS NULL) OR
    ("product_id" IS NULL AND "category_id" IS NOT NULL)
  );
```

- [ ] **Step 3: Aplicar migration**

Run: `pnpm prisma migrate dev`
Expected: SQL aplicado sin errores.

- [ ] **Step 4: Verificar constraint en DB**

```bash
psql $DATABASE_URL -c "\d \"OrganizationCatalogAccess\"" | grep "exactly_one_target"
```

Expected: línea mostrando el check constraint.

- [ ] **Step 5: Verificar sequences**

```bash
psql $DATABASE_URL -c "SELECT sequence_name FROM information_schema.sequences WHERE sequence_name LIKE 'quote_%' OR sequence_name LIKE 'invoice_%';"
```

Expected: dos filas (quote_seq_2026, invoice_seq_2026).

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(db): sequences and XOR constraint for Phase 2"
```

### Task 1.4: Feature flags scaffolding

**Files:**
- Modify: `store.config.ts`
- Create: `lib/features.ts`
- Create: `lib/features.test.ts`

- [ ] **Step 1: Escribir test failing en `lib/features.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isFeatureEnabled, assertFeature } from './features';
import { FeatureDisabledError } from './errors';

describe('features', () => {
  it('isFeatureEnabled returns false for disabled feature', () => {
    expect(isFeatureEnabled('rfq', { features: { rfq: false } } as any)).toBe(false);
  });

  it('isFeatureEnabled returns true for enabled feature', () => {
    expect(isFeatureEnabled('rfq', { features: { rfq: true } } as any)).toBe(true);
  });

  it('assertFeature throws FeatureDisabledError if disabled', () => {
    expect(() =>
      assertFeature('rfq', { features: { rfq: false } } as any)
    ).toThrow(FeatureDisabledError);
  });

  it('assertFeature does not throw if enabled', () => {
    expect(() =>
      assertFeature('rfq', { features: { rfq: true } } as any)
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test, see it fail**

Run: `pnpm test lib/features.test.ts`
Expected: FAIL — module no existe.

- [ ] **Step 3: Implementar `lib/features.ts`**

```ts
import { storeConfig } from '@/store.config';
import { FeatureDisabledError } from './errors';

export type FeatureName = 'rfq' | 'credit' | 'approvals' | 'privateCatalogs' | 'volumeDiscounts';

export function isFeatureEnabled(name: FeatureName, config = storeConfig): boolean {
  return Boolean(config.features?.[name]);
}

export function assertFeature(name: FeatureName, config = storeConfig): void {
  if (!isFeatureEnabled(name, config)) {
    throw new FeatureDisabledError(`Feature "${name}" is not enabled for this store`);
  }
}
```

- [ ] **Step 4: Agregar `FeatureDisabledError` a `lib/errors.ts`**

```ts
// En lib/errors.ts (append)
export class FeatureDisabledError extends Error {
  code = 'FEATURE_DISABLED';
  constructor(message: string) {
    super(message);
    this.name = 'FeatureDisabledError';
  }
}
```

- [ ] **Step 5: Actualizar `store.config.ts` con tipo `features`**

```ts
// store.config.ts (extender el tipo existente)
export const storeConfig = {
  // ... config existente
  features: {
    rfq: false,
    credit: false,
    approvals: false,
    privateCatalogs: false,
    volumeDiscounts: false,
  },
} as const;

// En el tipo (si está separado):
export type StoreConfig = typeof storeConfig & {
  features: {
    rfq: boolean;
    credit: boolean;
    approvals: boolean;
    privateCatalogs: boolean;
    volumeDiscounts: boolean;
  };
};
```

- [ ] **Step 6: Run test, see it pass**

Run: `pnpm test lib/features.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/features.ts lib/features.test.ts lib/errors.ts store.config.ts
git commit -m "feat(config): feature flags scaffolding for Phase 2 features"
```

---

## Parte 2 — Módulo `notifications` (foundational)

### Task 2.1: Custom error classes

**Files:**
- Modify: `lib/errors.ts`

- [ ] **Step 1: Agregar error classes de Fase 2**

```ts
// Append a lib/errors.ts

export class CreditExceededError extends Error {
  code = 'CREDIT_EXCEEDED';
  constructor(message: string, public readonly available: string) { super(message); this.name = 'CreditExceededError'; }
}

export class InvoicesOverdueError extends Error {
  code = 'INVOICES_OVERDUE';
  constructor(message: string, public readonly count: number) { super(message); this.name = 'InvoicesOverdueError'; }
}

export class ApprovalAlreadyDecidedError extends Error {
  code = 'APPROVAL_ALREADY_DECIDED';
  constructor(message: string) { super(message); this.name = 'ApprovalAlreadyDecidedError'; }
}

export class QuoteExpiredError extends Error {
  code = 'QUOTE_EXPIRED';
  constructor(message: string) { super(message); this.name = 'QuoteExpiredError'; }
}

export class CatalogAccessDeniedError extends Error {
  code = 'CATALOG_ACCESS_DENIED';
  constructor(message: string) { super(message); this.name = 'CatalogAccessDeniedError'; }
}

// FeatureDisabledError ya fue añadida en Task 1.4
// StockInsufficientError ya existe de Fase 1
```

- [ ] **Step 2: Commit**

```bash
git add lib/errors.ts
git commit -m "feat(errors): custom error classes for Phase 2"
```

### Task 2.2: Notifications dispatch (write + email)

**Files:**
- Create: `modules/notifications/service.ts`
- Create: `modules/notifications/index.ts`
- Create: `modules/notifications/__tests__/dispatch.test.ts`

- [ ] **Step 1: Escribir test failing**

```ts
// modules/notifications/__tests__/dispatch.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { dispatch } from '../service';

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-id-mock' }),
}));

beforeEach(async () => {
  await prisma.notification.deleteMany();
});

describe('notifications.dispatch', () => {
  it('creates Notification rows for each userId', async () => {
    const [u1, u2] = await Promise.all([
      prisma.user.create({ data: { email: 'a@a.com', name: 'A' } }),
      prisma.user.create({ data: { email: 'b@b.com', name: 'B' } }),
    ]);

    await dispatch({
      userIds: [u1.id, u2.id],
      type: 'QUOTE_SUBMITTED',
      title: 'New quote',
      body: 'A buyer submitted a quote',
      link: '/admin/quotes/123',
      subjectType: 'QUOTE',
      subjectId: '123',
    });

    const notifs = await prisma.notification.findMany({ orderBy: { userId: 'asc' } });
    expect(notifs).toHaveLength(2);
    expect(notifs[0]!.type).toBe('QUOTE_SUBMITTED');
    expect(notifs[0]!.link).toBe('/admin/quotes/123');
  });

  it('attempts email send and stamps emailSentAt on success', async () => {
    const user = await prisma.user.create({ data: { email: 'c@c.com', name: 'C' } });
    await dispatch({
      userIds: [user.id],
      type: 'QUOTE_QUOTED',
      title: 'Your quote is ready',
      body: 'View it now',
      link: '/quotes/abc',
    });

    const notif = await prisma.notification.findFirst({ where: { userId: user.id } });
    expect(notif?.emailSentAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test, see it fail**

Run: `pnpm test modules/notifications/__tests__/dispatch.test.ts`
Expected: FAIL — module no existe.

- [ ] **Step 3: Implementar `modules/notifications/service.ts`**

```ts
import { prisma } from '@/lib/prisma';
import type { NotificationType } from '@prisma/client';
import { sendEmail } from '@/lib/email/resend';
import { renderEmailFor } from './email';
import { logger } from '@/lib/logger';

export interface DispatchInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  subjectType?: string;
  subjectId?: string;
}

export async function dispatch(input: DispatchInput): Promise<void> {
  if (input.userIds.length === 0) return;

  // Crear en DB primero (in-app siempre)
  const created = await prisma.notification.createManyAndReturn({
    data: input.userIds.map(userId => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      subjectType: input.subjectType ?? null,
      subjectId: input.subjectId ?? null,
    })),
  });

  // Email en background (no await — fire and forget; retry job se encarga)
  for (const notif of created) {
    void sendNotificationEmail(notif).catch(err => {
      logger.error({ err, notificationId: notif.id }, 'notification email send failed');
    });
  }
}

async function sendNotificationEmail(notif: Awaited<ReturnType<typeof prisma.notification.create>>): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: notif.userId } });
  if (!user?.email) return;

  try {
    const rendered = await renderEmailFor(notif.type, {
      title: notif.title,
      body: notif.body,
      link: notif.link,
      userName: user.name ?? 'there',
    });
    await sendEmail({ to: user.email, subject: notif.title, html: rendered });
    await prisma.notification.update({
      where: { id: notif.id },
      data: { emailSentAt: new Date(), emailFailedReason: null },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await prisma.notification.update({
      where: { id: notif.id },
      data: {
        emailFailedReason: reason,
        emailRetryCount: { increment: 1 },
      },
    });
    throw err;
  }
}

export async function listForUser(userId: string, options: { unreadOnly?: boolean; limit?: number } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(options.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 50,
  });
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAsRead(userId: string, ids: string[]): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
```

- [ ] **Step 4: Crear `modules/notifications/index.ts`**

```ts
export { dispatch, listForUser, countUnread, markAsRead, markAllAsRead } from './service';
export type { DispatchInput } from './service';
```

- [ ] **Step 5: Crear stub de `modules/notifications/email/index.ts`**

```ts
import type { NotificationType } from '@prisma/client';

interface RenderVars {
  title: string;
  body: string;
  link: string | null;
  userName: string;
}

export async function renderEmailFor(type: NotificationType, vars: RenderVars): Promise<string> {
  // Stub: render simple HTML. Templates específicos en Task 2.3.
  const linkBlock = vars.link
    ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}${vars.link}">Ver detalle</a></p>`
    : '';
  return `
    <h2>${vars.title}</h2>
    <p>Hola ${vars.userName},</p>
    <p>${vars.body}</p>
    ${linkBlock}
  `;
}
```

- [ ] **Step 6: Run tests, see them pass**

Run: `pnpm test modules/notifications/__tests__/dispatch.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add modules/notifications/ lib/errors.ts
git commit -m "feat(notifications): dispatch service with in-app + email"
```

### Task 2.3: Email templates con react-email

**Files:**
- Create: `modules/notifications/email/templates/*.tsx` (12 templates)
- Modify: `modules/notifications/email/index.ts`

- [ ] **Step 1: Instalar react-email si no está**

Run: `pnpm add react-email @react-email/components`
Verify: aparecen en `package.json`.

- [ ] **Step 2: Crear template base `_base.tsx`**

```tsx
// modules/notifications/email/templates/_base.tsx
import { Html, Head, Body, Container, Heading, Text, Link, Section } from '@react-email/components';

export interface BaseTemplateProps {
  title: string;
  body: string;
  link?: string | null;
  userName: string;
  cta?: string;
}

export function BaseTemplate({ title, body, link, userName, cta = 'Ver detalle' }: BaseTemplateProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, background: '#f5f5f5' }}>
        <Container style={{ background: 'white', padding: 32, borderRadius: 8, maxWidth: 600 }}>
          <Heading as="h2">{title}</Heading>
          <Text>Hola {userName},</Text>
          <Text>{body}</Text>
          {link && (
            <Section style={{ marginTop: 24 }}>
              <Link href={`${appUrl}${link}`} style={{ background: '#0066cc', color: 'white', padding: '12px 24px', borderRadius: 4, textDecoration: 'none' }}>
                {cta}
              </Link>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Crear los 12 templates específicos**

Cada template extiende BaseTemplate con título y CTA contextual. Por brevedad, mostrar uno como ejemplo y replicar pattern.

```tsx
// modules/notifications/email/templates/quote-submitted.tsx
import { BaseTemplate, type BaseTemplateProps } from './_base';

export function QuoteSubmittedEmail(props: BaseTemplateProps) {
  return <BaseTemplate {...props} cta="Ver solicitud" />;
}
```

Replicar para: `quote-quoted.tsx` (cta "Ver cotización"), `quote-revised.tsx` (cta "Ver cotización revisada"), `approval-requested.tsx` (cta "Decidir aprobación"), `approval-granted.tsx` (cta "Ver orden"), `approval-rejected.tsx` (cta "Ver detalles"), `invoice-due-soon.tsx` (cta "Ver factura"), `invoice-overdue.tsx` (cta "Pagar factura"), `invoice-paid.tsx` (cta "Ver factura"), `credit-warning.tsx` (cta "Ver cuenta"), `credit-blocked.tsx` (cta "Ver cuenta"), `quote-expiring.tsx` (cta "Aceptar antes que venza").

- [ ] **Step 4: Actualizar `modules/notifications/email/index.ts` con render real**

```tsx
import { render } from '@react-email/components';
import type { NotificationType } from '@prisma/client';
import { QuoteSubmittedEmail } from './templates/quote-submitted';
import { QuoteQuotedEmail } from './templates/quote-quoted';
import { QuoteRevisedEmail } from './templates/quote-revised';
import { QuoteExpiringEmail } from './templates/quote-expiring';
import { ApprovalRequestedEmail } from './templates/approval-requested';
import { ApprovalGrantedEmail } from './templates/approval-granted';
import { ApprovalRejectedEmail } from './templates/approval-rejected';
import { InvoiceDueSoonEmail } from './templates/invoice-due-soon';
import { InvoiceOverdueEmail } from './templates/invoice-overdue';
import { InvoicePaidEmail } from './templates/invoice-paid';
import { CreditWarningEmail } from './templates/credit-warning';
import { CreditBlockedEmail } from './templates/credit-blocked';
import type { BaseTemplateProps } from './templates/_base';

const TEMPLATES: Record<NotificationType, (p: BaseTemplateProps) => JSX.Element> = {
  QUOTE_SUBMITTED: QuoteSubmittedEmail,
  QUOTE_QUOTED: QuoteQuotedEmail,
  QUOTE_REVISED: QuoteRevisedEmail,
  QUOTE_ACCEPTED: QuoteQuotedEmail, // reusa (admin notif)
  QUOTE_REJECTED: QuoteQuotedEmail, // reusa
  QUOTE_EXPIRING: QuoteExpiringEmail,
  APPROVAL_REQUESTED: ApprovalRequestedEmail,
  APPROVAL_GRANTED: ApprovalGrantedEmail,
  APPROVAL_REJECTED: ApprovalRejectedEmail,
  INVOICE_DUE_SOON: InvoiceDueSoonEmail,
  INVOICE_OVERDUE: InvoiceOverdueEmail,
  INVOICE_PAID: InvoicePaidEmail,
  CREDIT_LIMIT_WARNING: CreditWarningEmail,
  CREDIT_BLOCKED: CreditBlockedEmail,
};

export async function renderEmailFor(type: NotificationType, vars: BaseTemplateProps): Promise<string> {
  const Template = TEMPLATES[type];
  return render(Template(vars));
}
```

- [ ] **Step 5: Verificar tests pasan**

Run: `pnpm test modules/notifications/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/notifications/email/
git commit -m "feat(notifications): email templates with react-email"
```

### Task 2.4: Retry job para emails fallidos

**Files:**
- Create: `modules/notifications/__tests__/retry.test.ts`
- Modify: `modules/notifications/service.ts`
- Create: `scripts/retry-failed-notifications.ts`

- [ ] **Step 1: Escribir test failing**

```ts
// modules/notifications/__tests__/retry.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { retryFailedEmails } from '../service';

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-id-mock' }),
}));

beforeEach(async () => {
  await prisma.notification.deleteMany();
});

describe('notifications.retryFailedEmails', () => {
  it('retries emails with emailSentAt null and retryCount < 5', async () => {
    const u = await prisma.user.create({ data: { email: 'x@x.com', name: 'X' } });
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: 'QUOTE_SUBMITTED',
        title: 't', body: 'b',
        emailSentAt: null,
        emailRetryCount: 2,
        emailFailedReason: 'previous error',
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
      },
    });

    const result = await retryFailedEmails();

    expect(result.attempted).toBeGreaterThanOrEqual(1);
    const updated = await prisma.notification.findFirst({ where: { userId: u.id } });
    expect(updated?.emailSentAt).not.toBeNull();
  });

  it('skips emails with retryCount >= 5', async () => {
    const u = await prisma.user.create({ data: { email: 'y@y.com', name: 'Y' } });
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: 'QUOTE_QUOTED',
        title: 't', body: 'b',
        emailSentAt: null,
        emailRetryCount: 5,
        emailFailedReason: 'permanent',
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });

    const result = await retryFailedEmails();
    expect(result.attempted).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, see it fail**

Run: `pnpm test modules/notifications/__tests__/retry.test.ts`
Expected: FAIL — function no existe.

- [ ] **Step 3: Implementar `retryFailedEmails` en `service.ts`**

```ts
// Append a modules/notifications/service.ts

const MAX_RETRY = 5;
const RETRY_DELAY_MS = 60 * 1000; // mínimo 1 min después de creación antes de reintentar

export async function retryFailedEmails(): Promise<{ attempted: number; succeeded: number }> {
  const candidates = await prisma.notification.findMany({
    where: {
      emailSentAt: null,
      emailRetryCount: { lt: MAX_RETRY },
      createdAt: { lt: new Date(Date.now() - RETRY_DELAY_MS) },
    },
    take: 50,
  });

  let succeeded = 0;
  for (const notif of candidates) {
    try {
      await sendNotificationEmail(notif);
      succeeded++;
    } catch {
      // ya se incrementó retryCount en sendNotificationEmail
    }
  }
  return { attempted: candidates.length, succeeded };
}
```

- [ ] **Step 4: Exportar desde index**

Append a `modules/notifications/index.ts`:

```ts
export { retryFailedEmails } from './service';
```

- [ ] **Step 5: Crear script ejecutable**

```ts
// scripts/retry-failed-notifications.ts
import { retryFailedEmails } from '@/modules/notifications';
import { logger } from '@/lib/logger';

async function main() {
  const result = await retryFailedEmails();
  logger.info({ result }, 'retry-failed-notifications run');
}

main().catch(err => {
  logger.error({ err }, 'retry-failed-notifications failed');
  process.exit(1);
});
```

- [ ] **Step 6: Run tests, see them pass**

Run: `pnpm test modules/notifications/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add modules/notifications/ scripts/retry-failed-notifications.ts
git commit -m "feat(notifications): retry job for failed emails"
```

---

## Parte 3 — Módulo `approvals` (engine)

### Task 3.1: Approval request creation

**Files:**
- Create: `modules/approvals/service.ts`
- Create: `modules/approvals/index.ts`
- Create: `modules/approvals/__tests__/request.test.ts`

- [ ] **Step 1: Escribir test failing**

```ts
// modules/approvals/__tests__/request.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { request } from '../service';

beforeEach(async () => {
  await prisma.approvalRequest.deleteMany();
  await prisma.organization.deleteMany();
});

describe('approvals.request', () => {
  it('returns null if org has no threshold', async () => {
    const org = await prisma.organization.create({ data: { name: 'NoThreshold', slug: 'nt', creditUsed: 0, approvalThreshold: null } });
    const user = await prisma.user.create({ data: { email: 'u@u.com', name: 'U' } });

    const result = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'order-123',
      amount: 1000,
      requestedById: user.id,
    });

    expect(result).toBeNull();
  });

  it('returns null if amount <= threshold', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'o', creditUsed: 0, approvalThreshold: 5000 } });
    const user = await prisma.user.create({ data: { email: 'u2@u.com', name: 'U' } });

    const result = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'order-456',
      amount: 4999,
      requestedById: user.id,
    });

    expect(result).toBeNull();
  });

  it('creates ApprovalRequest if amount > threshold', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'o', creditUsed: 0, approvalThreshold: 5000 } });
    const user = await prisma.user.create({ data: { email: 'u3@u.com', name: 'U' } });

    const result = await request({
      organizationId: org.id,
      subjectType: 'ORDER',
      subjectId: 'order-789',
      amount: 5001,
      requestedById: user.id,
    });

    expect(result).not.toBeNull();
    const req = await prisma.approvalRequest.findUnique({ where: { id: result!.id } });
    expect(req?.status).toBe('PENDING');
    expect(req?.threshold.toString()).toBe('5000');
    expect(req?.amount.toString()).toBe('5001');
  });
});
```

- [ ] **Step 2: Run test, see it fail**

Run: `pnpm test modules/approvals/__tests__/request.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `modules/approvals/service.ts`**

```ts
import { prisma } from '@/lib/prisma';
import type { ApprovalSubject, ApprovalRequest } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { dispatch } from '@/modules/notifications';

export interface RequestInput {
  organizationId: string;
  subjectType: ApprovalSubject;
  subjectId: string;
  amount: number | string | Decimal;
  requestedById: string;
}

export async function request(input: RequestInput): Promise<ApprovalRequest | null> {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org) throw new Error(`Organization not found: ${input.organizationId}`);
  if (!org.approvalThreshold) return null;

  const amount = new Decimal(input.amount);
  if (amount.lte(org.approvalThreshold)) return null;

  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      organizationId: input.organizationId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      amount,
      threshold: org.approvalThreshold,
      requestedById: input.requestedById,
      status: 'PENDING',
    },
  });

  // Notif a aprobadores
  const approvers = await prisma.organizationMember.findMany({
    where: { organizationId: input.organizationId, role: { in: org.approvalRoles } },
    select: { userId: true },
  });

  if (approvers.length > 0) {
    await dispatch({
      userIds: approvers.map(a => a.userId),
      type: 'APPROVAL_REQUESTED',
      title: `Aprobación requerida: ${input.subjectType.toLowerCase()} de $${amount.toFixed(2)}`,
      body: `Un miembro de tu organización envió un ${input.subjectType.toLowerCase()} por $${amount.toFixed(2)} que excede el threshold de $${org.approvalThreshold.toFixed(2)}.`,
      link: `/approvals/${approvalRequest.id}`,
      subjectType: 'APPROVAL_REQUEST',
      subjectId: approvalRequest.id,
    });
  }

  return approvalRequest;
}
```

- [ ] **Step 4: Crear `modules/approvals/index.ts`**

```ts
export { request } from './service';
export type { RequestInput } from './service';
```

- [ ] **Step 5: Run tests, see them pass**

Run: `pnpm test modules/approvals/__tests__/request.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/approvals/
git commit -m "feat(approvals): request creation with threshold check and notification"
```

### Task 3.2: Approval decision (approve/reject) + idempotency

**Files:**
- Modify: `modules/approvals/service.ts`
- Modify: `modules/approvals/index.ts`
- Create: `modules/approvals/__tests__/decide.test.ts`
- Create: `modules/approvals/__tests__/idempotency.test.ts`

- [ ] **Step 1: Escribir test failing**

```ts
// modules/approvals/__tests__/decide.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { decide, request } from '../service';

beforeEach(async () => {
  await prisma.approvalRequest.deleteMany();
});

describe('approvals.decide', () => {
  it('approves a pending request', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'o', creditUsed: 0, approvalThreshold: 100 } });
    const requester = await prisma.user.create({ data: { email: 'r@r.com', name: 'R' } });
    const approver = await prisma.user.create({ data: { email: 'a@a.com', name: 'A' } });
    const req = await request({ organizationId: org.id, subjectType: 'ORDER', subjectId: 'o1', amount: 200, requestedById: requester.id });

    const decided = await decide({ requestId: req!.id, action: 'APPROVED', decidedById: approver.id });

    expect(decided.status).toBe('APPROVED');
    expect(decided.decidedById).toBe(approver.id);
    expect(decided.decidedAt).not.toBeNull();
  });

  it('rejects with reason', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'o2', creditUsed: 0, approvalThreshold: 100 } });
    const requester = await prisma.user.create({ data: { email: 'r2@r.com', name: 'R' } });
    const approver = await prisma.user.create({ data: { email: 'a2@a.com', name: 'A' } });
    const req = await request({ organizationId: org.id, subjectType: 'ORDER', subjectId: 'o2', amount: 200, requestedById: requester.id });

    const decided = await decide({ requestId: req!.id, action: 'REJECTED', decidedById: approver.id, reason: 'budget' });

    expect(decided.status).toBe('REJECTED');
    expect(decided.reason).toBe('budget');
  });
});
```

```ts
// modules/approvals/__tests__/idempotency.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { decide, request } from '../service';
import { ApprovalAlreadyDecidedError } from '@/lib/errors';

beforeEach(async () => {
  await prisma.approvalRequest.deleteMany();
});

describe('approvals.decide idempotency', () => {
  it('throws ApprovalAlreadyDecidedError on second decide', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'i1', creditUsed: 0, approvalThreshold: 100 } });
    const u = await prisma.user.create({ data: { email: 'u@u.com', name: 'U' } });
    const a = await prisma.user.create({ data: { email: 'a@a.com', name: 'A' } });
    const req = await request({ organizationId: org.id, subjectType: 'ORDER', subjectId: 'oi', amount: 200, requestedById: u.id });

    await decide({ requestId: req!.id, action: 'APPROVED', decidedById: a.id });

    await expect(decide({ requestId: req!.id, action: 'REJECTED', decidedById: a.id })).rejects.toThrow(ApprovalAlreadyDecidedError);
  });
});
```

- [ ] **Step 2: Run tests, see them fail**

Run: `pnpm test modules/approvals/__tests__/`
Expected: FAIL.

- [ ] **Step 3: Implementar `decide` con hook ejecución y idempotencia**

```ts
// Append a modules/approvals/service.ts
import { ApprovalAlreadyDecidedError } from '@/lib/errors';
import type { ApprovalStatus } from '@prisma/client';
import { registry } from './registry';

export interface DecideInput {
  requestId: string;
  action: Exclude<ApprovalStatus, 'PENDING'>;
  decidedById: string;
  reason?: string;
}

export async function decide(input: DecideInput): Promise<ApprovalRequest> {
  return prisma.$transaction(async tx => {
    const result = await tx.approvalRequest.updateMany({
      where: { id: input.requestId, status: 'PENDING' },
      data: {
        status: input.action,
        decidedById: input.decidedById,
        decidedAt: new Date(),
        reason: input.reason ?? null,
      },
    });

    if (result.count === 0) {
      const existing = await tx.approvalRequest.findUnique({ where: { id: input.requestId } });
      if (!existing) throw new Error(`ApprovalRequest not found: ${input.requestId}`);
      throw new ApprovalAlreadyDecidedError(`Request ${input.requestId} already in status ${existing.status}`);
    }

    const updated = await tx.approvalRequest.findUniqueOrThrow({ where: { id: input.requestId } });

    // Ejecutar hook registrado para el subjectType
    const handler = registry.get(updated.subjectType);
    if (handler) await handler(updated, tx);

    // Notif al solicitante
    await dispatch({
      userIds: [updated.requestedById],
      type: input.action === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      title: input.action === 'APPROVED' ? 'Tu solicitud fue aprobada' : 'Tu solicitud fue rechazada',
      body: input.action === 'APPROVED'
        ? `Tu ${updated.subjectType.toLowerCase()} fue aprobada.`
        : `Tu ${updated.subjectType.toLowerCase()} fue rechazada${input.reason ? `: ${input.reason}` : ''}.`,
      link: updated.subjectType === 'ORDER' ? `/orders/${updated.subjectId}` : `/quotes/${updated.subjectId}`,
      subjectType: 'APPROVAL_REQUEST',
      subjectId: updated.id,
    });

    return updated;
  });
}
```

- [ ] **Step 4: Crear `modules/approvals/registry.ts`**

```ts
import type { ApprovalRequest, ApprovalSubject, Prisma } from '@prisma/client';

type Handler = (req: ApprovalRequest, tx: Prisma.TransactionClient) => Promise<void>;

class Registry {
  private handlers = new Map<ApprovalSubject, Handler>();
  set(subject: ApprovalSubject, handler: Handler): void { this.handlers.set(subject, handler); }
  get(subject: ApprovalSubject): Handler | undefined { return this.handlers.get(subject); }
}

export const registry = new Registry();

export function subscribe(subject: ApprovalSubject, handler: Handler): void {
  registry.set(subject, handler);
}
```

- [ ] **Step 5: Exportar desde index**

```ts
// modules/approvals/index.ts
export { request, decide } from './service';
export { subscribe } from './registry';
export type { RequestInput, DecideInput } from './service';

export async function canApprove(userId: string, orgId: string): Promise<boolean> {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: orgId },
    select: { role: true },
  });
  if (!member) return false;
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { approvalRoles: true } });
  return org.approvalRoles.includes(member.role as any);
}
```

(Mover `prisma` import al top del archivo `index.ts`.)

- [ ] **Step 6: Run tests, see them pass**

Run: `pnpm test modules/approvals/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add modules/approvals/ lib/errors.ts
git commit -m "feat(approvals): decide engine with hooks, idempotency, and canApprove"
```

---

## Parte 4 — Módulo `accounts` (credit + invoices)

### Task 4.1: Invoice creation y numbering

**Files:**
- Create: `modules/accounts/invoices.ts`
- Create: `modules/accounts/numbers.ts`
- Create: `modules/accounts/index.ts`
- Create: `modules/accounts/__tests__/invoices.test.ts`

- [ ] **Step 1: Escribir test failing**

```ts
// modules/accounts/__tests__/invoices.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createInvoiceFromOrder } from '../invoices';

beforeEach(async () => {
  await prisma.invoice.deleteMany();
});

describe('accounts.createInvoiceFromOrder', () => {
  it('creates Invoice with dueDate = order.confirmedAt + paymentTerms days', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'inv-1', creditUsed: 0, paymentTerms: 'NET_30', creditLimit: 100000 } });
    const user = await prisma.user.create({ data: { email: 'u@inv.com', name: 'U' } });
    // Crear orden mínima (asume helpers de Fase 1 disponibles, o construir manual)
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2026-000001',
        organizationId: org.id, placedByUserId: user.id,
        status: 'CONFIRMED', confirmedAt: new Date('2026-06-01'),
        subtotal: 1000, total: 1000, currency: 'USD',
        billingAddressId: 'addr-placeholder', shippingAddressId: 'addr-placeholder',
        paymentMethod: 'NET_TERMS',
      } as any, // ajustar si addresses son required
    });

    const invoice = await createInvoiceFromOrder(order.id);

    expect(invoice.amount.toString()).toBe('1000');
    expect(invoice.status).toBe('PENDING');
    expect(invoice.number).toMatch(/^IN-2026-\d{6}$/);
    const expected = new Date('2026-07-01').toISOString().slice(0, 10);
    expect(invoice.dueDate.toISOString().slice(0, 10)).toBe(expected);
  });

  it('increments Organization.creditUsed', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'inv-2', creditUsed: 500, paymentTerms: 'NET_30', creditLimit: 10000 } });
    const user = await prisma.user.create({ data: { email: 'u2@inv.com', name: 'U' } });
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2026-000002',
        organizationId: org.id, placedByUserId: user.id,
        status: 'CONFIRMED', confirmedAt: new Date(),
        subtotal: 1000, total: 1000, currency: 'USD',
        billingAddressId: 'addr-placeholder', shippingAddressId: 'addr-placeholder',
        paymentMethod: 'NET_TERMS',
      } as any,
    });

    await createInvoiceFromOrder(order.id);

    const updatedOrg = await prisma.organization.findUnique({ where: { id: org.id } });
    expect(updatedOrg?.creditUsed.toString()).toBe('1500');
  });
});
```

- [ ] **Step 2: Run test, see it fail**

Run: `pnpm test modules/accounts/__tests__/invoices.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `numbers.ts`**

```ts
// modules/accounts/numbers.ts
import type { Prisma } from '@prisma/client';

export async function generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  // Lock para serializar el SELECT nextval
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('invoice_seq'))`);
  const seqResult = await tx.$queryRawUnsafe<{ nextval: bigint }[]>(`SELECT nextval('invoice_seq_${year}') AS nextval`);
  const seq = Number(seqResult[0]!.nextval);
  return `IN-${year}-${seq.toString().padStart(6, '0')}`;
}
```

- [ ] **Step 4: Implementar `invoices.ts`**

```ts
// modules/accounts/invoices.ts
import { prisma } from '@/lib/prisma';
import type { Invoice, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { generateInvoiceNumber } from './numbers';
import { dispatch } from '@/modules/notifications';
import { storeConfig } from '@/store.config';

const DAYS_BY_TERMS: Record<string, number> = {
  NET_15: 15,
  NET_30: 30,
  NET_60: 60,
};

export async function createInvoiceFromOrder(orderId: string, tx?: Prisma.TransactionClient): Promise<Invoice> {
  const exec = async (t: Prisma.TransactionClient): Promise<Invoice> => {
    const order = await t.order.findUniqueOrThrow({ where: { id: orderId } });
    const org = await t.organization.findUniqueOrThrow({ where: { id: order.organizationId } });

    const days = DAYS_BY_TERMS[org.paymentTerms] ?? 30;
    const baseDate = order.confirmedAt ?? new Date();
    const dueDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const number = await generateInvoiceNumber(t);

    const invoice = await t.invoice.create({
      data: {
        number,
        organizationId: order.organizationId,
        orderId: order.id,
        amount: order.total,
        currency: order.currency,
        dueDate,
        status: 'PENDING',
      },
    });

    await t.organization.update({
      where: { id: org.id },
      data: { creditUsed: { increment: order.total } },
    });

    // Notificación al admin de la tienda + a los miembros de la org
    const orgMembers = await t.organizationMember.findMany({
      where: { organizationId: org.id },
      select: { userId: true },
    });
    await dispatch({
      userIds: orgMembers.map(m => m.userId),
      type: 'INVOICE_DUE_SOON',
      title: `Factura ${invoice.number} emitida — vence ${invoice.dueDate.toISOString().slice(0, 10)}`,
      body: `Se generó una factura por $${invoice.amount.toFixed(2)} con vencimiento en ${days} días.`,
      link: `/invoices/${invoice.id}`,
      subjectType: 'INVOICE',
      subjectId: invoice.id,
    });

    return invoice;
  };

  return tx ? exec(tx) : prisma.$transaction(exec);
}
```

- [ ] **Step 5: Crear `modules/accounts/index.ts`**

```ts
export { createInvoiceFromOrder } from './invoices';
```

- [ ] **Step 6: Run tests, see them pass**

Run: `pnpm test modules/accounts/__tests__/invoices.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add modules/accounts/
git commit -m "feat(accounts): invoice creation with numbering and creditUsed update"
```

### Task 4.2: markPaid + creditUsed decrement

**Files:**
- Modify: `modules/accounts/invoices.ts`
- Modify: `modules/accounts/index.ts`
- Modify: `modules/accounts/__tests__/invoices.test.ts`

- [ ] **Step 1: Agregar test failing**

```ts
// Append a modules/accounts/__tests__/invoices.test.ts

import { markPaid } from '../invoices';

describe('accounts.markPaid', () => {
  it('marks invoice as PAID and decrements creditUsed', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'paid-1', creditUsed: 1000, paymentTerms: 'NET_30', creditLimit: 10000 } });
    const user = await prisma.user.create({ data: { email: 'p@p.com', name: 'P', isPlatformAdmin: true } });
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2026-000003', organizationId: org.id, placedByUserId: user.id,
        status: 'CONFIRMED', confirmedAt: new Date(),
        subtotal: 1000, total: 1000, currency: 'USD',
        billingAddressId: 'addr-placeholder', shippingAddressId: 'addr-placeholder',
        paymentMethod: 'NET_TERMS',
      } as any,
    });
    const inv = await createInvoiceFromOrder(order.id);

    await markPaid({ invoiceId: inv.id, paidById: user.id, paidNote: 'wire ref 12345' });

    const updated = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(updated.status).toBe('PAID');
    expect(updated.paidNote).toBe('wire ref 12345');
    const updatedOrg = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    // creditUsed iba 1000 + 1000 invoice creada = 2000, después markPaid -1000 = 1000
    expect(updatedOrg.creditUsed.toString()).toBe('1000');
  });

  it('is idempotent: marking already-paid invoice throws', async () => {
    // similar setup, llamar markPaid dos veces, segunda debe lanzar error
    // ... (test similar al anterior)
  });
});
```

- [ ] **Step 2: Run test, see it fail**

- [ ] **Step 3: Implementar `markPaid`**

```ts
// Append a modules/accounts/invoices.ts

export interface MarkPaidInput {
  invoiceId: string;
  paidById: string;
  paidNote: string;
  paidAt?: Date;
}

export async function markPaid(input: MarkPaidInput): Promise<Invoice> {
  return prisma.$transaction(async tx => {
    const result = await tx.invoice.updateMany({
      where: { id: input.invoiceId, status: { in: ['PENDING', 'OVERDUE'] } },
      data: {
        status: 'PAID',
        paidAt: input.paidAt ?? new Date(),
        paidById: input.paidById,
        paidNote: input.paidNote,
      },
    });

    if (result.count === 0) {
      const existing = await tx.invoice.findUnique({ where: { id: input.invoiceId } });
      if (!existing) throw new Error(`Invoice not found: ${input.invoiceId}`);
      throw new Error(`Invoice ${input.invoiceId} cannot be marked paid (status: ${existing.status})`);
    }

    const updated = await tx.invoice.findUniqueOrThrow({ where: { id: input.invoiceId } });

    await tx.organization.update({
      where: { id: updated.organizationId },
      data: { creditUsed: { decrement: updated.amount } },
    });

    // Notif al buyer
    const orgMembers = await tx.organizationMember.findMany({
      where: { organizationId: updated.organizationId },
      select: { userId: true },
    });
    await dispatch({
      userIds: orgMembers.map(m => m.userId),
      type: 'INVOICE_PAID',
      title: `Factura ${updated.number} marcada como pagada`,
      body: `Tu factura por $${updated.amount.toFixed(2)} fue confirmada como pagada.`,
      link: `/invoices/${updated.id}`,
      subjectType: 'INVOICE',
      subjectId: updated.id,
    });

    return updated;
  });
}
```

- [ ] **Step 4: Exportar desde index**

```ts
// modules/accounts/index.ts
export { createInvoiceFromOrder, markPaid } from './invoices';
```

- [ ] **Step 5: Run tests, see them pass**

- [ ] **Step 6: Commit**

```bash
git add modules/accounts/
git commit -m "feat(accounts): markPaid with creditUsed decrement and idempotency"
```

### Task 4.3: checkCreditEligibility (función pura)

**Files:**
- Create: `modules/accounts/credit.ts`
- Modify: `modules/accounts/index.ts`
- Create: `modules/accounts/__tests__/credit.test.ts`

- [ ] **Step 1: Escribir test failing**

```ts
// modules/accounts/__tests__/credit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { checkCreditEligibility } from '../credit';

beforeEach(async () => {
  await prisma.invoice.deleteMany();
});

describe('accounts.checkCreditEligibility', () => {
  it('blocks if invoices overdue', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'cr-1', creditUsed: 0, paymentTerms: 'NET_30', creditLimit: 10000 } });
    // crear invoice overdue manualmente
    await prisma.invoice.create({
      data: {
        number: 'IN-2026-999998', organizationId: org.id, orderId: 'fake-order',
        amount: 500, currency: 'USD', dueDate: new Date(Date.now() - 86400000),
        status: 'OVERDUE',
      } as any,
    });

    const result = await checkCreditEligibility(org.id, 1000);
    expect(result.eligible).toBe(false);
    expect(result.code).toBe('INVOICES_OVERDUE');
  });

  it('blocks if cart total exceeds available credit', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'cr-2', creditUsed: 9500, paymentTerms: 'NET_30', creditLimit: 10000 } });
    const result = await checkCreditEligibility(org.id, 1000);
    expect(result.eligible).toBe(false);
    expect(result.code).toBe('CREDIT_EXCEEDED');
  });

  it('warns soft if approaching 80%', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'cr-3', creditUsed: 7000, paymentTerms: 'NET_30', creditLimit: 10000 } });
    const result = await checkCreditEligibility(org.id, 1500);
    expect(result.eligible).toBe(true);
    expect(result.warn).toBe(true);
  });

  it('allows if all checks pass', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'cr-4', creditUsed: 1000, paymentTerms: 'NET_30', creditLimit: 10000 } });
    const result = await checkCreditEligibility(org.id, 500);
    expect(result.eligible).toBe(true);
    expect(result.warn).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, see it fail**

- [ ] **Step 3: Implementar `credit.ts`**

```ts
// modules/accounts/credit.ts
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface EligibilityResult {
  eligible: boolean;
  warn: boolean;
  code?: 'INVOICES_OVERDUE' | 'CREDIT_EXCEEDED' | 'NO_CREDIT_LIMIT';
  message?: string;
  available?: string;
}

export async function checkCreditEligibility(orgId: string, cartTotal: number | string | Decimal): Promise<EligibilityResult> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

  if (!org.creditLimit) {
    return { eligible: false, warn: false, code: 'NO_CREDIT_LIMIT', message: 'Esta organización no tiene crédito habilitado' };
  }

  const overdueCount = await prisma.invoice.count({
    where: { organizationId: orgId, status: 'OVERDUE' },
  });
  if (overdueCount > 0) {
    return { eligible: false, warn: false, code: 'INVOICES_OVERDUE', message: `Tienes ${overdueCount} factura(s) vencida(s)` };
  }

  const total = new Decimal(cartTotal);
  const available = org.creditLimit.sub(org.creditUsed);
  if (total.gt(available)) {
    return { eligible: false, warn: false, code: 'CREDIT_EXCEEDED', message: 'El monto excede tu crédito disponible', available: available.toFixed(2) };
  }

  const utilizationAfter = org.creditUsed.add(total);
  const threshold80 = org.creditLimit.mul(0.8);
  const warn = utilizationAfter.gte(threshold80);

  return { eligible: true, warn };
}

export async function recalcCreditUsed(orgId: string): Promise<Decimal> {
  const aggregated = await prisma.invoice.aggregate({
    where: { organizationId: orgId, status: { in: ['PENDING', 'OVERDUE'] } },
    _sum: { amount: true },
  });
  const newCreditUsed = aggregated._sum.amount ?? new Decimal(0);
  await prisma.organization.update({
    where: { id: orgId },
    data: { creditUsed: newCreditUsed },
  });
  return newCreditUsed;
}
```

- [ ] **Step 4: Exportar desde index**

```ts
// modules/accounts/index.ts
export { createInvoiceFromOrder, markPaid } from './invoices';
export { checkCreditEligibility, recalcCreditUsed } from './credit';
export type { EligibilityResult } from './credit';
```

- [ ] **Step 5: Run tests, see them pass**

- [ ] **Step 6: Commit**

```bash
git add modules/accounts/
git commit -m "feat(accounts): checkCreditEligibility with overdue/exceeded/warn logic"
```

### Task 4.4: Scheduled tasks (mark overdue, send due soon)

**Files:**
- Create: `modules/accounts/scheduled.ts`
- Create: `modules/accounts/__tests__/scheduled.test.ts`
- Create: `scripts/mark-invoices-overdue.ts`
- Create: `scripts/send-invoice-due-soon.ts`

- [ ] **Step 1: Escribir test failing**

```ts
// modules/accounts/__tests__/scheduled.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { markInvoicesOverdue, sendInvoiceDueSoon } from '../scheduled';

beforeEach(async () => {
  await prisma.invoice.deleteMany();
  await prisma.notification.deleteMany();
});

describe('accounts.scheduled', () => {
  it('markInvoicesOverdue transitions PENDING past due to OVERDUE', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'sch-1', creditUsed: 0, paymentTerms: 'NET_30', creditLimit: 10000 } });
    await prisma.invoice.create({
      data: {
        number: 'IN-2026-999990', organizationId: org.id, orderId: 'fake',
        amount: 500, currency: 'USD',
        dueDate: new Date(Date.now() - 86400000), status: 'PENDING',
      } as any,
    });

    const result = await markInvoicesOverdue();
    expect(result.updated).toBe(1);
    const invs = await prisma.invoice.findMany({ where: { organizationId: org.id } });
    expect(invs[0]?.status).toBe('OVERDUE');
  });

  it('sendInvoiceDueSoon notifies 3 days before due', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'sch-2', creditUsed: 0, paymentTerms: 'NET_30', creditLimit: 10000 } });
    const u = await prisma.user.create({ data: { email: 's@s.com', name: 'S' } });
    await prisma.organizationMember.create({ data: { organizationId: org.id, userId: u.id, role: 'OWNER' } });
    const threeDaysFromNow = new Date(Date.now() + 3 * 86400000);
    await prisma.invoice.create({
      data: {
        number: 'IN-2026-999991', organizationId: org.id, orderId: 'fake2',
        amount: 500, currency: 'USD', dueDate: threeDaysFromNow, status: 'PENDING',
      } as any,
    });

    const result = await sendInvoiceDueSoon();
    expect(result.notified).toBeGreaterThanOrEqual(1);
    const notifs = await prisma.notification.findMany({ where: { userId: u.id, type: 'INVOICE_DUE_SOON' } });
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test, see it fail**

- [ ] **Step 3: Implementar `scheduled.ts`**

```ts
// modules/accounts/scheduled.ts
import { prisma } from '@/lib/prisma';
import { dispatch } from '@/modules/notifications';

export async function markInvoicesOverdue(): Promise<{ updated: number }> {
  const result = await prisma.invoice.updateMany({
    where: { status: 'PENDING', dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });

  // Notif para cada uno (preview corto, no detallado)
  if (result.count > 0) {
    const overdueIds = await prisma.invoice.findMany({
      where: { status: 'OVERDUE', dueDate: { lt: new Date(Date.now() - 86400000) } },
      select: { id: true, number: true, organizationId: true, amount: true },
      take: result.count,
    });
    for (const inv of overdueIds) {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: inv.organizationId },
        select: { userId: true },
      });
      await dispatch({
        userIds: members.map(m => m.userId),
        type: 'INVOICE_OVERDUE',
        title: `Factura ${inv.number} vencida`,
        body: `La factura por $${inv.amount.toFixed(2)} está vencida. Por favor coordina el pago.`,
        link: `/invoices/${inv.id}`,
        subjectType: 'INVOICE',
        subjectId: inv.id,
      });
    }
  }

  return { updated: result.count };
}

export async function sendInvoiceDueSoon(): Promise<{ notified: number }> {
  const windowStart = new Date(Date.now() + 2 * 86400000);
  const windowEnd = new Date(Date.now() + 4 * 86400000);

  const candidates = await prisma.invoice.findMany({
    where: { status: 'PENDING', dueDate: { gte: windowStart, lte: windowEnd } },
    select: { id: true, number: true, organizationId: true, amount: true, dueDate: true },
  });

  let notified = 0;
  for (const inv of candidates) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: inv.organizationId },
      select: { userId: true },
    });
    await dispatch({
      userIds: members.map(m => m.userId),
      type: 'INVOICE_DUE_SOON',
      title: `Factura ${inv.number} vence en ~3 días`,
      body: `Recordatorio: factura por $${inv.amount.toFixed(2)} vence el ${inv.dueDate.toISOString().slice(0, 10)}.`,
      link: `/invoices/${inv.id}`,
      subjectType: 'INVOICE',
      subjectId: inv.id,
    });
    notified += members.length;
  }
  return { notified };
}
```

- [ ] **Step 4: Crear scripts ejecutables**

```ts
// scripts/mark-invoices-overdue.ts
import { markInvoicesOverdue } from '@/modules/accounts/scheduled';
import { logger } from '@/lib/logger';

async function main() {
  const result = await markInvoicesOverdue();
  logger.info({ result }, 'mark-invoices-overdue run');
}

main().catch(err => { logger.error({ err }, 'failed'); process.exit(1); });
```

```ts
// scripts/send-invoice-due-soon.ts
import { sendInvoiceDueSoon } from '@/modules/accounts/scheduled';
import { logger } from '@/lib/logger';

async function main() {
  const result = await sendInvoiceDueSoon();
  logger.info({ result }, 'send-invoice-due-soon run');
}

main().catch(err => { logger.error({ err }, 'failed'); process.exit(1); });
```

- [ ] **Step 5: Run tests, see them pass**

- [ ] **Step 6: Commit**

```bash
git add modules/accounts/scheduled.ts modules/accounts/__tests__/scheduled.test.ts scripts/mark-invoices-overdue.ts scripts/send-invoice-due-soon.ts
git commit -m "feat(accounts): scheduled tasks for overdue and due-soon"
```

---

## Parte 5 — Módulo `quotes`

### Task 5.1: Quote submit (DRAFT → SUBMITTED)

**Files:**
- Create: `modules/quotes/service.ts`
- Create: `modules/quotes/numbers.ts`
- Create: `modules/quotes/index.ts`
- Create: `modules/quotes/__tests__/submit.test.ts`

- [ ] **Step 1: Escribir test failing**

```ts
// modules/quotes/__tests__/submit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { addLineToDraft, submit } from '../service';

beforeEach(async () => {
  await prisma.quote.deleteMany();
});

describe('quotes.submit', () => {
  it('creates Quote in DRAFT and adds line, then submits', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'q-1', creditUsed: 0 } });
    const user = await prisma.user.create({ data: { email: 'b@b.com', name: 'B' } });
    await prisma.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: 'BUYER' as any } });
    const category = await prisma.category.create({ data: { name: 'C', slug: 'c-' + Math.random() } });
    const product = await prisma.product.create({ data: { name: 'P', slug: 'p-' + Math.random(), sku: 'SKU1', basePrice: 100, stockQuantity: 50, categoryId: category.id, isActive: true } });

    const draft = await addLineToDraft({ userId: user.id, organizationId: org.id, productId: product.id, qty: 5 });
    expect(draft.status).toBe('DRAFT');

    const submitted = await submit({ quoteId: draft.id, userId: user.id, notes: 'Need urgently' });

    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.number).toMatch(/^QU-2026-\d{6}$/);
    expect(submitted.notes).toBe('Need urgently');
  });

  it('throws if no lines', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'q-2', creditUsed: 0 } });
    const user = await prisma.user.create({ data: { email: 'b2@b.com', name: 'B' } });
    const draft = await prisma.quote.create({
      data: { number: 'temp', organizationId: org.id, requestedById: user.id, status: 'DRAFT', currency: 'USD' },
    });
    await expect(submit({ quoteId: draft.id, userId: user.id })).rejects.toThrow(/no lines/i);
  });
});
```

- [ ] **Step 2: Run test, see it fail**

- [ ] **Step 3: Implementar `numbers.ts`**

```ts
// modules/quotes/numbers.ts
import type { Prisma } from '@prisma/client';

export async function generateQuoteNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('quote_seq'))`);
  const seqResult = await tx.$queryRawUnsafe<{ nextval: bigint }[]>(`SELECT nextval('quote_seq_${year}') AS nextval`);
  const seq = Number(seqResult[0]!.nextval);
  return `QU-${year}-${seq.toString().padStart(6, '0')}`;
}
```

- [ ] **Step 4: Implementar `service.ts` (addLineToDraft + submit)**

```ts
// modules/quotes/service.ts
import { prisma } from '@/lib/prisma';
import type { Quote, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { generateQuoteNumber } from './numbers';
import { dispatch } from '@/modules/notifications';
import { storeConfig } from '@/store.config';

export interface AddLineInput {
  userId: string;
  organizationId: string;
  productId: string;
  qty: number;
}

export async function addLineToDraft(input: AddLineInput): Promise<Quote> {
  return prisma.$transaction(async tx => {
    let draft = await tx.quote.findFirst({
      where: { organizationId: input.organizationId, requestedById: input.userId, status: 'DRAFT' },
    });
    if (!draft) {
      draft = await tx.quote.create({
        data: {
          number: `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, // placeholder; se reemplaza al submit
          organizationId: input.organizationId,
          requestedById: input.userId,
          status: 'DRAFT',
          currency: storeConfig.currency.base,
        },
      });
    }

    const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
    const existingLine = await tx.quoteLine.findFirst({
      where: { quoteId: draft.id, productId: input.productId },
    });

    if (existingLine) {
      await tx.quoteLine.update({
        where: { id: existingLine.id },
        data: { qty: existingLine.qty + input.qty },
      });
    } else {
      await tx.quoteLine.create({
        data: {
          quoteId: draft.id,
          productId: product.id,
          sku: product.sku,
          name: product.name,
          qty: input.qty,
          unitPriceBase: product.basePrice,
        },
      });
    }

    return tx.quote.findUniqueOrThrow({ where: { id: draft.id } });
  });
}

export interface SubmitInput {
  quoteId: string;
  userId: string;
  notes?: string;
}

export async function submit(input: SubmitInput): Promise<Quote> {
  return prisma.$transaction(async tx => {
    const draft = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId }, include: { lines: true } });
    if (draft.status !== 'DRAFT') throw new Error(`Quote ${draft.id} not in DRAFT (status: ${draft.status})`);
    if (draft.requestedById !== input.userId) throw new Error('Not the requester');
    if (draft.lines.length === 0) throw new Error('Quote has no lines');

    const subtotal = draft.lines.reduce((sum, l) => sum.add(l.unitPriceBase.mul(l.qty)), new Decimal(0));
    const number = await generateQuoteNumber(tx);

    const submitted = await tx.quote.update({
      where: { id: draft.id },
      data: {
        number,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        subtotal,
        total: subtotal,
        notes: input.notes ?? null,
      },
    });

    await tx.quoteAuditLog.create({
      data: {
        quoteId: draft.id,
        action: 'submitted',
        actorId: input.userId,
        payload: { lineCount: draft.lines.length, subtotal: subtotal.toString() },
      },
    });

    // Notif a admins de la tienda
    const admins = await tx.user.findMany({ where: { isPlatformAdmin: true }, select: { id: true } });
    await dispatch({
      userIds: admins.map(a => a.id),
      type: 'QUOTE_SUBMITTED',
      title: `Nueva solicitud de cotización ${number}`,
      body: `${input.notes ?? 'Sin notas'} — total estimado $${subtotal.toFixed(2)}`,
      link: `/admin/quotes/${draft.id}`,
      subjectType: 'QUOTE',
      subjectId: draft.id,
    });

    return submitted;
  });
}
```

- [ ] **Step 5: Crear `index.ts`**

```ts
// modules/quotes/index.ts
export { addLineToDraft, submit } from './service';
export type { AddLineInput, SubmitInput } from './service';
```

- [ ] **Step 6: Run tests, see them pass**

- [ ] **Step 7: Commit**

```bash
git add modules/quotes/
git commit -m "feat(quotes): addLineToDraft and submit"
```

### Task 5.2: Quote quote (admin cotiza) + revise

**Files:**
- Modify: `modules/quotes/service.ts`
- Modify: `modules/quotes/index.ts`
- Create: `modules/quotes/__tests__/quote.test.ts`
- Create: `modules/quotes/__tests__/revise.test.ts`

- [ ] **Step 1: Escribir tests failing**

```ts
// modules/quotes/__tests__/quote.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { addLineToDraft, submit, quote } from '../service';

beforeEach(async () => { await prisma.quote.deleteMany(); });

describe('quotes.quote', () => {
  it('transitions SUBMITTED to QUOTED with quoted prices', async () => {
    // Setup buyer + draft + submitted
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'qq-1', creditUsed: 0 } });
    const buyer = await prisma.user.create({ data: { email: 'bq@b.com', name: 'BQ' } });
    await prisma.organizationMember.create({ data: { organizationId: org.id, userId: buyer.id, role: 'BUYER' as any } });
    const admin = await prisma.user.create({ data: { email: 'ad@a.com', name: 'AD', isPlatformAdmin: true } });
    const cat = await prisma.category.create({ data: { name: 'C', slug: 'cq-' + Math.random() } });
    const prod = await prisma.product.create({ data: { name: 'P', slug: 'pq-' + Math.random(), sku: 'SKU2', basePrice: 100, stockQuantity: 50, categoryId: cat.id, isActive: true } });

    const draft = await addLineToDraft({ userId: buyer.id, organizationId: org.id, productId: prod.id, qty: 10 });
    const submitted = await submit({ quoteId: draft.id, userId: buyer.id });
    const lines = await prisma.quoteLine.findMany({ where: { quoteId: submitted.id } });

    const quoted = await quote({
      quoteId: submitted.id,
      adminUserId: admin.id,
      lines: [{ lineId: lines[0]!.id, unitPriceQuoted: 85 }],
      validUntil: new Date('2026-12-31'),
      adminNotes: 'Special discount',
    });

    expect(quoted.status).toBe('QUOTED');
    expect(quoted.adminNotes).toBe('Special discount');
    expect(quoted.total.toString()).toBe('850'); // 85 * 10
  });
});
```

```ts
// modules/quotes/__tests__/revise.test.ts
// similar pattern: setup a QUOTED quote, call revise with new prices, expect revisionCount = 1, lastRevisedAt set, audit log entry
```

- [ ] **Step 2: Run tests, see them fail**

- [ ] **Step 3: Implementar `quote` y `revise`**

```ts
// Append a modules/quotes/service.ts

export interface QuoteInput {
  quoteId: string;
  adminUserId: string;
  lines: Array<{ lineId: string; unitPriceQuoted: number | string }>;
  validUntil: Date;
  adminNotes?: string;
}

export async function quote(input: QuoteInput): Promise<Quote> {
  return prisma.$transaction(async tx => {
    const existing = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId }, include: { lines: true, organization: true } });
    if (existing.status !== 'SUBMITTED') throw new Error(`Quote not in SUBMITTED (status: ${existing.status})`);

    let total = new Decimal(0);
    for (const lineInput of input.lines) {
      const line = existing.lines.find(l => l.id === lineInput.lineId);
      if (!line) throw new Error(`Line ${lineInput.lineId} not found`);
      const price = new Decimal(lineInput.unitPriceQuoted);
      const lineTotal = price.mul(line.qty);
      await tx.quoteLine.update({
        where: { id: line.id },
        data: { unitPriceQuoted: price, lineTotal },
      });
      total = total.add(lineTotal);
    }

    const quoted = await tx.quote.update({
      where: { id: input.quoteId },
      data: {
        status: 'QUOTED',
        quotedAt: new Date(),
        quotedById: input.adminUserId,
        validUntil: input.validUntil,
        adminNotes: input.adminNotes ?? null,
        total,
      },
    });

    await tx.quoteAuditLog.create({
      data: { quoteId: input.quoteId, action: 'quoted', actorId: input.adminUserId, payload: { total: total.toString() } },
    });

    // Notif al buyer
    await dispatch({
      userIds: [existing.requestedById],
      type: 'QUOTE_QUOTED',
      title: `Cotización ${existing.number} lista`,
      body: `Tu cotización fue procesada. Total: $${total.toFixed(2)}. Válida hasta ${input.validUntil.toISOString().slice(0, 10)}.`,
      link: `/quotes/${existing.id}`,
      subjectType: 'QUOTE',
      subjectId: existing.id,
    });

    return quoted;
  });
}

export interface ReviseInput {
  quoteId: string;
  adminUserId: string;
  lines: Array<{ lineId: string; unitPriceQuoted: number | string }>;
  validUntil?: Date;
  adminNotes?: string;
}

export async function revise(input: ReviseInput): Promise<Quote> {
  return prisma.$transaction(async tx => {
    const existing = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId }, include: { lines: true } });
    if (existing.status !== 'QUOTED') throw new Error(`Quote not in QUOTED (status: ${existing.status})`);

    // Snapshot previo en audit log
    const prevSnapshot = existing.lines.map(l => ({ id: l.id, sku: l.sku, qty: l.qty, unitPriceQuoted: l.unitPriceQuoted?.toString(), lineTotal: l.lineTotal.toString() }));

    let total = new Decimal(0);
    for (const lineInput of input.lines) {
      const line = existing.lines.find(l => l.id === lineInput.lineId);
      if (!line) throw new Error(`Line ${lineInput.lineId} not found`);
      const price = new Decimal(lineInput.unitPriceQuoted);
      const lineTotal = price.mul(line.qty);
      await tx.quoteLine.update({ where: { id: line.id }, data: { unitPriceQuoted: price, lineTotal } });
      total = total.add(lineTotal);
    }

    const revised = await tx.quote.update({
      where: { id: input.quoteId },
      data: {
        revisionCount: { increment: 1 },
        lastRevisedAt: new Date(),
        validUntil: input.validUntil ?? existing.validUntil,
        adminNotes: input.adminNotes ?? existing.adminNotes,
        total,
      },
    });

    await tx.quoteAuditLog.create({
      data: { quoteId: input.quoteId, action: 'revised', actorId: input.adminUserId, payload: { previousLines: prevSnapshot, newTotal: total.toString() } },
    });

    await dispatch({
      userIds: [existing.requestedById],
      type: 'QUOTE_REVISED',
      title: `Cotización ${existing.number} actualizada`,
      body: `El equipo revisó tu cotización. Nuevo total: $${total.toFixed(2)}.`,
      link: `/quotes/${existing.id}`,
      subjectType: 'QUOTE',
      subjectId: existing.id,
    });

    return revised;
  });
}
```

- [ ] **Step 4: Exportar**

```ts
// modules/quotes/index.ts
export { addLineToDraft, submit, quote, revise } from './service';
export type { AddLineInput, SubmitInput, QuoteInput, ReviseInput } from './service';
```

- [ ] **Step 5: Run tests, see them pass**

- [ ] **Step 6: Commit**

```bash
git add modules/quotes/
git commit -m "feat(quotes): quote and revise with audit log"
```

### Task 5.3: Quote accept (conversión a Order) + reject

**Files:**
- Create: `modules/quotes/conversion.ts`
- Modify: `modules/quotes/service.ts`
- Modify: `modules/quotes/index.ts`
- Create: `modules/quotes/__tests__/accept.test.ts`
- Create: `modules/quotes/__tests__/conversion.test.ts`

- [ ] **Step 1: Escribir tests failing**

```ts
// modules/quotes/__tests__/conversion.test.ts
// Test cubre el happy path: quote QUOTED → accept → Order CONFIRMED creada con líneas snapshot.
// Test edge: stock cae a 0 entre QUOTED y accept → error, Quote queda QUOTED.
// Test edge: producto desactivado → error.
// Test integration: si feature credit y org NET_TERMS, crea Invoice. Si feature approvals y total > threshold, Order PENDING_APPROVAL.
```

(Por brevedad del plan: implementar 3-4 escenarios cubriendo los casos del flujo 4 del spec.)

- [ ] **Step 2: Implementar `conversion.ts`**

```ts
// modules/quotes/conversion.ts
import { prisma } from '@/lib/prisma';
import type { Order, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { StockInsufficientError, CatalogAccessDeniedError, QuoteExpiredError } from '@/lib/errors';
import { checkCreditEligibility, createInvoiceFromOrder } from '@/modules/accounts';
import { request as requestApproval } from '@/modules/approvals';
import { generateOrderNumber } from '@/modules/orders/numbers'; // de Fase 1
import { isFeatureEnabled } from '@/lib/features';
import { dispatch } from '@/modules/notifications';

export interface ConvertInput {
  quoteId: string;
  userId: string;
  paymentMethod: 'PREPAID' | 'NET_TERMS';
  billingAddressId: string;
  shippingAddressId: string;
}

export async function convertQuoteToOrder(input: ConvertInput): Promise<{ orderId: string; status: string }> {
  return prisma.$transaction(async tx => {
    const quote = await tx.quote.findUniqueOrThrow({
      where: { id: input.quoteId },
      include: { lines: { include: { product: { include: { category: true } } } }, organization: true },
    });

    if (quote.status !== 'QUOTED') throw new Error(`Quote not in QUOTED (status: ${quote.status})`);
    if (quote.validUntil && quote.validUntil < new Date()) throw new QuoteExpiredError(`Quote ${quote.number} expired`);

    // Re-validate stock + isActive + catalog access
    for (const line of quote.lines) {
      if (!line.product.isActive) throw new Error(`Product ${line.sku} is no longer active`);

      // Stock check con FOR UPDATE
      const lockResult = await tx.$queryRawUnsafe<{ stockQuantity: number }[]>(
        `SELECT "stockQuantity" FROM "Product" WHERE id = $1 FOR UPDATE`,
        line.productId,
      );
      const currentStock = lockResult[0]?.stockQuantity ?? 0;
      if (currentStock < line.qty) throw new StockInsufficientError(`Product ${line.sku}: stock ${currentStock} < requested ${line.qty}`);

      // Catalog access (si feature activa)
      if (isFeatureEnabled('privateCatalogs')) {
        if (line.product.isPrivate || line.product.category.isPrivate) {
          const access = await tx.organizationCatalogAccess.findFirst({
            where: {
              organizationId: quote.organizationId,
              OR: [{ productId: line.productId }, { categoryId: line.product.categoryId }],
            },
          });
          if (!access) throw new CatalogAccessDeniedError(`Product ${line.sku} not accessible to your org`);
        }
      }
    }

    // Credit eligibility si NET_TERMS
    if (input.paymentMethod === 'NET_TERMS') {
      if (!isFeatureEnabled('credit')) throw new Error('Credit feature not enabled');
      const eligibility = await checkCreditEligibility(quote.organizationId, quote.total);
      if (!eligibility.eligible) throw new Error(`Credit not eligible: ${eligibility.code} — ${eligibility.message}`);
    }

    // Decrement stock
    for (const line of quote.lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stockQuantity: { decrement: line.qty } },
      });
    }

    // Decide si pasa por aprobación
    const needsApproval = isFeatureEnabled('approvals')
      ? Boolean(quote.organization.approvalThreshold && quote.total.gt(quote.organization.approvalThreshold))
      : false;

    const orderStatus = needsApproval ? 'PENDING_APPROVAL' : 'CONFIRMED';
    const orderNumber = await generateOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        orderNumber,
        organizationId: quote.organizationId,
        placedByUserId: input.userId,
        status: orderStatus,
        confirmedAt: orderStatus === 'CONFIRMED' ? new Date() : null,
        subtotal: quote.total,
        total: quote.total,
        currency: quote.currency,
        paymentMethod: input.paymentMethod,
        billingAddressId: input.billingAddressId,
        shippingAddressId: input.shippingAddressId,
        approvedFromQuote: { connect: { id: quote.id } },
        lines: {
          create: quote.lines.map(l => ({
            productId: l.productId,
            sku: l.sku,
            name: l.name,
            unitPrice: l.unitPriceQuoted ?? l.unitPriceBase,
            quantity: l.qty,
            discountAmount: new Decimal(0), // la negociación ya está en unitPriceQuoted
            lineTotal: l.lineTotal,
          })),
        },
      },
    });

    // Marcar Quote como ACCEPTED
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: 'ACCEPTED',
        decidedAt: new Date(),
        decidedById: input.userId,
        convertedOrderId: order.id,
      },
    });

    await tx.quoteAuditLog.create({
      data: { quoteId: quote.id, action: 'accepted', actorId: input.userId, payload: { orderId: order.id } },
    });

    // Si CONFIRMED y NET_TERMS, crear Invoice ahora
    if (orderStatus === 'CONFIRMED' && input.paymentMethod === 'NET_TERMS') {
      await createInvoiceFromOrder(order.id, tx);
    }

    // Si PENDING_APPROVAL, request approval
    if (needsApproval) {
      await requestApproval({
        organizationId: quote.organizationId,
        subjectType: 'ORDER',
        subjectId: order.id,
        amount: order.total,
        requestedById: input.userId,
      });
    }

    return { orderId: order.id, status: orderStatus };
  });
}
```

- [ ] **Step 3: Implementar `accept` y `reject` en `service.ts`**

```ts
// Append a modules/quotes/service.ts
import { convertQuoteToOrder } from './conversion';

export interface AcceptInput {
  quoteId: string;
  userId: string;
  paymentMethod: 'PREPAID' | 'NET_TERMS';
  billingAddressId: string;
  shippingAddressId: string;
}

export async function accept(input: AcceptInput): Promise<{ orderId: string; status: string }> {
  return convertQuoteToOrder(input);
}

export async function reject(input: { quoteId: string; userId: string }): Promise<Quote> {
  return prisma.$transaction(async tx => {
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId } });
    if (quote.status !== 'QUOTED') throw new Error(`Quote not in QUOTED`);
    if (quote.requestedById !== input.userId) throw new Error('Only the requester can reject');

    const updated = await tx.quote.update({
      where: { id: input.quoteId },
      data: { status: 'REJECTED', decidedAt: new Date(), decidedById: input.userId },
    });

    await tx.quoteAuditLog.create({
      data: { quoteId: input.quoteId, action: 'rejected', actorId: input.userId },
    });

    // Notif al admin de la tienda
    const admins = await tx.user.findMany({ where: { isPlatformAdmin: true }, select: { id: true } });
    await dispatch({
      userIds: admins.map(a => a.id),
      type: 'QUOTE_REJECTED',
      title: `Cotización ${quote.number} rechazada`,
      body: 'El cliente rechazó la cotización.',
      link: `/admin/quotes/${quote.id}`,
      subjectType: 'QUOTE',
      subjectId: quote.id,
    });

    return updated;
  });
}
```

- [ ] **Step 4: Registrar hook ORDER en approvals**

```ts
// En un archivo nuevo: modules/orders/approval-hook.ts
import { subscribe } from '@/modules/approvals';
import { prisma } from '@/lib/prisma';
import { createInvoiceFromOrder } from '@/modules/accounts';
import { restoreStock } from './service'; // función a exponer en Fase 1

subscribe('ORDER', async (req, tx) => {
  if (req.status === 'APPROVED') {
    await tx.order.update({
      where: { id: req.subjectId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    const order = await tx.order.findUniqueOrThrow({ where: { id: req.subjectId } });
    if (order.paymentMethod === 'NET_TERMS') {
      await createInvoiceFromOrder(order.id, tx);
    }
  } else if (req.status === 'REJECTED') {
    const order = await tx.order.findUniqueOrThrow({ where: { id: req.subjectId }, include: { lines: true } });
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledByUserId: req.decidedById },
    });
    // restore stock
    for (const line of order.lines) {
      await tx.product.update({ where: { id: line.productId }, data: { stockQuantity: { increment: line.quantity } } });
    }
  }
});
```

Importar este archivo desde `app/instrumentation.ts` o `lib/init.ts` para asegurar que el hook se registra al boot.

- [ ] **Step 5: Run tests, see them pass**

- [ ] **Step 6: Commit**

```bash
git add modules/quotes/ modules/orders/approval-hook.ts
git commit -m "feat(quotes): accept with conversion to Order + approval hook"
```

### Task 5.4: Quote expire job + draft cleanup

**Files:**
- Create: `modules/quotes/expire.ts`
- Create: `scripts/mark-quotes-expired.ts`
- Create: `scripts/send-quote-expiring-soon.ts`
- Create: `scripts/cleanup-stale-quote-drafts.ts`
- Create: `modules/quotes/__tests__/expire.test.ts`

- [ ] **Step 1: Test failing**

```ts
// modules/quotes/__tests__/expire.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { markExpiredQuotes, sendExpiringSoon } from '../expire';

beforeEach(async () => { await prisma.quote.deleteMany(); });

describe('quotes.markExpiredQuotes', () => {
  it('transitions QUOTED past validUntil to EXPIRED', async () => {
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'qe-1', creditUsed: 0 } });
    const u = await prisma.user.create({ data: { email: 'e@e.com', name: 'E' } });
    await prisma.quote.create({
      data: {
        number: 'QU-2026-999999', organizationId: org.id, requestedById: u.id,
        status: 'QUOTED', validUntil: new Date(Date.now() - 86400000), currency: 'USD',
      },
    });

    const result = await markExpiredQuotes();
    expect(result.updated).toBe(1);
  });
});
```

- [ ] **Step 2: Implementar `expire.ts`**

```ts
// modules/quotes/expire.ts
import { prisma } from '@/lib/prisma';
import { dispatch } from '@/modules/notifications';

export async function markExpiredQuotes(): Promise<{ updated: number }> {
  const candidates = await prisma.quote.findMany({
    where: { status: 'QUOTED', validUntil: { lt: new Date() } },
    select: { id: true, number: true, requestedById: true },
  });

  if (candidates.length === 0) return { updated: 0 };

  await prisma.quote.updateMany({
    where: { id: { in: candidates.map(c => c.id) } },
    data: { status: 'EXPIRED' },
  });

  await prisma.quoteAuditLog.createMany({
    data: candidates.map(c => ({ quoteId: c.id, action: 'expired', payload: { auto: true } })),
  });

  for (const c of candidates) {
    await dispatch({
      userIds: [c.requestedById],
      type: 'QUOTE_EXPIRING',
      title: `Cotización ${c.number} venció`,
      body: 'La cotización pasó su fecha de validez. Puedes solicitar una nueva.',
      link: `/quotes/${c.id}`,
      subjectType: 'QUOTE',
      subjectId: c.id,
    });
  }

  return { updated: candidates.length };
}

export async function sendExpiringSoon(): Promise<{ notified: number }> {
  const windowStart = new Date(Date.now() + 2 * 86400000);
  const windowEnd = new Date(Date.now() + 4 * 86400000);

  const candidates = await prisma.quote.findMany({
    where: { status: 'QUOTED', validUntil: { gte: windowStart, lte: windowEnd } },
    select: { id: true, number: true, requestedById: true, validUntil: true },
  });

  for (const c of candidates) {
    await dispatch({
      userIds: [c.requestedById],
      type: 'QUOTE_EXPIRING',
      title: `Cotización ${c.number} vence en ~3 días`,
      body: `Tu cotización vence el ${c.validUntil!.toISOString().slice(0, 10)}. Acéptala antes para asegurar los precios.`,
      link: `/quotes/${c.id}`,
      subjectType: 'QUOTE',
      subjectId: c.id,
    });
  }

  return { notified: candidates.length };
}

export async function cleanupStaleDrafts(daysOld = 30): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - daysOld * 86400000);
  const result = await prisma.quote.deleteMany({
    where: { status: 'DRAFT', updatedAt: { lt: cutoff } },
  });
  return { deleted: result.count };
}
```

- [ ] **Step 3: Crear 3 scripts ejecutables**

Análogos a `scripts/retry-failed-notifications.ts` — un archivo por función.

- [ ] **Step 4: Run tests, see them pass**

- [ ] **Step 5: Commit**

```bash
git add modules/quotes/expire.ts modules/quotes/__tests__/expire.test.ts scripts/mark-quotes-expired.ts scripts/send-quote-expiring-soon.ts scripts/cleanup-stale-quote-drafts.ts
git commit -m "feat(quotes): scheduled tasks for expire, expiring-soon, draft cleanup"
```

---

## Parte 6 — Extensión `catalog` (privacidad)

### Task 6.1: filterForOrg

**Files:**
- Create: `modules/catalog/visibility.ts`
- Modify: `modules/catalog/index.ts`
- Modify: `modules/catalog/service.ts`
- Create: `modules/catalog/__tests__/visibility.test.ts`

- [ ] **Step 1: Test failing**

```ts
// modules/catalog/__tests__/visibility.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { filterForOrg } from '../visibility';

beforeEach(async () => {
  await prisma.organizationCatalogAccess.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
});

describe('catalog.filterForOrg', () => {
  it('shows all public products+categories', async () => {
    const cat = await prisma.category.create({ data: { name: 'Public', slug: 'pub-' + Math.random(), isPrivate: false } });
    const p = await prisma.product.create({ data: { name: 'P', slug: 'pp-' + Math.random(), sku: 'X1', basePrice: 10, stockQuantity: 5, isActive: true, categoryId: cat.id, isPrivate: false } });
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'v1', creditUsed: 0 } });

    const result = await filterForOrg(org.id, [p]);
    expect(result.map(x => x.id)).toContain(p.id);
  });

  it('hides private products without grant', async () => {
    const cat = await prisma.category.create({ data: { name: 'C', slug: 'pub2-' + Math.random(), isPrivate: false } });
    const p = await prisma.product.create({ data: { name: 'Priv', slug: 'priv-' + Math.random(), sku: 'X2', basePrice: 10, stockQuantity: 5, isActive: true, categoryId: cat.id, isPrivate: true } });
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'v2', creditUsed: 0 } });

    const result = await filterForOrg(org.id, [{ ...p, category: cat }] as any);
    expect(result.length).toBe(0);
  });

  it('shows private product to org with explicit grant', async () => {
    const admin = await prisma.user.create({ data: { email: 'g@g.com', name: 'G', isPlatformAdmin: true } });
    const cat = await prisma.category.create({ data: { name: 'C', slug: 'pub3-' + Math.random(), isPrivate: false } });
    const p = await prisma.product.create({ data: { name: 'Priv2', slug: 'priv2-' + Math.random(), sku: 'X3', basePrice: 10, stockQuantity: 5, isActive: true, categoryId: cat.id, isPrivate: true } });
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'v3', creditUsed: 0 } });
    await prisma.organizationCatalogAccess.create({ data: { organizationId: org.id, productId: p.id, grantedById: admin.id } });

    const result = await filterForOrg(org.id, [{ ...p, category: cat }] as any);
    expect(result.length).toBe(1);
  });

  it('null orgId (anonymous) sees only fully public items', async () => {
    const cat = await prisma.category.create({ data: { name: 'PrivCat', slug: 'pc-' + Math.random(), isPrivate: true } });
    const p = await prisma.product.create({ data: { name: 'P', slug: 'pp2-' + Math.random(), sku: 'X4', basePrice: 10, stockQuantity: 5, isActive: true, categoryId: cat.id, isPrivate: false } });
    const result = await filterForOrg(null, [{ ...p, category: cat }] as any);
    expect(result.length).toBe(0); // categoría privada bloquea producto público
  });
});
```

- [ ] **Step 2: Implementar `visibility.ts`**

```ts
// modules/catalog/visibility.ts
import { prisma } from '@/lib/prisma';
import type { Product, Category } from '@prisma/client';
import { isFeatureEnabled } from '@/lib/features';

type ProductWithCategory = Product & { category: Pick<Category, 'id' | 'isPrivate'> };

export async function filterForOrg<T extends ProductWithCategory>(orgId: string | null, products: T[]): Promise<T[]> {
  if (!isFeatureEnabled('privateCatalogs')) return products;

  if (orgId === null) {
    return products.filter(p => !p.isPrivate && !p.category.isPrivate);
  }

  const [productAccess, categoryAccess] = await Promise.all([
    prisma.organizationCatalogAccess.findMany({
      where: { organizationId: orgId, productId: { not: null } },
      select: { productId: true },
    }),
    prisma.organizationCatalogAccess.findMany({
      where: { organizationId: orgId, categoryId: { not: null } },
      select: { categoryId: true },
    }),
  ]);

  const productIds = new Set(productAccess.map(a => a.productId!));
  const categoryIds = new Set(categoryAccess.map(a => a.categoryId!));

  return products.filter(p => {
    if (p.isPrivate) return productIds.has(p.id);
    if (p.category.isPrivate) return categoryIds.has(p.category.id) || productIds.has(p.id);
    return true;
  });
}

export interface GrantAccessInput {
  organizationId: string;
  productId?: string;
  categoryId?: string;
  grantedById: string;
}

export async function grantAccess(input: GrantAccessInput): Promise<void> {
  if (Boolean(input.productId) === Boolean(input.categoryId)) {
    throw new Error('Exactly one of productId or categoryId required');
  }
  await prisma.organizationCatalogAccess.upsert({
    where: input.productId
      ? { organizationId_productId: { organizationId: input.organizationId, productId: input.productId } }
      : { organizationId_categoryId: { organizationId: input.organizationId, categoryId: input.categoryId! } },
    create: {
      organizationId: input.organizationId,
      productId: input.productId ?? null,
      categoryId: input.categoryId ?? null,
      grantedById: input.grantedById,
    },
    update: {}, // upsert no-op si existe
  });
}

export async function revokeAccess(input: Omit<GrantAccessInput, 'grantedById'>): Promise<void> {
  await prisma.organizationCatalogAccess.deleteMany({
    where: {
      organizationId: input.organizationId,
      productId: input.productId,
      categoryId: input.categoryId,
    },
  });
}
```

- [ ] **Step 3: Exportar desde `catalog/index.ts`**

```ts
// Append a modules/catalog/index.ts
export { filterForOrg, grantAccess, revokeAccess } from './visibility';
```

- [ ] **Step 4: Aplicar filter en catalog/service.ts queries de storefront**

(Buscar funciones como `listProducts`, `getProductBySlug` y aplicar `filterForOrg` antes de retornar.)

- [ ] **Step 5: Run tests, see them pass**

- [ ] **Step 6: Commit**

```bash
git add modules/catalog/
git commit -m "feat(catalog): private products and categories with org access whitelist"
```

---

## Parte 7 — Extensión `pricing` (volumen)

### Task 7.1: ProductPriceTier CRUD

**Files:**
- Create: `modules/pricing/tiers.ts`
- Modify: `modules/pricing/index.ts`
- Create: `modules/pricing/__tests__/tiers.test.ts`

- [ ] **Step 1: Test failing — CRUD operations + uniqueness**

(Test creating tiers, listing for product, validating minQty unique, updating, deleting.)

- [ ] **Step 2: Implementar `tiers.ts`**

```ts
// modules/pricing/tiers.ts
import { prisma } from '@/lib/prisma';
import type { ProductPriceTier } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface TierInput {
  productId: string;
  minQty: number;
  unitPrice: number | string | Decimal;
}

export async function upsertTier(input: TierInput): Promise<ProductPriceTier> {
  if (input.minQty <= 0) throw new Error('minQty must be > 0');
  const price = new Decimal(input.unitPrice);
  if (price.lte(0)) throw new Error('unitPrice must be > 0');

  return prisma.productPriceTier.upsert({
    where: { productId_minQty: { productId: input.productId, minQty: input.minQty } },
    create: { productId: input.productId, minQty: input.minQty, unitPrice: price },
    update: { unitPrice: price },
  });
}

export async function listTiersForProduct(productId: string): Promise<ProductPriceTier[]> {
  return prisma.productPriceTier.findMany({
    where: { productId },
    orderBy: { minQty: 'asc' },
  });
}

export async function deleteTier(id: string): Promise<void> {
  await prisma.productPriceTier.delete({ where: { id } });
}
```

- [ ] **Step 3: Exportar**

```ts
// modules/pricing/index.ts (append)
export { upsertTier, listTiersForProduct, deleteTier } from './tiers';
```

- [ ] **Step 4: Run tests, see them pass**

- [ ] **Step 5: Commit**

```bash
git add modules/pricing/
git commit -m "feat(pricing): ProductPriceTier CRUD"
```

### Task 7.2: resolveForOrg con volume tiers

**Files:**
- Modify: `modules/pricing/service.ts`
- Modify: `modules/pricing/__tests__/resolve.test.ts`

- [ ] **Step 1: Test failing — resolve returns `{ unitPrice, discountAmount }`**

```ts
// modules/pricing/__tests__/resolve.test.ts (extender existente)
it('returns base price with discount=0 when no tiers match qty', async () => {
  // setup org + product (con basePrice 100) + tier minQty 100 → unitPrice 80
  // call resolveForOrg(orgId, productId, qty=10) → expect unitPrice 100, discountAmount 0
});

it('returns tier discount when qty matches', async () => {
  // qty=120 → tier (minQty 100, unitPrice 80) aplica → discountAmount = (100-80)*120 = 2400
});

it('uses CustomerPrice as base when set', async () => {
  // CustomerPrice = 90, tier (100, 80). qty=120 → unitPrice=90, discountAmount=(90-80)*120 = 1200
});

it('discountAmount = 0 if tier price >= unitPrice', async () => {
  // CustomerPrice = 70 (cheaper than tier 80). qty=120 → unitPrice=70, discountAmount=0
});
```

- [ ] **Step 2: Refactor `resolveForOrg`**

```ts
// modules/pricing/service.ts (modificar firma + lógica)
import { Decimal } from '@prisma/client/runtime/library';
import { isFeatureEnabled } from '@/lib/features';

export interface ResolvedPrice {
  unitPrice: Decimal;
  discountAmount: Decimal;
}

export async function resolveForOrg(orgId: string, productId: string, qty: number): Promise<ResolvedPrice> {
  const [product, customerPrice] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: productId } }),
    prisma.customerPrice.findUnique({
      where: { organizationId_productId: { organizationId: orgId, productId } },
    }),
  ]);

  const unitPrice: Decimal = customerPrice?.price ?? product.basePrice;
  let discountAmount = new Decimal(0);

  if (isFeatureEnabled('volumeDiscounts')) {
    const tier = await prisma.productPriceTier.findFirst({
      where: { productId, minQty: { lte: qty } },
      orderBy: { minQty: 'desc' },
    });

    if (tier && tier.unitPrice.lt(unitPrice)) {
      const savings = unitPrice.sub(tier.unitPrice);
      discountAmount = savings.mul(qty);
    }
  }

  return { unitPrice, discountAmount };
}
```

- [ ] **Step 3: Actualizar callers (cart, checkout) para usar la nueva firma**

(Búsqueda y replace en `modules/cart/`, `app/(storefront)/checkout/`. Por brevedad del plan: cada caller actualiza para guardar ambos campos en snapshots.)

- [ ] **Step 4: Run tests, see them pass**

- [ ] **Step 5: Commit**

```bash
git add modules/pricing/
git commit -m "feat(pricing): resolveForOrg returns unitPrice + discountAmount with volume tiers"
```

### Task 7.3: Cart re-snapshot al cambiar qty

**Files:**
- Modify: `modules/cart/service.ts`
- Modify: `modules/cart/__tests__/`

- [ ] **Step 1: Test — al actualizar qty de CartItem, se re-evalúa pricing y se snapshot `discountAmountSnapshot`**

- [ ] **Step 2: Implementar — el `updateQty` action llama `pricing.resolveForOrg(...)` y persiste ambos campos**

- [ ] **Step 3: Verificar tests pasan, commit**

```bash
git add modules/cart/
git commit -m "feat(cart): re-snapshot discountAmount on qty change"
```

---

## Parte 8 — Extensión `orders` (paymentMethod + approval status)

### Task 8.1: Order creation con paymentMethod y approval routing

**Files:**
- Modify: `modules/orders/service.ts`
- Modify: `modules/orders/index.ts`

- [ ] **Step 1: Test — flujo cart → order con paymentMethod NET_TERMS + threshold excedido → PENDING_APPROVAL**

- [ ] **Step 2: Modificar `createOrderFromCart` en service.ts**

Agregar:
- `paymentMethod` param y persistencia.
- Si feature `credit` y NET_TERMS: llamar `checkCreditEligibility` antes; throw si no eligible.
- Si feature `approvals` y total > threshold: status `PENDING_APPROVAL`, NO crear Invoice ni incrementar creditUsed; llamar `approvals.request`.
- Si CONFIRMED y NET_TERMS: crear Invoice (que incrementa creditUsed).

- [ ] **Step 3: Exponer `restoreStock`**

```ts
// modules/orders/index.ts (append)
export { restoreStock } from './service';
```

`restoreStock(orderId, tx)` recorre líneas y hace `Product.stockQuantity += quantity`. Usado por approval reject hook.

- [ ] **Step 4: Run tests, commit**

```bash
git add modules/orders/
git commit -m "feat(orders): paymentMethod + approval routing + restoreStock export"
```

---

## Parte 9 — Storefront UI: cotizaciones

### Task 9.1: `/quotes` inbox del buyer

**Files:**
- Create: `app/(storefront)/quotes/page.tsx`
- Create: `app/(storefront)/quotes/_components/QuoteCard.tsx`

- [ ] **Step 1: RSC que lista quotes del buyer con filtro por estado**

```tsx
// app/(storefront)/quotes/page.tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertFeature } from '@/lib/features';
import { notFound } from 'next/navigation';
import { QuoteCard } from './_components/QuoteCard';

export const dynamic = 'force-dynamic';

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  try { assertFeature('rfq'); } catch { notFound(); }

  const session = await auth();
  if (!session?.user?.id || !session.activeOrgId) notFound();

  const { status } = await searchParams;
  const where: any = { organizationId: session.activeOrgId, requestedById: session.user.id };
  if (status) where.status = status;

  const quotes = await prisma.quote.findMany({
    where,
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Mis cotizaciones</h1>
      <nav className="flex gap-2 mb-4" aria-label="Filtros">
        <a href="/quotes" className="px-3 py-1 rounded border">Todas</a>
        <a href="/quotes?status=SUBMITTED" className="px-3 py-1 rounded border">Enviadas</a>
        <a href="/quotes?status=QUOTED" className="px-3 py-1 rounded border">Cotizadas</a>
        <a href="/quotes?status=ACCEPTED" className="px-3 py-1 rounded border">Aceptadas</a>
        <a href="/quotes?status=REJECTED" className="px-3 py-1 rounded border">Rechazadas</a>
      </nav>
      {quotes.length === 0 ? (
        <p className="text-gray-600">No tienes cotizaciones todavía.</p>
      ) : (
        <ul className="space-y-3">
          {quotes.map(q => (
            <li key={q.id}><QuoteCard quote={q} /></li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Crear `QuoteCard.tsx`**

(Componente simple con número, estado badge, total, validUntil, link a detalle.)

- [ ] **Step 3: Render test mínimo (Vitest + RTL si configurado, o skip si E2E suficiente)**

- [ ] **Step 4: Commit**

```bash
git add app/\(storefront\)/quotes/
git commit -m "feat(storefront): /quotes inbox page"
```

### Task 9.2: `/quotes/draft` builder

**Files:**
- Create: `app/(storefront)/quotes/draft/page.tsx`
- Create: `app/(storefront)/quotes/_actions.ts`
- Create: `app/(storefront)/quotes/_components/DraftLines.tsx`

- [ ] **Step 1: RSC que carga el DRAFT actual del buyer con server actions inline para edit/submit**

(UI: tabla de líneas con qty editable, sumario, botón "Enviar solicitud" → server action submit.)

- [ ] **Step 2: Server actions en `_actions.ts`**

```ts
'use server';
import { auth } from '@/lib/auth';
import { addLineToDraft, submit } from '@/modules/quotes';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertFeature } from '@/lib/features';

export async function submitDraftAction(formData: FormData) {
  assertFeature('rfq');
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const quoteId = formData.get('quoteId') as string;
  const notes = formData.get('notes') as string | null;
  const submitted = await submit({ quoteId, userId: session.user.id, notes: notes ?? undefined });
  revalidatePath('/quotes');
  redirect(`/quotes/${submitted.id}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(storefront\)/quotes/
git commit -m "feat(storefront): /quotes/draft builder with submit action"
```

### Task 9.3: `/quotes/[id]` view + accept/reject

**Files:**
- Create: `app/(storefront)/quotes/[id]/page.tsx`
- Create: `app/(storefront)/quotes/[id]/AcceptModal.tsx`

- [ ] **Step 1: RSC con vista completa de la cotización según estado**

(Para QUOTED: tabla de líneas con precios cotizados, total, validUntil, adminNotes, dos botones grandes Aceptar/Rechazar. Aceptar abre modal con selección de paymentMethod + addresses.)

- [ ] **Step 2: AcceptModal.tsx (client component)**

(Form con select de billing/shipping address de la org + radio buttons PREPAID/NET_TERMS — el último solo si feature credit y org tiene paymentTerms != PREPAID.)

- [ ] **Step 3: Server actions accept y reject**

(Llamar `quotes.accept` o `quotes.reject` con validación de userId.)

- [ ] **Step 4: Commit**

```bash
git add app/\(storefront\)/quotes/\[id\]/
git commit -m "feat(storefront): /quotes/[id] view with accept/reject"
```

---

## Parte 10 — Storefront UI: invoices, approvals, notifications

### Task 10.1: `/invoices` (list + detail)

**Files:**
- Create: `app/(storefront)/invoices/page.tsx`
- Create: `app/(storefront)/invoices/[id]/page.tsx`

- [ ] **Step 1: RSC con tabla de invoices de la org actual + filtro por estado**

- [ ] **Step 2: Detail page con info read-only**

- [ ] **Step 3: Verificar feature flag `credit` aplica**

- [ ] **Step 4: Commit**

```bash
git add app/\(storefront\)/invoices/
git commit -m "feat(storefront): /invoices list and detail"
```

### Task 10.2: `/approvals` inbox y detalle

**Files:**
- Create: `app/(storefront)/approvals/page.tsx`
- Create: `app/(storefront)/approvals/[id]/page.tsx`
- Create: `app/(storefront)/approvals/_actions.ts`

- [ ] **Step 1: RSC que verifica `canApprove(userId, activeOrgId)` antes de renderizar — si no, notFound**

- [ ] **Step 2: Lista de PENDING approvals con quick approve/reject inline (form action)**

- [ ] **Step 3: Detail con textarea reason + decisión**

- [ ] **Step 4: Server actions `approveAction(formData)` y `rejectAction(formData)`**

(Llaman `approvals.decide` con validación de canApprove.)

- [ ] **Step 5: Commit**

```bash
git add app/\(storefront\)/approvals/
git commit -m "feat(storefront): /approvals inbox and detail with actions"
```

### Task 10.3: `/notifications` inbox

**Files:**
- Create: `app/(storefront)/notifications/page.tsx`
- Create: `app/(storefront)/notifications/_actions.ts`

- [ ] **Step 1: RSC con lista cronológica + toggle "solo no leídas"**

- [ ] **Step 2: Server actions markAllAsRead + markAsRead(id)**

- [ ] **Step 3: Commit**

```bash
git add app/\(storefront\)/notifications/
git commit -m "feat(storefront): /notifications inbox"
```

### Task 10.4: Header con notification bell badge

**Files:**
- Modify: `components/layout/Header.tsx`
- Create: `components/layout/NotificationBadge.tsx`

- [ ] **Step 1: NotificationBadge — RSC que llama `countUnread(userId)` y renderiza icon + badge**

```tsx
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { countUnread } from '@/modules/notifications';

export async function NotificationBadge() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const count = await countUnread(session.user.id);
  return (
    <Link href="/notifications" aria-label={`Notificaciones (${count} no leídas)`} className="relative inline-flex items-center">
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1 min-w-[1rem] text-center" aria-hidden>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Incluir en Header**

- [ ] **Step 3: Commit**

```bash
git add components/layout/
git commit -m "feat(layout): notification bell badge in header"
```

---

## Parte 11 — Storefront UI: updates a catalog/products/cart/checkout/orders

### Task 11.1: `/catalog` — botón RFQ + badges

**Files:**
- Modify: `app/(storefront)/catalog/page.tsx`
- Modify: components de ProductCard

- [ ] **Step 1: Agregar botón secundario "Solicitar cotización" si `features.rfq`**

- [ ] **Step 2: Badge "Privado" si `product.isPrivate` y feature activa**

- [ ] **Step 3: Badge "Descuentos por volumen" si producto tiene tiers**

- [ ] **Step 4: Server action `addToQuoteDraftAction(productId, qty)` → llama `quotes.addLineToDraft`**

- [ ] **Step 5: Commit**

```bash
git add app/\(storefront\)/catalog/
git commit -m "feat(storefront): catalog RFQ button and feature badges"
```

### Task 11.2: `/products/[slug]` — tier table + private indicator

**Files:**
- Modify: `app/(storefront)/products/[slug]/page.tsx`

- [ ] **Step 1: Mostrar tabla de tiers si producto tiene y feature volumeDiscounts**

- [ ] **Step 2: Botón RFQ si feature rfq**

- [ ] **Step 3: Badge privado sutil si aplica**

- [ ] **Step 4: Commit**

```bash
git add app/\(storefront\)/products/
git commit -m "feat(storefront): product detail with tier table and RFQ"
```

### Task 11.3: `/cart` — discount visualization

**Files:**
- Modify: `app/(storefront)/cart/page.tsx`

- [ ] **Step 1: Mostrar discountAmountSnapshot por línea cuando > 0**

- [ ] **Step 2: Mensaje "Estás ahorrando $X por volumen" en summary**

- [ ] **Step 3: Warning visible cuando qty cambia y discount cae (handled by re-snapshot in pricing)**

- [ ] **Step 4: Commit**

```bash
git add app/\(storefront\)/cart/
git commit -m "feat(storefront): cart discount visualization"
```

### Task 11.4: `/checkout` step 2 — Net 30 selector

**Files:**
- Modify: `app/(storefront)/checkout/step-2/page.tsx`
- Modify: `app/(storefront)/checkout/_actions.ts`

- [ ] **Step 1: Si feature credit y org tiene paymentTerms != PREPAID, mostrar opción Net 30**

- [ ] **Step 2: Server-side checkCreditEligibility al seleccionar — bloquear con mensaje claro si no eligible**

- [ ] **Step 3: Si elegida, persistir paymentMethod en state intermedio del checkout (DB o cookie)**

- [ ] **Step 4: Commit**

```bash
git add app/\(storefront\)/checkout/
git commit -m "feat(checkout): Net 30 payment method selector with eligibility"
```

### Task 11.5: `/checkout` step 4 — approval banner

**Files:**
- Modify: `app/(storefront)/checkout/step-4/page.tsx`
- Modify: `app/(storefront)/checkout/_actions.ts`

- [ ] **Step 1: RSC calcula si total > org.approvalThreshold y muestra banner amarillo**

- [ ] **Step 2: Server action de confirm pasa por approvals.request si aplica → redirect a /orders/[id] con status PENDING_APPROVAL**

- [ ] **Step 3: Commit**

```bash
git add app/\(storefront\)/checkout/
git commit -m "feat(checkout): approval banner and routing on confirm"
```

### Task 11.6: `/orders/[id]` — re-order button + approval status

**Files:**
- Modify: `app/(storefront)/orders/[id]/page.tsx`
- Modify: `app/(storefront)/orders/[id]/_actions.ts`

- [ ] **Step 1: Banner amarillo si status PENDING_APPROVAL con info de aprobadores y tiempo en espera**

- [ ] **Step 2: Botón "Re-ordenar" siempre visible si status CONFIRMED/SHIPPED/DELIVERED**

- [ ] **Step 3: Server action reorderAction(orderId) → recorrer líneas, validar stock+isActive+catalog access, agregar al carrito; report de items descartados**

- [ ] **Step 4: Bloque "Facturación" con link a invoice si existe**

- [ ] **Step 5: Commit**

```bash
git add app/\(storefront\)/orders/
git commit -m "feat(storefront): order detail with re-order and approval status"
```

---

## Parte 12 — Admin UI

### Task 12.1: `/admin/quotes` lista + detalle (builder)

**Files:**
- Create: `app/admin/quotes/page.tsx`
- Create: `app/admin/quotes/[id]/page.tsx`
- Create: `app/admin/quotes/_actions.ts`

- [ ] **Step 1: Lista filtrable con tabla densa**

- [ ] **Step 2: Builder con inputs por línea (unitPriceQuoted), validUntil date picker, adminNotes textarea, audit log timeline sidebar**

- [ ] **Step 3: Server actions quoteAction (cotizar) y reviseAction**

- [ ] **Step 4: Commit**

```bash
git add app/admin/quotes/
git commit -m "feat(admin): quotes list and builder"
```

### Task 12.2: `/admin/invoices` + `/admin/approvals`

**Files:**
- Create: `app/admin/invoices/page.tsx`
- Create: `app/admin/invoices/[id]/page.tsx`
- Create: `app/admin/invoices/_actions.ts`
- Create: `app/admin/approvals/page.tsx`

- [ ] **Step 1: /admin/invoices lista con tab "Vencidas" destacado**

- [ ] **Step 2: /admin/invoices/[id] detalle con botón "Marcar como pagada" → modal con paidNote**

- [ ] **Step 3: /admin/approvals vista global de todas las approvals (read-only para platform admin)**

- [ ] **Step 4: Commit**

```bash
git add app/admin/invoices/ app/admin/approvals/
git commit -m "feat(admin): invoices and approvals views"
```

### Task 12.3: Customer settings tabs (crédito, aprobaciones, catalog access)

**Files:**
- Modify: `app/admin/customers/[id]/layout.tsx`
- Create: `app/admin/customers/[id]/credit/page.tsx`
- Create: `app/admin/customers/[id]/credit/_actions.ts`
- Create: `app/admin/customers/[id]/approvals/page.tsx`
- Create: `app/admin/customers/[id]/approvals/_actions.ts`
- Create: `app/admin/customers/[id]/catalog-access/page.tsx`
- Create: `app/admin/customers/[id]/catalog-access/_actions.ts`

- [ ] **Step 1: Layout con sidebar de tabs**

- [ ] **Step 2: Tab Crédito: form con creditLimit + paymentTerms + read-only creditUsed + invoices recientes + botón "Recalcular"**

- [ ] **Step 3: Tab Aprobaciones: form con approvalThreshold + multi-select approvalRoles**

- [ ] **Step 4: Tab Catalog Access: dos secciones (productos privados con acceso + categorías), multi-select para grant, lista actual con botón revoke**

- [ ] **Step 5: Server actions correspondientes (update org, grant/revoke access)**

- [ ] **Step 6: Commit**

```bash
git add app/admin/customers/
git commit -m "feat(admin): customer settings tabs for credit, approvals, catalog access"
```

### Task 12.4: Product/Category settings (isPrivate + tiers)

**Files:**
- Modify: `app/admin/products/[id]/page.tsx`
- Modify: `app/admin/products/[id]/_actions.ts`
- Modify: `app/admin/categories/page.tsx`

- [ ] **Step 1: Tab "Visibilidad" en product con toggle isPrivate + contador de orgs con acceso**

- [ ] **Step 2: Tab "Precios por volumen" con CRUD inline de ProductPriceTier**

- [ ] **Step 3: En /admin/categories, toggle isPrivate por categoría**

- [ ] **Step 4: Server actions: toggleProductPrivacy, upsertTier, deleteTier, toggleCategoryPrivacy**

- [ ] **Step 5: Commit**

```bash
git add app/admin/products/ app/admin/categories/
git commit -m "feat(admin): product and category visibility settings + tiers"
```

### Task 12.5: Admin dashboard widgets

**Files:**
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Agregar widgets arriba del dashboard según features activas**

```tsx
// Pseudo-code
const widgets = [];
if (isFeatureEnabled('rfq')) widgets.push(<QuotesWidget pending={await countSubmittedQuotes()} />);
if (isFeatureEnabled('credit')) widgets.push(<OverdueInvoicesWidget count={await countOverdueInvoices()} />);
if (isFeatureEnabled('approvals')) widgets.push(<PendingApprovalsWidget count={await countPendingApprovals()} />);
```

- [ ] **Step 2: Cada widget con link a la página correspondiente y conteo destacado**

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat(admin): dashboard widgets for Phase 2 features"
```

---

## Parte 13 — Seed + datos demo

### Task 13.1: Extender prisma/seed.ts con datos Fase 2

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Activar todas las features en store.config.ts del template seed**

- [ ] **Step 2: Setear Acme (org demo de Fase 1) con creditLimit=20000, paymentTerms=NET_30, approvalThreshold=5000**

- [ ] **Step 3: Crear 1 producto privado y 1 categoría privada; grantear Acme acceso**

- [ ] **Step 4: Crear ProductPriceTier para 1 producto: minQty 10 → 90, minQty 50 → 80, minQty 100 → 70 (sobre basePrice 100)**

- [ ] **Step 5: Crear 1 invoice DEMO en estado PENDING para demostrar flujo**

- [ ] **Step 6: Run `pnpm db:reset && pnpm db:seed` y verificar manualmente**

- [ ] **Step 7: Commit**

```bash
git add prisma/seed.ts store.config.ts
git commit -m "feat(seed): demo data for Phase 2 features"
```

---

## Parte 14 — E2E tests

### Task 14.1: E2E RFQ end-to-end

**Files:**
- Create: `e2e/quotes-rfq.spec.ts`

- [ ] **Step 1: Test Playwright: buyer logueado en Acme entra a /catalog → click "Solicitar cotización" en 2 productos → /quotes/draft → submit con notas → /quotes/[id] muestra SUBMITTED**

- [ ] **Step 2: En otra session admin en /admin/quotes/[id] → cotizar con precios → save**

- [ ] **Step 3: Buyer recarga /quotes/[id] → ve QUOTED → click Aceptar → modal con NET_TERMS + addresses → confirm → redirect a /orders/[orderId]**

- [ ] **Step 4: Verificar orden CONFIRMED + Invoice creada**

- [ ] **Step 5: Commit**

```bash
git add e2e/quotes-rfq.spec.ts
git commit -m "test(e2e): RFQ end-to-end happy path"
```

### Task 14.2: E2E approval flow

**Files:**
- Create: `e2e/approvals.spec.ts`

- [ ] **Step 1: Buyer hace orden de $10k (excede threshold $5k de Acme) en checkout normal**

- [ ] **Step 2: Confirma → redirect a /orders/[id] con banner PENDING_APPROVAL**

- [ ] **Step 3: Otra session de owner de Acme → /approvals → ve la solicitud → click Aprobar → submit**

- [ ] **Step 4: Buyer recarga /orders/[id] → ve CONFIRMED + Invoice (si NET_TERMS)**

- [ ] **Step 5: Commit**

```bash
git add e2e/approvals.spec.ts
git commit -m "test(e2e): approval flow"
```

### Task 14.3: E2E credit flow

**Files:**
- Create: `e2e/credit.spec.ts`

- [ ] **Step 1: Admin marca invoice DEMO de seed como OVERDUE manualmente (script)**

- [ ] **Step 2: Buyer intenta checkout NET_TERMS → bloqueado con mensaje "Tienes facturas vencidas"**

- [ ] **Step 3: Admin marca invoice como PAID → buyer reintenta → pasa**

- [ ] **Step 4: Test caso CREDIT_EXCEEDED: agregar items hasta exceder limit**

- [ ] **Step 5: Commit**

```bash
git add e2e/credit.spec.ts
git commit -m "test(e2e): credit Net 30 flow"
```

---

## Parte 15 — Documentación

### Task 15.1: ADRs (5 archivos)

**Files:**
- Create: `docs/adr/0010-rfq-hybrid-workflow.md`
- Create: `docs/adr/0011-approval-engine-genericity.md`
- Create: `docs/adr/0012-credit-net30-model.md`
- Create: `docs/adr/0013-volume-pricing-via-discount-amount.md`
- Create: `docs/adr/0014-notifications-dispatcher.md`

- [ ] **Step 1: Cada ADR sigue template estándar: Context, Decision, Consequences, Alternatives considered**

- [ ] **Step 2: Commit**

```bash
git add docs/adr/
git commit -m "docs(adr): 0010-0014 for Phase 2 architectural decisions"
```

### Task 15.2: Runbooks (5 archivos)

**Files:**
- Create: `docs/runbooks/quotes.md`
- Create: `docs/runbooks/credit-net30.md`
- Create: `docs/runbooks/approvals.md`
- Create: `docs/runbooks/notifications.md`
- Create: `docs/runbooks/phase-2-rollback.md`

- [ ] **Step 1: Cada runbook cubre: troubleshooting común, comandos útiles, queries SQL de soporte, escalation path**

- [ ] **Step 2: phase-2-rollback.md específico: pasos para revertir migrations + feature flags off**

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/
git commit -m "docs(runbooks): Phase 2 operational guides"
```

---

## Parte 16 — Accessibility audit

### Task 16.1: WCAG 2.1 AA audit en pantallas nuevas

**Files:**
- Reports temporales en `docs/audits/`

- [ ] **Step 1: Invocar skill `design:accessibility-review` con lista de URLs nuevas**

- [ ] **Step 2: Fix issues encontradas (contraste, ARIA, focus order, etc.)**

- [ ] **Step 3: Re-run audit hasta pasar**

- [ ] **Step 4: Commit fixes**

```bash
git add .
git commit -m "fix(a11y): WCAG 2.1 AA compliance for Phase 2 screens"
```

---

## Parte 17 — Release

### Task 17.1: Verificación final CI

- [ ] **Step 1: Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`**

Expected: todo verde.

- [ ] **Step 2: Verificar coverage en módulos nuevos >= 80%**

Run: `pnpm test --coverage`
Inspect: coverage de modules/quotes, modules/accounts, modules/approvals, modules/notifications.

### Task 17.2: Update CLAUDE.md y ROADMAP.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `ROADMAP.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json` (version 2.0.0)

- [ ] **Step 1: Marcar Fase 2 cerrada en CLAUDE.md sección "Estado actual"**

- [ ] **Step 2: Marcar Fase 2 cerrada en ROADMAP.md tabla**

- [ ] **Step 3: CHANGELOG entry v2.0.0 con resumen de features**

- [ ] **Step 4: package.json version → "2.0.0"**

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md ROADMAP.md CHANGELOG.md package.json
git commit -m "chore: bump version to 2.0.0 and update docs"
```

### Task 17.3: PR, merge, tag, deploy

- [ ] **Step 1: Push branch + crear PR**

```bash
git push -u origin feature/fase-2-especializacion-b2b
gh pr create --base main --title "Phase 2 — B2B Specialization" --body "..."
```

- [ ] **Step 2: CI verde → squash merge**

```bash
gh pr merge --squash --delete-branch
```

- [ ] **Step 3: Pull main + tag**

```bash
git checkout main && git pull
git tag -a v2.0.0 -m "Phase 2: B2B specialization"
git push origin v2.0.0
```

- [ ] **Step 4: GitHub Release**

```bash
gh release create v2.0.0 --title "v2.0.0 — Phase 2: B2B Specialization" --notes-file CHANGELOG-v2.0.0.md
```

- [ ] **Step 5: Verificar Coolify auto-deploy en push del tag**

Esperar 3-5 min, curl `/api/health` y `/api/version` (si existe).

- [ ] **Step 6: Notificar al user en Cowork: "Fase 2 cerrada v2.0.0, deployed. Lista para brainstorm Fase 3."**

---

## Self-Review (corre antes de cerrar)

**1. Spec coverage:** Cada requisito del spec tiene tarea correspondiente:
- ✅ RFQ híbrido → Parte 5
- ✅ Net 30 / crédito → Parte 4 + UI en Parte 10/11
- ✅ Catálogos privados → Parte 6 + Admin en Parte 12.3/12.4
- ✅ Aprobaciones internas → Parte 3 + UI en Parte 10.2
- ✅ Descuentos por volumen → Parte 7 + UI en Parte 11.2/11.3
- ✅ Re-orden rápido → Parte 11.6 (botón en /orders/[id])
- ✅ Notificaciones in-app + email → Parte 2 + Parte 10.3/10.4
- ✅ Feature flags → Task 1.4
- ✅ Schema completo → Parte 1
- ✅ Migrations + SQL custom → Tasks 1.2, 1.3
- ✅ Scheduled tasks → Tasks 2.4, 4.4, 5.4
- ✅ E2E happy paths → Parte 14
- ✅ ADRs + runbooks → Parte 15
- ✅ Accessibility → Parte 16
- ✅ Release → Parte 17

**2. Placeholder scan:** Sin "TODO" o "implement later". Algunas tasks de UI tienen "(por brevedad)" — esos detalles los completa el implementador siguiendo el patrón establecido en Fase 1, y los tests E2E (Parte 14) son la red de seguridad funcional.

**3. Type consistency:**
- `dispatch(input: DispatchInput)` consistente en notifications.
- `request(input: RequestInput)` y `decide(input: DecideInput)` consistentes en approvals.
- `createInvoiceFromOrder(orderId, tx?)` y `markPaid(input)` consistentes en accounts.
- `addLineToDraft`, `submit`, `quote`, `revise`, `accept`, `reject` consistentes en quotes.
- `resolveForOrg(orgId, productId, qty): ResolvedPrice` con shape `{ unitPrice, discountAmount }` usado en cart, checkout, orders.
- `filterForOrg(orgId, products)` consistente en catalog.

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-05-26-fase-2-especializacion-b2b-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Cowork dispatches a fresh subagent per task, review between tasks, fast iteration. Mejor para iteración técnica en Cowork.

**2. Inline Execution (CC handoff)** — Pasa el plan completo a Claude Code CLI para ejecutar en una sesión continua siguiendo el patrón de Fase 1. CC implementa task by task con TDD, commits frecuentes, y reporta al cerrar bloques mayores.

**Recomendación:** Dado el workflow Cowork+CC del proyecto (Cowork planifica, CC implementa), la opción 2 es la natural. CC lee CLAUDE.md, este plan, y el spec, y procede con la implementación. Reviews en Cowork al cerrar partes mayores (después de Parte 5, después de Parte 12, antes de release).
