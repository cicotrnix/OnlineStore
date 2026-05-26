# Spec — Fase 2: Especialización B2B

> Estado: **DRAFT (pendiente review)**
> Versión: rev. 1
> Autor: Cowork brainstorm (2026-05-26)
> Tag objetivo: `v2.0.0`
> Branch: `feature/fase-2-especializacion-b2b`

## Resumen ejecutivo

Fase 2 transforma el commerce core de Fase 1 en una plataforma B2B especializada. Agrega seis features (RFQ, crédito Net 30, catálogos privados, aprobaciones internas, descuentos por volumen, re-orden rápido) y un sistema de notificaciones in-app + email que las soporta. Todas las features son opt-in por tienda a través de `store.config.ts` para mantener la naturaleza multi-tenant de la plantilla.

Las seis features se entregan en un solo ciclo (v2.0.0), siguiendo el approach híbrido de modularización: cuatro módulos nuevos (`quotes`, `accounts`, `approvals`, `notifications`) y extensiones a los módulos existentes `catalog` y `pricing` de Fase 1.

## Objetivos

1. Permitir cotizaciones formales (RFQ) antes de la orden, con un flujo híbrido: una vuelta principal con capacidad de revisión por parte del admin.
2. Habilitar compra a crédito (Net 30/60) con tracking de invoices, vencimientos y bloqueo automático cuando hay deuda vencida o se excede el límite.
3. Restringir visibilidad de productos y categorías por organización compradora.
4. Introducir aprobaciones internas tipo "threshold simple" para órdenes/cotizaciones que exceden un monto configurable por org.
5. Aplicar descuentos por volumen vía tiers por producto, integrados con el sistema de precios por cliente de Fase 1.
6. Acelerar compras recurrentes con un botón "Re-ordenar" en órdenes pasadas.
7. Notificar eventos clave por email (Resend) e in-app (inbox + badge en header).
8. Mantener el patrón multi-tenant: cada feature se activa por tienda a través de flags en `store.config.ts`.

**Fuera de scope explícito (diferido a fases posteriores):**

- CSV upload de pedidos, quick-add por SKU en vista lista, plantillas guardadas (re-orden rápido avanzado) → Fase 2.1+ si hay demanda.
- Generación PDF de invoices, recordatorios automáticos completos de pago, integración accounting (QuickBooks/Xero) → Fase 5 (integraciones externas).
- Aprobaciones multi-nivel o workflow configurable por org → Fase 2.x si hay demanda.
- Negociación multi-ronda formal con historial de versiones visible al buyer → Fase 5 si hay demanda.
- SSE/WebSocket realtime para notificaciones → Fase 4 (IA aplicada) si vale la pena.
- Tier de volumen por categoría o por monto de orden total → Fase 2.x si hay demanda.

## Stack y decisiones heredadas

- Next.js 14 App Router, RSC + server actions como patrón principal (ADR 0007).
- TypeScript estricto (`noUncheckedIndexedAccess: true`).
- Prisma 6 + PostgreSQL 16 con pgvector (de Fase 0).
- Auth.js v5 + Resend magic links.
- Decimal(12, 2) global para money (lib/money.ts).
- Biome (lint), Vitest (unit/integration, fileParallelism: false), Playwright (e2e).
- Hetzner VPS CX33 + Coolify.
- Módulos cerrados con `index.ts` como única API pública.

## Decisiones de diseño (resumen)

| Tema | Decisión | Justificación |
|------|----------|---------------|
| Scope de entrega | Las 6 features + notificaciones en v2.0.0 | Un solo ciclo, análogo a Fase 1 |
| RFQ workflow | Híbrido (una vuelta con revisión por admin) | Cubre 95% de casos B2B reales sin la complejidad de versiones formales |
| Crédito Net 30 | Nivel medio: credit + invoices + vencimientos + bloqueo, sin PDF auto | Cierra el ciclo financiero útil sin entrar a integraciones externas |
| Aprobaciones internas | Threshold simple por org | Suficiente para 80% de orgs; multi-nivel se difiere |
| Catálogos privados | Producto + categoría con override producto | Cubre tanto productos privados sueltos como catálogos completos restringidos |
| Descuentos por volumen | Tiers por producto sobre CustomerPrice (Fase 1) | Patrón B2B más común; combina limpio con custom pricing |
| Re-orden rápido | Solo botón en orden pasada | Mayor ROI sin distraer en complejidad de CSV/templates |
| Notificaciones | Email (Resend) + in-app básico (badge + inbox) | Cobertura completa sin entrar a realtime |
| Multi-tenant config | Todas opt-in via flags en `store.config.ts` | Coherente con la naturaleza de plantilla |
| Arquitectura | Approach C — Híbrido | 4 módulos nuevos + 2 extensiones; balance cohesión/granularidad |

## Arquitectura de módulos

### Nuevos

#### `modules/quotes`

Gestiona el ciclo de vida completo de una cotización (RFQ) y su conversión a orden.

- **Lifecycle:** `DRAFT → SUBMITTED → QUOTED → ACCEPTED | REJECTED | EXPIRED`.
- **Revisión:** el admin puede revisar una cotización en `QUOTED`. La operación sobreescribe líneas/términos, incrementa `revisionCount`, escribe `QuoteAuditLog` con el snapshot anterior y notifica al buyer. No genera nueva versión visible al buyer.
- **Conversión:** al aceptar, transacción atómica con stock decrement + Order create + Invoice create (si NET_TERMS y CONFIRMED) + Quote.update con `convertedOrderId`.
- **Numeración:** secuencia Postgres por año (`quote_seq_{year}`) con `pg_advisory_xact_lock` (mismo patrón que `order_seq_{year}` de Fase 1).
- **Audit log:** cada cambio de estado y revisión genera una entrada `QuoteAuditLog` con `payload` (JSON snapshot del estado previo). Para auditoría interna del admin.

#### `modules/accounts`

Gestiona crédito comercial (Net 15/30/60) e invoices generadas a partir de órdenes a crédito.

- **Modelo:** `creditLimit` y `paymentTerms` por organización; `Invoice` por cada Order a crédito. `creditUsed` cached pero recalculable.
- **Estados Invoice:** `PENDING → PAID | OVERDUE | CANCELLED`. Transitions:
  - `PENDING → PAID`: admin marca manualmente con `paidNote`.
  - `PENDING → OVERDUE`: scheduled task diaria cuando `dueDate < now()`.
  - `PENDING|OVERDUE → CANCELLED`: cuando la Order asociada se cancela.
- **Checkout gate:** función pura `checkCreditEligibility(orgId, cartTotal)` retorna `{ eligible: boolean, reason?: string }`. Se ejecuta en step 2 (selector de pago) y se re-valida en step 4 (confirm) bajo `SELECT FOR UPDATE` de la org.
- **Numeración Invoice:** secuencia Postgres por año (`invoice_seq_{year}`), mismo patrón.

#### `modules/approvals`

Workflow engine genérico para aprobaciones internas de una organización compradora. Diseñado para ser re-usable en flujos futuros (cancelaciones, refunds).

- **Modelo:** `ApprovalRequest` con `subjectType` (`ORDER | QUOTE`), `subjectId`, `amount`, `threshold` (snapshot del threshold de la org), `status` (`PENDING → APPROVED | REJECTED`).
- **API pública del módulo:**
  - `request({ subjectType, subjectId, amount, requestedById, organizationId })`: valida `amount > org.approvalThreshold`; si sí, crea ApprovalRequest. Retorna el id o `null` si no requiere aprobación.
  - `decide({ requestId, action, decidedById, reason })`: idempotente; actualiza status `WHERE status = PENDING`; ejecuta hook subscribido al subjectType.
  - `subscribe(subjectType, handler)`: registra handlers que se ejecutan al APPROVED y REJECTED.
- **Hooks de Fase 2 (solo ORDER):**
  - `subscribe('ORDER', ...)` en `modules/orders`: APPROVED → Order.update CONFIRMED + Invoice create si NET_TERMS. REJECTED → Order.update CANCELLED + stock restore + creditUsed liberado si aplica.
  - El valor `QUOTE` del enum `ApprovalSubject` queda reservado para uso futuro (aprobación interna ANTES de que la cotización vaya al buyer, escenario distinto al de Fase 2). No se implementa hook para QUOTE en v2.0.0.
- **Roles aprobadores:** `org.approvalRoles` (default `[OWNER, ADMIN]`). El módulo expone `canApprove(userId, orgId)` consultado por server actions.

#### `modules/notifications`

Sistema de notificaciones in-app + email (Resend).

- **Modelo:** tabla `Notification` con `userId`, `type` (enum exhaustivo), `subjectType`, `subjectId`, `title`, `body`, `link`, `readAt`, `emailSentAt`.
- **Dispatcher:**
  - `notify({ userIds, type, subject, title, body, link })`: insert masivo en `Notification` + envío email Resend en background. Si Resend falla, `emailSentAt` queda null y `emailFailedReason` guarda el motivo.
- **Templates email (en `lib/email/templates/`):** uno por tipo de notificación, soporta variables interpoladas. Renderiza con templates JSX simples (Resend `react-email`).
- **Inbox:** `/notifications` muestra cronológico con toggle "solo no leídas". Badge en header polled cada 60s vía RSC re-fetch.
- **Retry job:** `scripts/retry-failed-notifications.ts` corre cada 5 min, reintenta hasta 5 veces, marca `emailFailedReason` definitivo.

### Extensiones

#### `modules/catalog`

- Nuevas columnas: `Product.isPrivate: boolean`, `Category.isPrivate: boolean`.
- Nueva tabla pivot: `OrganizationCatalogAccess` con XOR constraint (`productId` o `categoryId`, no ambos).
- Nueva función pública: `catalog.filterForOrg(orgId, items)` aplica visibilidad. Producto privado override visibilidad de categoría.
- Admin storefront: si `isPlatformAdmin`, no aplica filtro en `/admin/products` (admin ve todo). En storefront aplica siempre.
- Producto privado no accesible → 404 silencioso (no spoiler).

#### `modules/pricing`

- Nueva tabla: `ProductPriceTier` con `productId`, `minQty`, `unitPrice`.
- Extensión de `pricing.resolveForOrg(orgId, productId, qty)` retorna `{ unitPrice: Decimal, discountAmount: Decimal }`:
  1. `unitPrice` ← CustomerPrice (de Fase 1) si existe; si no, `Product.basePrice`.
  2. Si feature `volumeDiscounts` y existen `ProductPriceTier` con `minQty ≤ qty` → tomar el tier con `minQty` más alto que califique como `tierPrice`. `discountAmount = (unitPrice - tierPrice) * qty` si `tierPrice < unitPrice` (no aplicar si tier es más caro que el unitPrice del cliente).
  3. Si no aplica tier → `discountAmount = 0`.
- Aprovecha `OrderLine.discountAmount` ya reservado en Fase 1 para capturar la línea de "descuento por volumen": el `unitPrice` mantiene el precio del cliente (CustomerPrice o base), y `discountAmount` refleja el ahorro por volumen. `lineTotal = (unitPrice * qty) - discountAmount`.
- Cart re-snapshot al cambiar qty para reflejar tier actualizado. Warning visible: "Precio actualizado por cambio de cantidad".

## Modelo de datos (schema Prisma)

### Nuevos modelos

```prisma
model Quote {
  id              String       @id @default(cuid())
  number          String       @unique                         // QU-YYYY-NNNNNN, formato análogo a OrderNumber de Fase 1
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

enum QuoteStatus {
  DRAFT
  SUBMITTED
  QUOTED
  ACCEPTED
  REJECTED
  EXPIRED
}

model Invoice {
  id              String        @id @default(cuid())
  number          String        @unique                         // IN-YYYY-NNNNNN, formato análogo a OrderNumber de Fase 1
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
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([organizationId, status])
  @@index([dueDate, status])
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

model ApprovalRequest {
  id              String          @id @default(cuid())
  organizationId  String
  organization    Organization    @relation(fields: [organizationId], references: [id])
  subjectType     ApprovalSubject
  subjectId       String
  requestedById   String
  requestedBy     User            @relation("ApprovalRequester", fields: [requestedById], references: [id])
  threshold       Decimal         @db.Decimal(12, 2)
  amount          Decimal         @db.Decimal(12, 2)
  status          ApprovalStatus  @default(PENDING)
  decidedById     String?
  decidedBy       User?           @relation("ApprovalDecider", fields: [decidedById], references: [id])
  decidedAt       DateTime?
  reason          String?         @db.Text
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([organizationId, status])
  @@index([subjectType, subjectId])
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

model Notification {
  id              String              @id @default(cuid())
  userId          String
  user            User                @relation(fields: [userId], references: [id])
  type            NotificationType
  subjectType     String?
  subjectId       String?
  title           String
  body            String              @db.Text
  link            String?
  readAt          DateTime?
  emailSentAt     DateTime?
  emailFailedReason String?
  createdAt       DateTime            @default(now())

  @@index([userId, readAt])
  @@index([createdAt])
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

enum ApprovalRole {
  OWNER
  ADMIN
}
```

### Extensiones a modelos existentes

```prisma
model Organization {
  // ... campos existentes
  creditLimit       Decimal?       @db.Decimal(12, 2)
  creditUsed        Decimal        @db.Decimal(12, 2) @default(0)
  paymentTerms      PaymentTerms   @default(PREPAID)
  approvalThreshold Decimal?       @db.Decimal(12, 2)
  approvalRoles     ApprovalRole[] @default([OWNER, ADMIN])
  invoices          Invoice[]
  quotes            Quote[]
  approvalRequests  ApprovalRequest[]
  catalogAccess     OrganizationCatalogAccess[]
}

model Product {
  // ... campos existentes
  isPrivate     Boolean             @default(false)
  priceTiers    ProductPriceTier[]
  catalogAccess OrganizationCatalogAccess[]
}

model Category {
  // ... campos existentes
  isPrivate     Boolean             @default(false)
  catalogAccess OrganizationCatalogAccess[]
}

model Order {
  // ... campos existentes
  paymentMethod PaymentMethod @default(PREPAID)  // Snapshot del método elegido en checkout
  invoice       Invoice?
  // OrderStatus enum extendido con PENDING_APPROVAL (ver migration 4)
}

enum PaymentMethod {
  PREPAID          // Pago anticipado (mismo flujo de Fase 1)
  NET_TERMS        // Crédito según Organization.paymentTerms (NET_15/30/60)
}
```

### SQL custom (migration manual)

```sql
-- Sequences por año para Quote e Invoice
CREATE SEQUENCE IF NOT EXISTS quote_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_seq_2026 START 1;

-- XOR constraint en OrganizationCatalogAccess
ALTER TABLE "OrganizationCatalogAccess"
  ADD CONSTRAINT "exactly_one_target" CHECK (
    (product_id IS NOT NULL AND category_id IS NULL) OR
    (product_id IS NULL AND category_id IS NOT NULL)
  );
```

## Flujos clave

### Flujo 1 — RFQ end-to-end (camino feliz)

1. Buyer en `/catalog` → click "Solicitar cotización" en card → drawer con qty + nota → confirma. Sistema agrega línea al Quote DRAFT del buyer (uno por org activa).
2. Buyer en `/quotes/draft` → revisa items → "Enviar solicitud". Transacción: status `SUBMITTED`, asigna number via `quote_seq_2026`, subtotal snapshot, audit log `submitted`, notification `QUOTE_SUBMITTED` a OWNER/ADMIN de la tienda.
3. Admin en `/admin/quotes/[id]` → ajusta `unitPriceQuoted` por línea, fija `validUntil`, escribe `adminNotes` → "Cotizar y enviar". Transacción: status `QUOTED`, audit log `quoted`, notification `QUOTE_QUOTED` al buyer.
4. Buyer en `/quotes/[id]` → ve cotización con precios finales → "Aceptar". Pasa al flujo 4 (conversión).
5. Camino alternativo "revisar": admin en `/admin/quotes/[id]` en estado `QUOTED` → "Revisar cotización" → edita → "Reenviar revisada". Transacción: líneas sobreescritas, `revisionCount++`, audit log `revised` con payload anterior, notification `QUOTE_REVISED` al buyer. Status sigue `QUOTED`.
6. Expiración: scheduled task daily a las 02:00 UTC busca Quotes en `QUOTED` con `validUntil < now()`, las marca `EXPIRED`, audit log, notification al buyer. 3 días antes manda `QUOTE_EXPIRING` (warning).

### Flujo 2 — Aprobación interna

1. Buyer en `/checkout` step 4 → "Confirmar orden". Total = $15,000. Org.approvalThreshold = $10,000.
2. Transacción de creación de orden: Order created con status `PENDING_APPROVAL`, stock reservado, `approvals.request({ subjectType: ORDER, subjectId, amount, requestedById })`. ApprovalRequest creada con snapshot del threshold. Notification `APPROVAL_REQUESTED` a usuarios con role en `org.approvalRoles`.
3. Buyer redirigido a `/orders/[id]` con banner "Esperando aprobación".
4. Approver en `/approvals/[id]` → ve detalle, decide. Transacción de approve: ApprovalRequest.status = APPROVED `WHERE status = PENDING`, hook ejecuta Order.update → CONFIRMED + Invoice create si NET_TERMS. Notification `APPROVAL_GRANTED` al solicitante.
5. Si rechaza: ApprovalRequest.status = REJECTED, hook ejecuta Order.update → CANCELLED + stock restore. Notification `APPROVAL_REJECTED` con reason.
6. Idempotencia: doble click del approver, segundo intento ve `status != PENDING`, retorna decisión existente sin re-ejecutar hook.

### Flujo 3 — Credit check en checkout

1. Buyer en `/checkout` step 2 (billing) → ve opción "Crédito (Net 30)" si feature `credit` activa y org.paymentTerms != PREPAID.
2. Click en Net 30 → server action ejecuta `checkCreditEligibility(orgId, cartTotal)`:
   - Check A: cualquier Invoice con `status: OVERDUE` para la org → bloquea con error y link a `/invoices`.
   - Check B: `creditAvailable = creditLimit - creditUsed`. Si `cartTotal > creditAvailable` → bloquea con cifra disponible. Notification `CREDIT_BLOCKED`.
   - Check C (soft): `cartTotal + creditUsed > creditLimit * 0.8` → permite, warning amarillo, notification `CREDIT_LIMIT_WARNING` (rate-limited 1/semana por user).
3. Buyer continúa a step 4 → "Confirmar orden". Transacción:
   - Re-valida credit con `SELECT FOR UPDATE` sobre Organization.
   - Si feature `approvals` y total > threshold → Order.status = `PENDING_APPROVAL`, NO crea Invoice todavía, NO incrementa creditUsed.
   - Si no requiere aprobación → Order.status = `CONFIRMED`, crea Invoice con `dueDate = now() + paymentTerms days`, incrementa `creditUsed`. Notification `INVOICE_DUE_SOON` al admin.
4. Pago manual: admin en `/admin/invoices/[id]` → "Marcar como pagada" → modal con `paidNote` → confirma. Transacción: `Invoice.status = PAID`, `paidAt`, `paidById`, decrementa `creditUsed`. Notification `INVOICE_PAID` al buyer.
5. Cron diaria 02:15 UTC: scheduled task busca Invoices `PENDING` con `dueDate < now()`, marca `OVERDUE`, notifications a buyer y admin. 3 días antes manda `INVOICE_DUE_SOON` (warning).

### Flujo 4 — Conversión Quote → Order

Llamado desde flujo 1 step 4. Transacción atómica:

1. Re-valida stock actual de cada `QuoteLine` (`SELECT FOR UPDATE` en `Product.stockQuantity`).
2. Re-valida que `Product.isActive = true` para todos los productos.
3. Re-valida acceso de la org al producto si `isPrivate` (catalog access vigente).
4. Si feature `credit` y el buyer eligió NET_TERMS al aceptar → corre `checkCreditEligibility`.
5. Si feature `approvals` y total > threshold → crea Order con `PENDING_APPROVAL`, request approval. Quote.status = ACCEPTED igual.
6. Si todo OK sin approval → Order con status `CONFIRMED`, líneas snapshot desde QuoteLine: `OrderLine.unitPrice = QuoteLine.unitPriceQuoted`, `OrderLine.discountAmount = 0` (la negociación con admin ya está reflejada en `unitPriceQuoted`). Stock decrement, Invoice create si NET_TERMS, Quote.update con `convertedOrderId`, `decidedAt`, `decidedById`.
7. Audit log `accepted`, notifications, redirige a `/orders/[id]`.

Si cualquier paso falla, rollback completo y Quote queda en `QUOTED`. UI muestra el error específico.

### Flujo 5 — Catalog visibility

Cada query a catalog en storefront pasa por `catalog.filterForOrg(orgId, items)`:

1. Si feature `privateCatalogs` apagada → retorna items sin filtrar.
2. Si `orgId == null` (visitante anónimo) → retorna solo items donde ambos producto y categoría son públicos.
3. Pre-carga `allowedProductIds` y `allowedCategoryIds` desde `OrganizationCatalogAccess` para la org.
4. Aplica regla por item:
   - Producto público + categoría pública → visible.
   - Producto privado → visible si org tiene acceso al producto.
   - Producto público en categoría privada → visible si org tiene acceso a categoría O al producto.
   - Producto privado en categoría privada → visible si org tiene acceso al producto.
5. Acceso denegado → 404 silencioso. No spoiler "existe pero no puedes verlo".
6. Admin con `isPlatformAdmin` en rutas admin: bypassa el filtro y ve todo.

### Flujo 6 — Volume pricing

1. Buyer agrega item al carrito con qty 50.
2. Server action ejecuta `pricing.resolveForOrg(orgId, productId, 50)` → retorna `{ unitPrice, discountAmount }`:
   - `unitPrice` ← CustomerPrice si existe, sino `Product.basePrice`.
   - Si feature `volumeDiscounts` y hay tier aplicable a qty 50 → `discountAmount = (unitPrice - tierPrice) * 50` (si tier es menor que unitPrice).
   - Sino → `discountAmount = 0`.
3. Snapshot de ambos campos en CartItem (`unitPriceSnapshot` y un nuevo `discountAmountSnapshot`). Re-evalúa al cambiar qty.
4. Si cambia qty a 20 (cae de tier 50+ a tier 10-49) → re-snapshot, warning visible "Precio actualizado por cambio de cantidad".
5. UI en `/products/[slug]` muestra tabla de tiers si aplicable.
6. En checkout step 4, snapshot final se copia a `OrderLine.unitPrice` y `OrderLine.discountAmount`. `lineTotal = (unitPrice * qty) - discountAmount`.
7. Migración menor a CartItem: agregar `discountAmountSnapshot Decimal @db.Decimal(12, 2) @default(0)`.

## UI/UX

### Storefront — nuevas pantallas

- `/quotes` — inbox de cotizaciones del buyer, filtros por estado.
- `/quotes/draft` — builder del DRAFT actual con líneas editables.
- `/quotes/[id]` — ver cotización en cualquier estado; acciones según estado.
- `/invoices` — lista de invoices de la org actual (solo si NET_TERMS).
- `/invoices/[id]` — detalle de invoice (read-only para buyer).
- `/approvals` — inbox de aprobaciones pendientes (solo si user en `approvalRoles`).
- `/approvals/[id]` — detalle + aprobar/rechazar con reason.
- `/notifications` — inbox cronológico de notifications.

### Storefront — pantallas modificadas

- `/catalog` — botón secundario "Solicitar cotización" en cards/filas (si `rfq`); badge "Privado" / "Volumen" en cards aplicables.
- `/products/[slug]` — bloque "Precios por volumen" si tiers aplican; precio reactivo a qty.
- `/cart` — indicador "Estás ahorrando $X por volumen"; warning de precio actualizado al cambiar qty.
- `/checkout` step 2 — opción "Crédito (Net 30)" si aplica; estados deshabilitados con explicación si bloqueado.
- `/checkout` step 4 — banner amarillo "requiere aprobación" si total > threshold.
- `/orders/[id]` — botón "Re-ordenar"; banner si `PENDING_APPROVAL`; bloque "Facturación" con link a invoice.
- Header — campana con badge unread count.

### Admin — nuevas pantallas

- `/admin/quotes` — lista filtrable de todas las cotizaciones.
- `/admin/quotes/[id]` — builder con líneas, términos, audit log timeline.
- `/admin/invoices` — vista global con tab "Vencidas" destacado.
- `/admin/invoices/[id]` — detalle + "Marcar como pagada".
- `/admin/approvals` — vista platform admin de todas las aprobaciones (monitoring).
- `/admin/customers/[id]/credit` — settings de crédito por org.
- `/admin/customers/[id]/approvals` — threshold + roles aprobadores.
- `/admin/customers/[id]/catalog-access` — gestión de whitelist por org.

### Admin — pantallas modificadas

- `/admin` dashboard — widgets nuevos arriba: cotizaciones pendientes, invoices vencidas, aprobaciones pendientes.
- `/admin/products/[id]` — tab "Visibilidad" (toggle `isPrivate`) + tab "Precios por volumen" (CRUD de tiers).
- `/admin/categories` — toggle `isPrivate`.
- `/admin/customers/[id]` — layout con sidebar tabs: General, Members, Addresses, **Crédito**, **Aprobaciones**, **Acceso a catálogo**, Precios.

### Accesibilidad y responsive

- WCAG 2.1 AA obligatorio en cada pantalla nueva. Audit con `design:accessibility-review` antes de PR.
- Mobile-first responsive. Pantallas densas (`/admin/quotes/[id]`) priorizan desktop pero responsive con stacking.
- Loading + empty states con skeleton consistente con Fase 1.
- Sin animaciones pesadas (memoria de proyecto): solo microinteracciones funcionales con Tailwind transitions.

## Feature flags (`store.config.ts`)

```ts
features: {
  rfq: boolean,             // Quote workflow + UIs de cotización
  credit: boolean,          // Net 30 + invoices + bloqueo
  approvals: boolean,       // Threshold internal approval
  privateCatalogs: boolean, // isPrivate + OrganizationCatalogAccess
  volumeDiscounts: boolean, // ProductPriceTier resolution
  // notifications NO es opt-in — siempre activa porque otros módulos dependen
}
```

Cada feature consulta su flag en server actions / RSC layer. UX de feature apagada:

- **RSC pages feature-específicas** (ej: `/quotes`, `/invoices`, `/approvals`): si el flag está off, retornan `notFound()` (Next.js 404).
- **Server actions feature-específicas**: throw `FeatureDisabledError` con code `FEATURE_DISABLED`; UI muestra mensaje "Esta funcionalidad no está habilitada para tu tienda".
- **UIs compartidas** (catalog, cart, checkout): los elementos asociados a la feature (botón "Solicitar cotización", opción "Net 30", banner aprobación, tabla volumen) se renderizan condicionalmente — `if (features.X)`.
- **Admin**: secciones del menú lateral (Cotizaciones, Invoices, Aprobaciones globales) se renderizan según flags. Settings de cliente (tabs Crédito, Aprobaciones, Acceso a catálogo) se ocultan si su feature respectiva está off.

**Tienda demo (seed):** todas las features activas para validar end-to-end.

## Error handling

### Custom error classes

```ts
class CreditExceededError extends Error { code = 'CREDIT_EXCEEDED' }
class InvoicesOverdueError extends Error { code = 'INVOICES_OVERDUE' }
class StockInsufficientError extends Error { code = 'STOCK_INSUFFICIENT' }
class ApprovalAlreadyDecidedError extends Error { code = 'APPROVAL_ALREADY_DECIDED' }
class QuoteExpiredError extends Error { code = 'QUOTE_EXPIRED' }
class CatalogAccessDeniedError extends Error { code = 'CATALOG_ACCESS_DENIED' }
class FeatureDisabledError extends Error { code = 'FEATURE_DISABLED' }
```

UI mapea códigos a mensajes localizables (sistema i18n diferido, pero los códigos están estables).

### Validación Zod (server actions)

- `Quote.submit`: al menos 1 línea con qty > 0; notas ≤ 2000 chars.
- `Quote.quote`: unitPriceQuoted > 0 por línea; validUntil > now(); adminNotes ≤ 5000 chars.
- `ApprovalRequest.decide`: reason ≤ 1000 chars; action ∈ {APPROVED, REJECTED}.
- `Invoice.markPaid`: paidNote ≤ 500 chars; paidAt ≥ issuedAt.
- `ProductPriceTier upsert`: minQty > 0; unitPrice > 0; unique (productId, minQty).
- `OrganizationCatalogAccess.grant`: producto/categoría existe y `isPrivate = true`; exactly one of (productId, categoryId).

### Transactional integrity

Todas las operaciones cross-entity envueltas en `prisma.$transaction`:

- `Quote.accept` → Order.create + stock decrement + Invoice.create (si aplica) + Quote.update — atómico.
- `ApprovalRequest.decide(APPROVED)` → ApprovalRequest.update + hook subject — atómico, con WHERE `status = PENDING` para idempotencia.
- `Invoice.markPaid` → Invoice.update + creditUsed decrement — atómico.

## Edge cases y race conditions

| Escenario | Resolución |
|-----------|------------|
| Stock cae a 0 entre QUOTED y aceptación | Flujo 4 step 1 detecta y bloquea; Quote queda QUOTED para revisión |
| Cambio de creditLimit durante checkout | Re-lectura con `SELECT FOR UPDATE` en step 4; error si excede |
| Producto cae a privado entre add-to-cart y checkout | Validar en step 4; remover línea + warning; redirigir a /catalog si carrito vacío |
| Buyer cambia de org activa con Quote DRAFT | DRAFT atado a org, no visible en otra org; cleanup job de DRAFTs antiguos |
| Quote con producto privado donde org perdió acceso | Re-validar en flujo 4; bloquear |
| Buyer removido de org con Quote/Order activo | Datos persisten con `requestedById`; admin de tienda puede archivar |
| Invoice de Order que se cancela | Marca Invoice como `CANCELLED` en misma transacción; libera creditUsed |
| Notification email falla (Resend down) | In-app siempre se crea; retry job cada 5min; máx 5 reintentos |
| Approval threshold cambia entre request y decide | Snapshot en `ApprovalRequest.threshold`; decisión aplica al threshold del momento |
| Volumen tier cambia con items en carrito | Re-evalúa en re-render; warning visible "Precio actualizado" |
| Dos approvers deciden a la vez | `WHERE status = PENDING`; segundo recibe ApprovalAlreadyDecidedError |
| Dos quote accept del buyer (doble click) | `WHERE status = QUOTED`; segundo retorna decisión existente |
| Dos órdenes a crédito simultáneas | `SELECT FOR UPDATE` en Organization en checkout; suma de Invoices en transacción |
| Cron OVERDUE + markPaid simultáneo | Sin conflicto por WHERE clauses; orden no importa |

## Testing strategy

### TDD obligatorio en módulos críticos

`modules/quotes`, `modules/accounts`, `modules/approvals` siguen TDD estricto: test primero, ver fallar, implementar mínimo, ver pasar, commit.

### Unit tests (Vitest)

Mínimo por módulo (lista no exhaustiva):

- `quotes`: submit, quote, revise, accept, reject, expire (job), audit log entries por acción.
- `accounts`: createInvoice from order, markPaid + decrement creditUsed, recalc creditUsed desde Invoices, checkCreditEligibility (función pura con casos A/B/C), markOverdue job.
- `approvals`: request validación de threshold, approve idempotente, reject idempotente, subscribers pattern.
- `notifications`: dispatch insert + email attempt, retry job, count unread, mark read.
- `catalog` (extensión): filterForOrg con producto público/privado, categoría pública/privada, override producto.
- `pricing` (extensión): resolveForOrg combinando CustomerPrice + tiers con varios qty.

### Integration tests (Vitest con DB real, `fileParallelism: false`)

- RFQ end-to-end: submit → quote → revise → accept → Order con Invoice.
- RFQ con stock insuficiente al aceptar: bloqueo + Quote queda QUOTED.
- Approval end-to-end: order > threshold → approve → CONFIRMED + Invoice; reject → CANCELLED + stock restore + creditUsed liberado.
- Credit gate: invoice overdue bloquea; credit exceeded bloquea; warning 80%.
- Race: dos approvers concurrentes, solo uno gana.
- Race: dos órdenes simultáneas excediendo credit juntas.
- Catalog visibility: org con acceso parcial; admin bypass.
- Volume pricing: tier aplicado correctamente con CustomerPrice de base.

### E2E tests (Playwright, happy paths mínimos)

- Buyer crea quote → admin cotiza → buyer acepta → ve la orden.
- Buyer hace orden > threshold → ve PENDING_APPROVAL → approver aprueba en otra sesión → buyer ve CONFIRMED.
- Admin marca invoice como pagada → buyer ve actualizado.
- Producto privado: buyer sin acceso ve 404 en /products/[slug].
- Volume tier: buyer agrega 50u, ve tier; reduce a 5u, ve precio base con aviso.

### Cobertura

Mínimo 80% para módulos nuevos (`quotes`, `accounts`, `approvals`, `notifications`). Configurado en `vitest.config.ts`.

## Migrations y deploy

### Estrategia de migración

1. **Migration 1** — modelos nuevos: Quote, QuoteLine, QuoteAuditLog, Invoice, ApprovalRequest, Notification, OrganizationCatalogAccess, ProductPriceTier; enums asociados (QuoteStatus, InvoiceStatus, PaymentTerms, ApprovalSubject, ApprovalStatus, NotificationType, ApprovalRole, PaymentMethod).
2. **Migration 2** — campos nuevos en Organization (creditLimit, creditUsed, paymentTerms, approvalThreshold, approvalRoles), Product (isPrivate), Category (isPrivate), Order (paymentMethod), CartItem (discountAmountSnapshot). Defaults seguros:
   - `Organization.creditUsed = 0`, `paymentTerms = PREPAID`, `approvalRoles = [OWNER, ADMIN]`
   - `Product.isPrivate = false`, `Category.isPrivate = false`
   - `Order.paymentMethod = PREPAID`, `CartItem.discountAmountSnapshot = 0`
3. **Migration 3** (SQL custom): `quote_seq_2026`, `invoice_seq_2026`, XOR constraint en `OrganizationCatalogAccess`.
4. **Migration 4** — extensión del enum `OrderStatus` (existente en Fase 1: `PENDING_PAYMENT | CONFIRMED | SHIPPED | DELIVERED | CANCELLED`) con nuevo valor `PENDING_APPROVAL`. Orden creada con approval pendiente entra en `PENDING_APPROVAL`; al aprobar pasa a `CONFIRMED`; al rechazar a `CANCELLED`.

### Backfill

Ninguno. Defaults seguros para todos los registros existentes. Sin breaking changes.

### Feature flags default

En `store.config.ts` del template seed:

```ts
features: {
  rfq: false,
  credit: false,
  approvals: false,
  privateCatalogs: false,
  volumeDiscounts: false,
}
```

Seed de tienda demo (Acme) activa todas para tests/dev. Seed incluye: 1 producto privado con acceso a Acme, 1 producto con tiers de volumen (1-9, 10-49, 50+), Acme con `approvalThreshold = $5000`, `creditLimit = $20000`, `paymentTerms = NET_30`.

### Scheduled tasks

| Task | Cron | Propósito |
|------|------|-----------|
| `mark-quotes-expired.ts` | daily 02:00 UTC | QUOTED → EXPIRED si `validUntil < now()` |
| `mark-invoices-overdue.ts` | daily 02:15 UTC | PENDING → OVERDUE si `dueDate < now()` |
| `send-invoice-due-soon.ts` | daily 09:00 UTC | Notif 3 días antes del vencimiento |
| `send-quote-expiring-soon.ts` | daily 09:15 UTC | Notif 3 días antes de validUntil |
| `retry-failed-notifications.ts` | every 5 min | Reintenta emails fallidos hasta 5 veces |
| `cleanup-stale-quote-drafts.ts` | weekly | DRAFT > 30 días sin updates → delete |

Ejecución: Coolify scheduled service + Docker container que corre `node scripts/<task>.ts`. Decisión final al implementar.

### Rollback plan

- Migrations Prisma reversibles per-migration. Si falla en prod: `prisma migrate resolve --rolled-back <migration>` + redeploy del tag anterior (`v1.0.0`).
- Feature flags permiten apagar features problemáticas sin rollback de schema.
- Procedimiento documentado en runbook nuevo `docs/runbooks/phase-2-rollback.md` al cerrar la fase.

### Observabilidad

- **Sentry:** captura errores de cada módulo nuevo con context `{ user, org, subject, action }`.
- **Pino logs estructurados:**
  - `level: info` para eventos auditables (quote accepted, approval decided, invoice paid).
  - `level: warn` para errores de negocio esperados (credit blocked, stock insufficient).
  - `level: error` para fallos inesperados.
- **Métricas custom (futuro):** RFQ submitted/quoted ratio, approval grant rate, credit utilization promedio. Endpoint `/api/admin/metrics` si se necesita en Fase 5.

## Seguridad

- **Authorization:** cada server action verifica `isPlatformAdmin` (admin de tienda) o role válido en org cliente. Approval decide verifica `user.role in org.approvalRoles`. Invoice markPaid: solo `isPlatformAdmin`.
- **Catalog access en server:** `catalog.filterForOrg` corre siempre en server (RSC o server action), nunca confiar en filtros client.
- **Impersonation (de Fase 1):** todas las acciones de Fase 2 respetan `impersonatingOrgId`. Audit logs (Quote, Invoice, ApprovalRequest) capturan al impersonador vía `ImpersonationLog` existente.
- **Rate limiting:** no requerido en v2.0.0 para uso B2B normal. Registrar en tech-debt para Fase 5+.
- **Datos sensibles:** `Invoice.paidNote` y `ApprovalRequest.reason` son free-text; no PII obligatorio pero podría haberlo — encriptar at-rest está cubierto por Postgres si se habilita TDE futuramente.

## Performance

- **Queries críticas:**
  - `/catalog` con filterForOrg: 2 queries adicionales por org bien indexadas. Aceptable para catálogos hasta 10k productos.
  - Polling de unread notification count cada 60s: 1 query bien indexada por user. Aceptable para hasta ~500 users concurrentes.
- **N+1 risks:** `filterForOrg` evita iterar pre-cargando IDs permitidos en Sets.
- **Caching:** `Organization.creditUsed` cached, recalculado solo en markPaid y en cron OVERDUE.
- **Bundle size:** sin nuevas deps mayores. shadcn/ui ya en stack. Toast lib (Sonner) si no está, agregar (~5kb gzipped).

## Criterios de aceptación

Cada uno debe verificarse antes de tag `v2.0.0`:

### Funcionalidad

- [ ] Buyer puede crear, enviar, aceptar, rechazar cotizaciones (con feature `rfq`).
- [ ] Admin puede cotizar y revisar cotizaciones; audit log persistido.
- [ ] Cotización aceptada se convierte en orden con flujo end-to-end (con todos los gates: stock, active, catalog access, credit, approval).
- [ ] Quotes expiran automáticamente via scheduled task.
- [ ] Buyer puede hacer checkout con Net 30 (con feature `credit`).
- [ ] Invoice se crea al CONFIRMED, dueDate calculada según paymentTerms.
- [ ] Admin puede marcar invoice como pagada; creditUsed se decrementa.
- [ ] Invoices se marcan OVERDUE automáticamente via scheduled task.
- [ ] Checkout bloqueado si invoices vencidas o credit exceeded.
- [ ] Order de buyer > threshold pasa a PENDING_APPROVAL (con feature `approvals`).
- [ ] Approver puede aprobar/rechazar; hooks ejecutan Order updates correctamente.
- [ ] Productos/categorías privadas no visibles para org sin acceso (con feature `privateCatalogs`).
- [ ] Admin puede gestionar whitelist de productos/categorías por org.
- [ ] Tiers de volumen aplicados correctamente en cart y checkout (con feature `volumeDiscounts`).
- [ ] CustomerPrice + Tier combinan según prioridad documentada.
- [ ] Botón "Re-ordenar" en orden pasada copia items válidos al carrito.
- [ ] Notificaciones in-app + email funcionan para todos los tipos.
- [ ] Badge unread en header refleja conteo real.

### Calidad técnica

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` todos verdes en CI.
- [ ] Cobertura unit ≥ 80% en módulos nuevos.
- [ ] Tests integration cubren todos los flujos clave y race conditions documentadas.
- [ ] Tests E2E happy paths verdes.
- [ ] WCAG 2.1 AA verificado en cada pantalla nueva (audit con `design:accessibility-review`).
- [ ] ADRs documentando decisiones clave (RFQ workflow, approval engine, credit model, volume pricing, notification dispatcher).
- [ ] Runbooks: `phase-2-rollback.md`, `quotes.md`, `credit-net30.md`, `approvals.md`, `notifications.md`.
- [ ] CLAUDE.md y ROADMAP.md actualizados al cerrar la fase.

### Operacional

- [ ] Migrations aplicadas en producción sin errores.
- [ ] Scheduled tasks corriendo en Coolify (o solución equivalente).
- [ ] Sentry capturando errores correctamente.
- [ ] Email Resend templates renderizando bien (test manual con 1 user real).
- [ ] Tag `v2.0.0` creado y release publicado en GitHub.
- [ ] Deploy a producción exitoso vía Coolify (auto-deploy en push de tag).
- [ ] Verificación `/api/health` post-deploy.

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Drift de `creditUsed` cached | Media | Medio | Función de re-sync expuesta en admin; recalc en cada markPaid |
| Email Resend down al notificar evento crítico | Baja | Medio | In-app siempre crea; retry job; failed reason visible para admin |
| Sequence collision en Quote/Invoice number | Muy baja | Bajo | pg_advisory_xact_lock + sequence; mismo patrón probado en Fase 1 |
| Scheduled task no corre (Coolify down o config error) | Media | Medio | Logging de última ejecución; alerta si > 25h sin ejecutar |
| Migraciones grandes bloquean DB en prod | Baja | Alto | Migrations en horario bajo; índices en CONCURRENTLY si necesario; staging primero |
| Race condition no anticipada en credit check | Baja | Alto | Tests integration de race; SELECT FOR UPDATE en transactions críticas |
| Confusión UX en re-orden con items descontinuados | Media | Bajo | Report claro de items descartados con razón |
| Feature flag mal configurado en prod | Media | Medio | Verificar en deploy checklist; logs estructurados de check de flag |

## Cronograma estimado

Granular en plan de implementación. Estimación de alto nivel:

- Schema + migrations + seed: 1-2 días
- `modules/notifications` (base): 1-2 días
- `modules/approvals` (engine + hooks): 2-3 días
- `modules/accounts` (credit + invoices + cron): 2-3 días
- `modules/quotes` (workflow + UI builder): 3-4 días
- Extensiones catalog + pricing: 2 días
- UI storefront nueva (8 pantallas): 4-5 días
- UI admin nueva (8 pantallas) + modificadas: 3-4 días
- E2E + integration coverage: 2 días
- Documentación (ADRs + runbooks + READMEs): 1 día
- QA + ajustes + accessibility audit: 2 días

**Total estimado:** ~25-30 días de trabajo de CC, dependiendo de iteraciones de revisión en Cowork.

## Próximos pasos

1. Revisión del spec en Cowork — usuario aprueba o solicita ajustes.
2. Generar plan de implementación granular en `docs/plans/2026-05-26-fase-2-especializacion-b2b-plan.md` (skill `superpowers:writing-plans`).
3. CC ejecuta el plan en branch `feature/fase-2-especializacion-b2b` con TDD.
4. Reviews periódicos en Cowork al cerrar bloques mayores.
5. Cierre: tag `v2.0.0`, deploy a producción, brainstorm de Fase 3.
