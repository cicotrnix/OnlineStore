# Spec — Fase 1: Commerce core B2B

- Proyecto: Online Store — Tienda B2B mayorista con IA
- Fase: 1 / 6
- Fecha: 2026-05-26 (rev. 2 con findings de review crítica de Claude Code CLI)
- Estado: Aprobado, listo para `writing-plans`
- Referencia maestra: `ROADMAP.md`
- Fase previa: `docs/specs/2026-05-25-fase-0-fundacion.md` (cerrada, v0.1.0)

**Changelog rev. 2:** orderNumber via Postgres sequence dedicada por año; `Session` extendido con `activeOrgId`, `impersonatingOrgId`, `lastSeenAt`; `OrganizationAddress` con full schema; `OrderLine.discountAmount` reservado para Fase 2; `Order.cancelledByUserId` para audit; Decimal subido a `(12, 2)`; cancelación restaura stock atómicamente; cart se limpia post-orden; validación de `isActive` en step 1 de checkout; multi-org switching limpia carrito; impersonation expira tras 30 min; drop de `galleryUrls` y drag-and-drop (defer a fases futuras); ADRs adicionales para money handling, orderNumber, tRPC/server-actions.

---

## 1. Objetivo

Construir el commerce core funcional sobre la fundación de Fase 0. Al cerrar Fase 1, debe ser posible:

- Un platform admin puede crear categorías, productos con SKU/precio/stock, y definir precios personalizados por cliente B2B.
- Un comprador B2B puede entrar al storefront, navegar el catálogo (vista cards o lista densa con toggle persistente), ver precios resueltos (override de su org si tiene, base si no), agregar productos al carrito, y completar un checkout B2B de 4 pasos (revisar → direcciones → PO/notas → confirmar).
- La orden queda creada en estado `PENDING_PAYMENT` con snapshot inmutable de precios y datos del producto.
- El admin puede gestionar órdenes (transiciones de estado) y precios personalizados por cliente, e impersonar "ver como cliente X" para verificar precios sin colocar órdenes.

**No incluye:** pagos reales (Fase 5), búsqueda de productos (Fase 3), RFQ/crédito/aprobaciones internas (Fase 2), chatbot IA (Fase 4), multi-tenant CLI (Fase 6).

## 2. Fuera de alcance (explícito)

- **Variantes y atributos de producto:** Phase 1 sólo soporta SKUs simples (1 producto = 1 SKU = 1 precio base = 1 stock). Si llega la necesidad de talla/color/sabor, se agrega `ProductVariant` en una fase posterior.
- **Búsqueda full-text o semántica:** sólo filtro por categoría en Fase 1. Buscador llega en Fase 3.
- **Procesamiento de pagos:** las órdenes quedan en `PENDING_PAYMENT`. Stripe se integra en Fase 5.
- **Cálculo de impuestos y envío:** `Order.total = subtotal` en Fase 1. Tax y shipping vienen con integraciones en Fase 5.
- **RFQ, crédito Net 30, catálogos privados, aprobaciones internas:** Fase 2.
- **Recomendaciones, generación de contenido por IA, chatbot, embeddings:** Fase 4.
- **Cupones, códigos de descuento, promociones masivas:** Fase 2 o más adelante.
- **Reviews de producto:** Fase 4 (con moderación IA).
- **Wishlist:** no aplica en B2B mayorista.
- **Historial versionado de precios:** sólo se guarda el `CustomerPrice` actual.
- **Multi-currency:** sólo USD por ahora (decisión fundacional).
- **Multi-idioma en producto:** los strings de producto son single-language en Fase 1. i18n verdadero en una fase posterior si hace falta.

## 3. Decisiones de arquitectura

| Decisión | Elección | Razón |
|----------|----------|-------|
| Modelo de producto | SKU simple (sin variantes) | YAGNI hasta que el caso de uso real lo exija |
| Categorización | Single-level (un producto = una categoría) | Cubre 90% de casos B2B mayorista; árbol es overkill |
| Pricing | Lista base en `Product.basePrice` + override por org en `CustomerPrice` | Separa lógica de pricing del catálogo, lista para crecer en Fase 2 |
| Resolución de precio | `CustomerPrice` para `(orgId, productId)` si existe; si no, `basePrice` | Simple, predecible, sin sorpresas |
| Carrito | Persistente en DB por usuario, no por organización | Usuarios distintos en la misma org pueden tener carritos independientes |
| Orden | Asociada a la organización + tracking del usuario que la colocó | Orden es de la empresa cliente, no del individuo |
| Snapshot de precios | Al agregar al carrito (precio "fijado" hasta refresh manual) y al confirmar orden (definitivo) | Evita disputas "yo vi otro precio" |
| Snapshot de producto en `OrderLine` | sku, name, unitPrice se copian a `OrderLine` | Si el admin renombra el producto luego, las órdenes históricas quedan estables |
| Checkout | Wizard 4 pasos: revisar → direcciones → PO+notas → confirmar | B2B necesita fricción consciente (PO, addresses); no consumer flow |
| Estados de orden | `PENDING_PAYMENT → CONFIRMED → SHIPPED → DELIVERED` (`CANCELLED` desde cualquier estado previo a SHIPPED) | Cubre lifecycle B2B básico; pagos llegan en Fase 5 |
| Cancelar orden | Devuelve `quantity` al `Product.stockQuantity` atómicamente en la misma transacción | Mantiene el stock consistente |
| Toggle Cards/Lista | Persiste en DB en `User.preferredCatalogView` | Decisión validada con el usuario (no localStorage) |
| Active Org | Si user pertenece a varias orgs, sesión guarda `activeOrgId`; pricing y carrito se resuelven contra esa | Cubre miembros multi-org sin ambigüedad |
| Impersonation storage | Campos `activeOrgId` e `impersonatingOrgId` en tabla `Session` (Auth.js database strategy) | Auth.js v5 expone sesión vía callback; persistente y auditable |
| Impersonation expiración | 30 min de inactividad; `Session.lastSeenAt` se actualiza en cada request via middleware | Evita impersonaciones zombi |
| `orderNumber` generación | Postgres sequence dedicada por año: `CREATE SEQUENCE IF NOT EXISTS order_seq_{year}`; usar `nextval` en la trx de creación | Atómico, sin race conditions, sin contención |
| Precisión monetaria | `Decimal(12, 2)` en todos los campos de dinero (hasta $9,999,999,999.99) | Cubre líneas grandes de B2B mayorista con margen amplio |
| Money helper | `lib/money.ts` con `formatMoney(decimal)` y validaciones; nunca usar `number` para dinero | Evita drift de implementación |
| Imágenes | Sólo `imageUrl` (única) en Fase 1; galería difiere a Fase 5 con S3 | YAGNI estricto |
| Reordenar categorías | Input numérico `sortOrder` en admin; drag-and-drop difiere | YAGNI; DnD agrega 1-2 días sin valor inmediato |
| Markdown en descripción | Textarea + preview con `react-markdown`; no editor WYSIWYG | YAGNI; suficiente para Fase 1 |

## 4. Estructura de carpetas (nuevos módulos)

```
modules/
├── customers/          (extendido — agregar OrganizationAddress)
├── catalog/            (NUEVO)
│   ├── index.ts
│   ├── schemas.ts
│   ├── repository.ts
│   ├── service.ts
│   └── service.test.ts
├── pricing/            (NUEVO)
│   ├── index.ts
│   ├── schemas.ts
│   ├── repository.ts
│   ├── service.ts
│   └── service.test.ts
├── cart/               (NUEVO)
│   ├── index.ts
│   ├── schemas.ts
│   ├── repository.ts
│   ├── service.ts
│   └── service.test.ts
├── checkout/           (NUEVO)
│   ├── index.ts
│   ├── schemas.ts
│   ├── service.ts
│   └── service.test.ts
└── orders/             (NUEVO)
    ├── index.ts
    ├── schemas.ts
    ├── repository.ts
    ├── service.ts
    └── service.test.ts

app/
├── (storefront)/
│   ├── catalog/
│   │   ├── page.tsx                    (NUEVO — listado con toggle)
│   │   └── [category]/page.tsx         (NUEVO — filtrado por categoría)
│   ├── products/[slug]/page.tsx        (NUEVO — ficha de producto)
│   ├── cart/page.tsx                   (NUEVO)
│   └── checkout/
│       ├── page.tsx                    (NUEVO — wizard 4 pasos)
│       └── _components/                (steps internos)
├── (account)/
│   └── orders/
│       ├── page.tsx                    (NUEVO — listado órdenes de la org)
│       └── [id]/page.tsx               (NUEVO — detalle)
└── admin/
    ├── products/                       (NUEVO)
    ├── categories/                     (NUEVO)
    ├── orders/                         (NUEVO)
    └── customers/
        ├── page.tsx                    (NUEVO — listado de orgs cliente)
        └── [id]/
            ├── page.tsx                (NUEVO — detalle de org)
            └── prices/page.tsx         (NUEVO — gestión bulk de precios)

components/commerce/                    (NUEVO)
├── ProductCard.tsx
├── ProductListItem.tsx
├── CatalogToggle.tsx
├── PriceTag.tsx
├── QuantityInput.tsx
├── AddToCartButton.tsx
├── CartLineItem.tsx
├── CheckoutStepper.tsx
├── OrderStatusBadge.tsx
└── ImpersonationBanner.tsx
```

## 5. Modelo de datos

### Extensiones a tablas existentes (Fase 0)

```prisma
enum CatalogView {
  CARDS
  LIST
}

model User {
  // ... campos existentes
  isPlatformAdmin      Boolean     @default(false)
  preferredCatalogView CatalogView @default(CARDS)
}

model Session {
  // ... campos existentes de Auth.js (id, sessionToken, userId, expires)
  activeOrgId         String?
  impersonatingOrgId  String?
  lastSeenAt          DateTime @default(now()) @updatedAt

  activeOrg        Organization? @relation("SessionActiveOrg",      fields: [activeOrgId],        references: [id], onDelete: SetNull)
  impersonatingOrg Organization? @relation("SessionImpersonatingOrg", fields: [impersonatingOrgId], references: [id], onDelete: SetNull)

  @@index([activeOrgId])
  @@index([impersonatingOrgId])
}
```

**Type augmentation requerido en `types/next-auth.d.ts`:**

```typescript
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

El callback `session()` de Auth.js carga estos campos desde la tabla `Session`.

### Tablas nuevas

```prisma
// ─── modules/catalog ───

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
  description   String?                            // markdown
  basePrice     Decimal  @db.Decimal(12, 2)
  stockQuantity Int      @default(0)
  imageUrl      String?                            // URL externa; galería difiere a Fase 5
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

// ─── modules/pricing ───

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

// ─── modules/cart ───

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

// ─── modules/customers (extensión) ───

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
  country           String   // ISO-2
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

// ─── modules/orders ───

enum OrderStatus {
  PENDING_PAYMENT
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

model Order {
  id                String      @id @default(cuid())
  orderNumber       String      @unique                       // ORD-YYYY-NNNNNN, generado por sequence Postgres
  organizationId    String
  placedByUserId    String
  status            OrderStatus @default(PENDING_PAYMENT)
  poNumber          String?                                   // no unique (clientes pueden repetir PO)
  notes             String?
  billingAddressId  String
  shippingAddressId String
  subtotal          Decimal     @db.Decimal(12, 2)
  total             Decimal     @db.Decimal(12, 2)            // = subtotal en Fase 1; tax+shipping en Fase 5
  currency          String                                    // leído de store.config.currency.base
  placedAt          DateTime    @default(now())
  confirmedAt       DateTime?
  shippedAt         DateTime?
  deliveredAt       DateTime?
  cancelledAt       DateTime?
  cancelledByUserId String?                                   // audit: quién canceló

  organization    Organization        @relation(fields: [organizationId], references: [id])
  placedBy        User                @relation(fields: [placedByUserId], references: [id])
  cancelledBy     User?               @relation("OrderCancelledBy", fields: [cancelledByUserId], references: [id])
  billingAddress  OrganizationAddress @relation("OrderBilling",  fields: [billingAddressId],  references: [id])
  shippingAddress OrganizationAddress @relation("OrderShipping", fields: [shippingAddressId], references: [id])
  lines           OrderLine[]

  @@index([organizationId])
  @@index([status])
}

model OrderLine {
  id             String   @id @default(cuid())
  orderId        String
  productId      String                                    // FK Restrict implícito: no se puede borrar producto con historia. Usar isActive=false (soft delete).
  sku            String                                    // snapshot
  name           String                                    // snapshot
  unitPrice      Decimal  @db.Decimal(12, 2)               // snapshot
  quantity       Int
  discountAmount Decimal  @db.Decimal(12, 2) @default(0)   // reservado para Fase 2 (descuentos por volumen)
  lineTotal      Decimal  @db.Decimal(12, 2)               // (unitPrice * quantity) - discountAmount
  createdAt      DateTime @default(now())

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
}

// ─── audit / impersonation ───

enum ImpersonationAction {
  START
  STOP
}

model ImpersonationLog {
  id          String              @id @default(cuid())
  adminUserId String
  targetOrgId String
  action      ImpersonationAction
  reason      String?                                       // texto libre opcional al iniciar
  createdAt   DateTime            @default(now())

  adminUser   User         @relation("ImpersonationAdmin", fields: [adminUserId], references: [id])
  targetOrg   Organization @relation("ImpersonationTarget", fields: [targetOrgId], references: [id])

  @@index([adminUserId])
  @@index([targetOrgId])
  @@index([createdAt])
}
```

### Mecánicas críticas

#### Generación de `orderNumber`

Formato `ORD-YYYY-NNNNNN` (ej: `ORD-2026-000042`).

**Estrategia: Postgres sequence dedicada por año.** En `modules/orders/service.ts` antes de insertar la `Order`:

```sql
CREATE SEQUENCE IF NOT EXISTS order_seq_2026 START 1;
SELECT nextval('order_seq_2026');
```

El resultado se formatea a 6 dígitos con padding (`LPAD`). Esta estrategia es **atómica**, **no requiere locks**, y **escala**: `nextval` está diseñado para alta concurrencia. El año se calcula al momento de la creación (`new Date().getFullYear()`). La sequence se crea lazy en el primer order del año mediante `CREATE SEQUENCE IF NOT EXISTS`, ejecutado dentro de un `pg_advisory_xact_lock` para evitar carrera al crearla.

Tests deben verificar:
- 1000 órdenes secuenciales producen `000001..001000`.
- 50 órdenes concurrentes producen 50 números únicos sin colisión.
- Cambio de año arranca una sequence nueva en `000001`.

#### Validación de stock + reserva atómica al confirmar orden

En `checkout.confirm()`, dentro de una sola transacción Prisma:

1. `SELECT ... FOR UPDATE` sobre cada `Product` referenciado en el carrito.
2. Verificar `stockQuantity >= cartItem.quantity` para cada item. Si falla → throw `InsufficientStockError(productId, available, requested)`.
3. Verificar `Product.isActive = true`. Si no → throw `ProductInactiveError(productId)`.
4. Decrementar `stockQuantity` de cada producto por la quantity reservada.
5. Crear `Order` + `OrderLine[]` con snapshots.
6. Generar `orderNumber` con `nextval`.
7. Eliminar `CartItem[]` del usuario (vaciar carrito).
8. Commit.

Si cualquier paso falla, toda la transacción rollback y stock + carrito quedan intactos.

#### Restore de stock al CANCELLED

Cuando una orden transita a `CANCELLED` (desde `PENDING_PAYMENT` o `CONFIRMED`, no desde `SHIPPED+`), dentro de una sola transacción:

1. `SELECT ... FOR UPDATE` sobre los `Product` referenciados.
2. Para cada `OrderLine`, `Product.stockQuantity += line.quantity`.
3. Update `Order.status = CANCELLED`, `cancelledAt = now()`, `cancelledByUserId = currentUserId`.
4. Commit.

Esto mantiene consistencia: el stock devuelto está disponible para futuras órdenes inmediatamente.

#### Cart auto-clear post-orden

Como parte de `checkout.confirm()` (paso 7 arriba), `CartItem.deleteMany({ where: { cartId } })` se ejecuta en la misma transacción. El `Cart` (registro padre) permanece — sólo se vacían las líneas. El próximo `cart.addItem` reutiliza el cart existente.

#### Active Org y resolución de pricing

Un `User` puede pertenecer a varias organizaciones (vía `OrganizationMember`). La sesión guarda `activeOrgId` (puede ser null si user no tiene orgs o no ha elegido). Reglas:

- Al loguearse, si el user tiene exactamente 1 org como member, `activeOrgId` se setea a esa.
- Si tiene 2+, se redirige a `/account/select-org` para elegir; selección guarda en `Session.activeOrgId`.
- El switcher de orgs en el header del storefront permite cambiar; cambia `Session.activeOrgId` y limpia el carrito (porque snapshots de precios podrían no aplicar).
- `pricing.resolveForOrg(orgId, productId)` toma el orgId explícito — nunca lo infiere. La capa de la página/route lo lee de `session.activeOrgId` (o de `impersonatingOrgId` si está activa).

#### Impersonation: storage y expiración

- `Session.impersonatingOrgId` se setea via server action `admin.impersonationStart(orgId, reason?)` que valida `user.isPlatformAdmin`.
- Mientras `impersonatingOrgId` esté no-null, `pricing.resolveForOrg` y `catalog.list` usan esa orgId en vez de `activeOrgId`.
- `Session.lastSeenAt` se actualiza en cada request en `lib/auth/middleware.ts`. Si `impersonatingOrgId` está activa y `lastSeenAt` es > 30 min atrás, se limpia automáticamente y se inserta `ImpersonationLog` con `action = STOP` y reason `"auto-expired"`.
- Logout siempre limpia ambos campos.

#### Producto desactivado y carritos colgados

Si el admin marca `Product.isActive = false`:
- El producto desaparece del catálogo storefront inmediatamente.
- Los `CartItem` que lo referencian permanecen en DB.
- En `cart.get()`, items con producto inactivo se marcan en el response como `inactive: true` y la UI los muestra con badge "ya no disponible" + opción de eliminar.
- En `checkout.confirm()`, el step 1 valida `isActive` y bloquea avance hasta que se eliminen del carrito.

#### User sale de su org con cart activo

Si un `OrganizationMember` se elimina (admin lo expulsa o el user sale), los `CustomerPrice` de esa org dejan de aplicar a ese user.

- Si el user pertenecía a más orgs, `Session.activeOrgId` se ajusta a la primera org restante.
- Si era su única org, `Session.activeOrgId = null`. El user pierde acceso al storefront (redirect a `/account/orgs` con mensaje).
- En cualquier caso, el carrito se invalida: `CartItem[].unitPriceSnapshot` ya no es confiable. Mecánica: el primer request post-cambio detecta la diferencia y muestra modal "Tu organización cambió; revisamos los precios de tu carrito" + recalcula snapshots o limpia carrito según política. **Decisión: limpiar carrito y notificar.** Más simple, menos sorpresas legales.

## 6. Páginas y flujos

### Storefront

**`/catalog`** — Listado de productos.
- Top: nav de categorías como pills (incluye "Todos").
- Toggle Cards/Lista a la derecha (icon-only buttons, persiste en `User.preferredCatalogView`).
- Vista cards: grid 3 columnas (responsive a 2 en tablet, 1 en mobile).
- Vista lista: tabla densa con columnas sku, name, category, stock, price, qty input, add.
- Cada producto muestra: imagen, nombre, SKU, precio resuelto (con badge "TU PRECIO" + precio base tachado si hay override), stock con indicador, qty input + Add button.
- Paginación si hay > 50 productos (server-side, `?page=N`).

**`/catalog/[category-slug]`** — Igual que `/catalog` pero filtrado a una categoría.

**`/products/[slug]`** — Ficha de producto.
- Galería: imagen principal grande + thumbnails de `galleryUrls`.
- Nombre, SKU, descripción markdown, categoría con link.
- Precio resuelto + badge "TU PRECIO" si aplica.
- Stock indicator (en stock / bajo / agotado).
- Qty input + Add to cart.
- Sección "Productos relacionados" abajo: 4 productos de la misma categoría.

**`/cart`** — Carrito.
- Tabla de items: imagen mini, nombre + SKU, precio unitario (snapshot), qty editable, lineTotal, botón eliminar.
- Subtotal abajo a la derecha.
- "Continuar comprando" → `/catalog` · "Proceder al checkout" → `/checkout`.

**`/checkout`** — Wizard 4 pasos.

- **Step 1 — Revisar:** lista de items con precios resueltos (vuelve a recalcular para detectar cambios), subtotal, validación de stock contra DB. Si algún item está sin stock → muestra error y bloquea avance.
- **Step 2 — Direcciones:** dos columnas (billing / shipping). Cada una con dropdown de `OrganizationAddress` existentes + botón "Nueva dirección" (form inline). Defaults pre-seleccionados si la org tiene `isDefaultBilling/Shipping`.
- **Step 3 — PO + Notas:** dos campos opcionales — `poNumber` (text, max 50) y `notes` (textarea, max 1000).
- **Step 4 — Confirmar:** resumen completo (items, addresses, PO, notes, subtotal, total). Texto explicativo "Esta orden quedará en PENDING_PAYMENT. Te contactaremos para coordinar pago." Botón "Colocar orden" → transacción de creación + email + redirect.

**`/account/orders`** — Listado de órdenes de la org del usuario.
- Tabla con orderNumber, fecha, status, total, link al detalle.
- Filtros por estado (dropdown).

**`/account/orders/[id]`** — Detalle de orden.
- Header: orderNumber + status badge.
- Timeline visual de estados (placedAt → confirmedAt → shippedAt → deliveredAt).
- Direcciones (billing + shipping).
- PO number + notes si existen.
- Tabla de líneas con snapshot.
- Subtotal y total.

### Admin

**`/admin/products`** — Tabla con búsqueda en client-side y filtros por categoría. Acciones: editar, desactivar, eliminar (soft delete con `isActive = false`).

**`/admin/products/new` y `/admin/products/[id]/edit`** — Form: sku, slug (auto-gen con override), name, description (markdown editor simple), basePrice, stockQuantity, imageUrl, galleryUrls (array), category, isActive.

**`/admin/categories`** — CRUD simple, soporta reordenar via drag-and-drop (campo `sortOrder`).

**`/admin/orders`** — Tabla de todas las órdenes con filtros. Click → detalle con botones para transicionar estado (CONFIRMED, SHIPPED, DELIVERED, CANCELLED). Cada transición registra timestamp correspondiente.

**`/admin/customers`** — Listado de organizaciones cliente. Click → `/admin/customers/[id]`.

**`/admin/customers/[id]`** — Detalle de org cliente: nombre, slug, miembros, direcciones guardadas, link a gestión de precios. Botón "Ver storefront como esta org" (inicia impersonation).

**`/admin/customers/[id]/prices`** — Gestión bulk de `CustomerPrice`:
- Search bar para encontrar producto.
- Tabla: producto, precio base, precio override (input), validFrom, validUntil, notes, save.
- Botón "Guardar todos" para batch.

### Impersonation

**Mecánica:**
1. Platform admin (`User.isPlatformAdmin = true`) en `/admin/customers/[id]` click "Ver como esta org".
2. Server action crea entrada en `ImpersonationLog` con `action = START`, guarda `impersonatingOrgId` en sesión Auth.js.
3. Redirect a `/catalog`. A partir de ahí, todas las queries de pricing usan ese `orgId` virtual.
4. Banner amarillo persistente arriba: "Viendo como Acme Wholesale · [Salir]".
5. Componentes que normalmente permiten colocar orden (Add to cart, Checkout) están deshabilitados con tooltip "No puedes colocar órdenes mientras impersonas".
6. Click "Salir" → server action crea `ImpersonationLog` con `action = STOP`, limpia sesión, redirect a `/admin/customers/[id]`.

**Seguridad:**
- Solo `isPlatformAdmin = true` puede invocar la server action.
- Cada START y STOP queda registrado.
- Si el admin cierra sesión sin parar la impersonation, en el siguiente login se limpia automáticamente (no persiste).

## 7. tRPC y server actions

Cada módulo expone su API por tRPC routers:
- `catalog.list`, `catalog.bySlug`, `catalog.byCategory`
- `pricing.resolveForOrg(orgId, productId)`, `pricing.batchResolveForOrg(orgId, productIds[])`
- `cart.get`, `cart.addItem`, `cart.updateQuantity`, `cart.removeItem`, `cart.clear`
- `checkout.review`, `checkout.confirm(input)`
- `orders.list`, `orders.byId`, `orders.transitionStatus(id, newStatus)`, `orders.cancel(id)`
- `customers.listAddresses`, `customers.createAddress`, `customers.setCustomerPrice(input)`
- `admin.impersonationStart(orgId, reason?)`, `admin.impersonationStop()`
- `account.switchActiveOrg(orgId)`

**Decisión tRPC vs server actions:** ver `docs/adr/0007-trpc-and-server-actions-coexistence.md`. Resumen: tRPC para reads y mutaciones simples desde React Server Components y cliente; server actions de Next.js para forms multi-step (`/checkout`, `/admin/products/[id]/edit`) donde la integración con `<form action>` ofrece mejor progressive enhancement.

## 8. Testing strategy

| Módulo | Cobertura | Tipo |
|--------|-----------|------|
| `pricing` | 100% | Unit pura + integración DB |
| `catalog` | 85% | Unit + integración |
| `cart` | 90% | Integración (transacciones, snapshot) |
| `checkout` | 95% | Integración (multi-step, validación, snapshot) |
| `orders` | 90% | Integración (state machine, transiciones) |
| Pages storefront | n/a | E2E Playwright |

### E2E críticos (Playwright)

1. **Happy path** — Login → browse `/catalog` → add to cart → checkout 4 steps → ver orden creada en `/account/orders/[id]`.
2. **Precio resuelto correcto** — Crear dos usuarios en dos orgs; org A tiene `CustomerPrice = 8`, org B no tiene override y `basePrice = 10`. Cada usuario ve su precio en `/catalog` y en `/cart`.
3. **Stock validation en checkout concurrente** — Setup: producto con `stockQuantity = 1`. Usuario X tiene 1 en carrito. Otra sesión coloca orden de 1 unidad. Usuario X intenta checkout → error en step 4.
4. **Snapshot inmutable** — Crear orden con precio $10. Admin cambia precio base a $15. La orden sigue mostrando $10.
5. **Cancel restore stock** — Producto con stock 10. Orden con qty 3 → stock baja a 7. Admin cancela orden → stock vuelve a 10.
6. **Impersonation** — Admin entra como cliente, ve precios del cliente. Intenta hacer click en "Add to cart" → deshabilitado con tooltip. Sale → admin vuelve a su sesión normal.
7. **Impersonation expiry** — Admin inicia impersonation. Inactividad 30+ min. Próximo request → auto-expira con `ImpersonationLog` `STOP/reason="auto-expired"`.
8. **Toggle Cards/Lista persiste** — Usuario cambia a Lista, logout, login, sigue en Lista.
9. **Order state transitions** — Admin avanza orden por todos los estados; timestamps se llenan correctamente.
10. **Producto desactivado con cart** — User tiene 2 items en cart. Admin desactiva uno. User ve carrito → 1 marcado como inactivo, checkout step 1 bloquea hasta eliminarlo.
11. **Multi-org switching** — User pertenece a org A y org B con precios distintos. Switch desde A a B → carrito se limpia + nuevo carrito reflejará precios de B.

### Tests unitarios destacados

- `pricing.resolveForOrg`: cubre todos los casos (override activo, `validFrom` futuro → fallback a base, `validUntil` expirado → fallback a base, sin override → base, producto inactivo).
- `checkout.confirm`: cubre stock insuficiente, dirección inválida, carrito vacío, producto desactivado en step 1, snapshot correcto en `OrderLine`, decremento atómico de stock, cart vaciado post-commit.
- `orders.transitionStatus`: cubre transiciones válidas e inválidas (ej: no se puede ir de DELIVERED a PENDING_PAYMENT).
- `orders.cancel`: cubre restore de stock (todos los items vuelven al `Product.stockQuantity`), audit de `cancelledByUserId`.
- `orderNumber generator`: genera secuencias correctas, sin colisiones con 50 órdenes concurrentes, sequence nueva por año.
- `cart` con producto desactivado: el endpoint `cart.get` retorna items con flag `inactive: true`.
- `cart` cuando user sale de org: cart se limpia o invalida según política definida.

## 9. CI/CD

Sin cambios estructurales respecto a Fase 0. La pipeline `.github/workflows/ci.yml` corre lint, typecheck, vitest, playwright, build. Tras merge a `main`, Coolify hace deploy automático con `prisma migrate deploy && pnpm build`.

**Nuevo en Fase 1:** las migraciones de Prisma incluyen los modelos nuevos. CI valida que `prisma migrate deploy` corra limpio contra una DB fresca.

## 10. Variables de entorno

Sin nuevas variables requeridas en Fase 1. Las de Fase 0 (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, RESEND_API_KEY, RESEND_FROM_EMAIL, SENTRY_DSN) cubren lo necesario.

## 11. Criterios de aceptación

Fase 1 se considera cerrada cuando **todas** estas afirmaciones son ciertas:

1. `/catalog` lista productos con filtro por categoría funcionando.
2. Toggle Cards/Lista persiste en DB por usuario y respeta la preferencia entre sesiones.
3. `/products/[slug]` muestra precio resuelto correctamente (override del cliente si existe, base si no).
4. Add to cart funciona desde card, lista y ficha de producto.
5. Carrito persiste entre sesiones del mismo usuario.
6. Checkout completa los 4 pasos y crea una `Order` válida con `OrderLine[]`.
7. `OrderLine` contiene snapshot inmutable de sku, name, unitPrice.
8. Validación de stock en step 4 de checkout funciona (no permite confirmar si stock cambió).
9. Admin puede CRUD productos y categorías desde `/admin/*`.
10. Admin puede transicionar estados de orden con timestamps correctos.
11. Admin puede definir y editar `CustomerPrice` bulk para una organización.
12. Admin puede iniciar/parar impersonation con banner visible y botón "Place order" deshabilitado.
13. Cada inicio y parada de impersonation queda en `ImpersonationLog`.
14. Emails de confirmación de orden se envían (al menos para el comprador) vía Resend.
15. CI verde: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`.
16. Cobertura cumple los targets de la tabla en sección 8.
17. WCAG 2.1 AA verificado en todas las pantallas nuevas con `design:accessibility-review`.
18. Deploy automático en Coolify exitoso al hacer push a main.
19. App en producción accesible vía sslip.io con todas las features nuevas funcionando.
20. Seed de DB en `prisma/seed.ts` crea automáticamente: 1 platform admin, 1 org cliente con 2 miembros, 2 categorías, 5+ productos con stock, 2 direcciones, y al menos 1 `CustomerPrice`. Demo navegable end-to-end tras `pnpm db:reset && pnpm db:seed`.
21. Cancelar orden restaura stock atómicamente.
22. Producto desactivado bloquea checkout en step 1 (no permite confirmar).
23. Multi-org: switch limpia carrito y aplica precios de la nueva org.
24. Impersonation expira tras 30 min de inactividad y queda registrado en `ImpersonationLog`.
25. `orderNumber` generator soporta 50 órdenes concurrentes sin colisión (test E2E con `Promise.all`).

## 12. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Race condition en stock durante checkout concurrente | Media | Medio | Usar `SELECT ... FOR UPDATE` en transacción de checkout; decrementar stock atómicamente |
| Generación de `orderNumber` con colisiones bajo carga | Baja | Bajo | Usar secuencia Postgres dedicada o trx serializable; tests de concurrencia |
| Snapshot de precios queda obsoleto si el usuario tarda mucho | Media | Bajo | Re-validar en step 1 de checkout; advertir si cambió |
| Performance del catálogo con muchos productos | Baja al inicio | Medio luego | Paginación server-side, índices en `Product.categoryId` y `Product.isActive`. Búsqueda + cache vienen en Fase 3 |
| Impersonation se queda activa accidentalmente | Baja | Medio | Banner persistente prominente; auto-clear al logout; expira tras 30 min de inactividad |
| Admin pierde su sesión al impersonar y se confunde | Baja | Bajo | Botón "Salir" siempre visible; impersonation no reemplaza identidad real, sólo cambia "viewAsOrg" |
| Migración de schema rompe órdenes existentes | Baja | Alto | Fase 1 es la primera con órdenes — no hay historia que romper. Backups antes del primer deploy |
| WCAG AA falla en wizards multi-step | Media | Medio | Tests de teclado y focus en cada step; revisión con `design:accessibility-review` antes de cada PR |

## 13. Documentación entregable

- `docs/adr/0004-product-model-simple-skus.md` — Por qué simple SKU sin variantes en Fase 1.
- `docs/adr/0005-customer-price-overrides.md` — Decisión del modelo de pricing.
- `docs/adr/0006-impersonation-design.md` — Diseño y consideraciones de seguridad.
- `docs/adr/0007-trpc-and-server-actions-coexistence.md` — Cuándo usar tRPC vs server actions de Next.js.
- `docs/adr/0008-money-handling.md` — `Decimal(12, 2)` siempre; `lib/money.ts` con helpers; nunca `number` para dinero.
- `docs/adr/0009-order-number-generation.md` — Postgres sequence dedicada por año; alternativas descartadas (advisory lock + count, UUID, etc.).
- `docs/runbooks/order-state-management.md` — Cómo el admin maneja órdenes y cancelaciones.
- `docs/runbooks/customer-pricing.md` — Cómo definir precios personalizados.
- `docs/runbooks/impersonation.md` — Cómo y cuándo impersonar a un cliente.
- Actualización de `README.md` con la nueva sección "Cómo usar el storefront".

## 14. Próximos pasos al cerrar Fase 1

1. Tag de release `v1.0.0`.
2. Actualizar `ROADMAP.md` y memoria persistente.
3. Brainstorming de Fase 2 — Especialización B2B (RFQ, crédito Net 30, catálogos privados, aprobaciones).
4. Considerar contratar dominio real + SSL para producción (si todavía no se hizo).
5. Configurar Resend con dominio propio para emails de orden (en vez del sandbox `onboarding@resend.dev`).
6. Activar backups automáticos de Postgres a Hetzner Storage Box.

---

*Este spec está congelado. Cambios mayores requieren nuevo brainstorming. Cambios menores (typo, claridad) se editan directamente con commit que lo registre.*
