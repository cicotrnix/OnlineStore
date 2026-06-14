# Briefing para Claude Code CLI

> Este archivo es el contexto que necesita Claude Code CLI al arrancar en este repositorio.
> Leerlo siempre antes de cualquier sesión. No editar sin actualizar también `ROADMAP.md`.

## Qué es este proyecto

**Online Store** — tienda B2B mayorista con IA, construida como **plantilla configurable multi-tenant** para operar en USA + Latinoamérica en USD. El objetivo del proyecto no es una tienda específica: es un producto-plataforma que permite lanzar nuevas tiendas mayoristas editando configuración, tema y catálogo, sin reescribir código.

## Workflow del owner (Herney)

- **Planificación, brainstorming y revisión** ocurren en **Cowork** (claude.ai desktop, modo Cowork).
- **Implementación, código, comandos, git, deploy** ocurren aquí en **Claude Code CLI**.
- Si Claude Code CLI tiene dudas estratégicas o de diseño, dejarlas claras en un comentario o en un commit, y Herney las resolverá en Cowork. No tomar decisiones grandes de arquitectura sin consultar.

## Lectura obligatoria al iniciar sesión

Antes de tocar código, leer en este orden:

1. `ROADMAP.md` (raíz) — visión completa de las 7 fases, arquitectura, stack, estado actual.
2. `docs/specs/<fase-actual>.md` — spec de la fase en curso.
3. `docs/plans/<fase-actual>-plan.md` — plan de implementación paso a paso de la fase actual.
4. `docs/adr/` — ADRs vigentes con decisiones de arquitectura.

## Estado actual del proyecto

**Fase 0 cerrada (v0.1.0). Fase 1 cerrada (v1.0.0). Fase 2 cerrada (v2.0.0). Fase 3 cerrada (v3.0.0). Fase 4 cerrada (v4.0.0, 2026-05-30). Fase 5 cerrada (v5.0.0, 2026-06-01).**

**Fase 0 entregado (v0.1.0, 2026-05-25):**
- Next.js 14 + TypeScript estricto + Tailwind + Biome + Vitest + Playwright.
- Prisma 6 + Postgres 16 + pgvector (Docker local puerto 5435, Coolify en producción).
- Auth.js v5 + Resend magic links + adapter Prisma.
- Módulos `config` y `customers` (organizations + members + invitations) con TDD.
- Admin: `/admin`, `/admin/settings`, `/invite/[token]`. Middleware de auth.
- Observabilidad: Pino + Sentry + `/api/health`.
- CI GitHub Actions (lint + typecheck + tests + build + e2e).
- 4 runbooks + 3 ADRs (0001-0003).
- Desplegado en Hetzner VPS via Coolify (sslip.io).

**Fase 1 entregado (v1.0.0, 2026-05-26):**
- Schema extendido: `OrganizationAddress`, `Category`, `Product`, `CustomerPrice`, `Cart`/`CartItem`, `Order`/`OrderLine`, `ImpersonationLog`, `Session.{activeOrgId,impersonatingOrgId,lastSeenAt}`, `User.{isPlatformAdmin,preferredCatalogView}`.
- 5 módulos nuevos con TDD: `catalog`, `pricing` (con `validFrom/validUntil`), `cart` (snapshot pricing), `orders` (Postgres sequence per year + advisory lock, FOR UPDATE + atomic stock + cart clear), `checkout` (review + confirm con issue detection).
- `lib/money.ts` con helpers Decimal(12,2) + ADR 0008.
- Storefront: `/catalog` (toggle cards/lista persistente), `/products/[slug]`, `/cart`, `/checkout` wizard 4 pasos, `/orders`, `/orders/[id]`, `/select-org`.
- Admin: `/admin/products`, `/admin/categories`, `/admin/orders` (transiciones + cancel restaura stock), `/admin/customers`, `/admin/customers/[id]/prices`, impersonation entry.
- Auth middleware: `lastSeenAt` + auto-expira impersonation tras 30min. Server actions `switchActiveOrg` (limpia carrito) + `impersonationStart/Stop`.
- tRPC v10 server-side (catalog, pricing, orders) + `/api/trpc/[trpc]`. RSC + server actions como patrón principal (ADR 0007).
- Vitest: 71/71. Playwright E2E: 8/8. Coverage en módulos críticos > 80%.
- ADRs 0004-0009 (product model, pricing, impersonation, tRPC/server-actions coexistence, money, orderNumber).
- Runbooks: order-state-management, customer-pricing, impersonation.
- Seed `prisma/seed.ts`: admin@example.com + Acme Wholesale org + 6 productos + 2 CustomerPrice overrides.
- CI extendido: e2e job con Postgres+seed.

**Fase 2 entregado (v2.0.0, 2026-05-26):**
- Schema extendido: `Quote`, `QuoteLine`, `QuoteAuditLog`, `Invoice`, `ApprovalRequest`, `Notification`, `OrganizationCatalogAccess`, `ProductPriceTier` + Org/User/Product/Category extensions (creditLimit, paymentTerms, approvalThreshold, isPrivate, etc.) + 8 nuevos enums.
- Per-year Postgres sequences `quote_seq_YYYY`/`invoice_seq_YYYY` con advisory lock + auto-creación.
- Módulos nuevos con TDD: `notifications` (dispatch + retry), `approvals` (request/decide con subscribe-registry), `accounts` (invoices + creditCheck), `quotes` (numbers + service + conversion + expire). Extensiones: `catalog.visibility`, `pricing.tiers`, `orders.approval-hook`.
- Email: `react-email` v1 templates + Resend SDK v6 con noop fallback (sin RESEND_API_KEY no se rompe).
- Feature flags activos: `rfq`, `credit`, `privateCatalogs`, `approvals`, `volumeDiscounts` (defaults ON en `store.config.ts`).
- Storefront: `/quotes` (inbox + draft + detail), `/invoices`, `/approvals`, `/notifications` + `NotificationBadge` en header. Producto: tier table + RFQ button + private badge.
- Admin: `/admin/quotes`, `/admin/invoices` (markPaid), `/admin/approvals` (read-only history), `/admin/customers/[id]/credit` (creditLimit + paymentTerms + threshold + catalog access). Productos: private toggle + per-product tier mgmt. Dashboard: widgets gated.
- Vitest: 119/119 passing (+ 6 skipped). Playwright E2E: 7/7 fase2.spec.ts.
- ADRs 0010-0014, 5 runbooks (quotes, approvals, credit, private-catalogs, notifications).

**Fase 3 entregado (v3.0.0, 2026-05-26):**
- Schema: `SearchIndexQueue` + 2 enums + `Product.embedding` (vector 512) / `embeddingUpdatedAt` / `searchableText`. HNSW idx con vector_cosine_ops (m=16, ef_construction=64). ADR 0019 documenta el patrón `Unsupported("vector(512)")` + `$queryRaw`.
- Lib wrappers: `lib/meilisearch.ts` (Meilisearch Cloud SDK + noop fallback + `buildAccessFilter`), `lib/voyage.ts` (HTTP fetch, voyage-3-lite 512 dims, retry split: query fail-fast / document full backoff), `lib/rate-limit.ts` (in-memory LRU per IP, ANON_SEARCH_LIMITS 10/min 100/h).
- Módulo `modules/search/` con TDD: `rrf` (k=60), `facets` (categoría + 4 buckets precio + stock), `access` (`getAccessGrants` + `filterAccessibleIds` defense-in-depth), `embeddings` (wrapper Voyage + `buildSearchableText` + `formatVectorForPostgres`), `index-queue` (`enqueueIndex` idempotente + `processIndexQueue` con FOR UPDATE SKIP LOCKED, MAX_ATTEMPTS=5), `query` (orquestador hybrid + exact-SKU pre-check + fallback ILIKE + 5 modos).
- Storefront: `/` homepage real (hero + tagline + search prominente + FeaturedGrid), SearchBar en header storefront, `/search` con FacetSidebar + Pagination + rate-limit anonymous + aria-live results count.
- Admin: `/admin/search` stats (pending/processing/done/failed) + reindex todo + retry failed inline.
- Hooks: admin product create/toggleActive/togglePrivate + new toggleCategoryPrivacyAction reenqueue products on category isPrivate change.
- Scripts ops: `process-search-index-queue` (cron 1min), `cleanup-stale-search-queue` (semanal 03:00 UTC dom), `bootstrap-search-index` (post-deploy), `init-meilisearch-index` (one-shot settings).
- Feature flag `modules.semanticSearch` (ya existía Fase 2, default true en seed/demo). Meilisearch always-on; semantic toggle controla Voyage.
- Seed extendido: 6 productos auto-enqueued post-creación.
- Vitest: 157/157 passing (+ 6 skipped). Playwright E2E: 6/6 fase3.spec.ts (homepage + anon search + private hidden + admin gate).
- ADRs 0015-0019 (Meilisearch Cloud, Voyage choice, RRF+exact-SKU, cron worker vs background, Unsupported vector pattern), 3 runbooks (search-operations, search-reindex, search-troubleshooting).
- store.config.ts: `identity.tagline` opcional agregado al schema.

**Fase 4 entregado (v4.0.0, 2026-05-30):**
- Fundación módulo `modules/ai/`: `AIProvider` (`@anthropic-ai/sdk` con cliente cacheado, noop fallback sin `ANTHROPIC_API_KEY`), `budget` (`AiUsage` per-mes, kill-switch `AI_MONTHLY_TOKEN_BUDGET`), `content-jobs` (cola `AiContentJob` con `FOR UPDATE SKIP LOCKED`, MAX_ATTEMPTS=5, clon del patrón Fase 3), errors tipados, presets de rate-limit `AI_CHAT_LIMITS`/`AI_CONTENT_GEN_LIMITS`.
- Config: bloque `ai` canónico (`model` / `contentModel` Sonnet / `chatModel` Haiku 4.5 / flags). `identity.brandVoice` opcional. `modules.aiChat` legacy retirado.
- i18n cookie-based (Corte 0.5): `User.preferredLocale`, `getLocale()` server-side, fallback chain user→cookie→default, `LocaleSwitch` en header storefront, helper `t(locale, key)` (sin librería externa).
- Corte 1 (content): módulo `modules/ai/content/` (prompt builder con guardrail "no inventa" + `dominio-como-datos`, parser de secciones, service `generateContentForProduct`, `publishContent` con gate `isPlatformAdmin` + reindex post-publish). Admin UI `/admin/products/[id]` con genera/regenera + publica por locale. Bulk "Generar todo" en `/admin/products`. Worker `scripts/process-ai-content-jobs.ts`. PDP renderea `ProductContent` published del locale activo + `generateMetadata` SEO. Importadas 9 imágenes webp Pi-Power (~50KB cada). Loader extendido con `attributes` reales + `compatibleModels`. Badge "Tag-On Flex" en ProductCard + PDP cuando `attributes.flex_included === 'tag-on'`.
- Corte 2 (chatbot): módulo `modules/ai/chat/` con tool-use (3 tools: `searchProducts`, `getProductDetail`, `checkCompatibility`), B2B pricing/access enforced en cada tool, system prompt + guardrails off-topic, MAX_TOOL_ROUNDS=5. Endpoint `POST /api/ai/chat` con rate-limit `AI_CHAT_LIMITS`. Widget flotante `ChatWidget` montado por storefront layout cuando flag activo.
- Corte 3 (recommendations): módulo `modules/ai/recommendations/` con `getRelatedProducts` (vecinos pgvector cosine) y `getPersonalizedRecommendations` (heurística sobre historial OrderLine). Sin LLM en hot path. Filtra por `filterAccessibleIds` (Fase 3) para respetar visibilidad B2B. Componente `RelatedProducts` en PDP con título dinámico.
- Schema delta: `AiUsage`, `AiContentJob` + enum, `ProductContent` + enum `ProductContentStatus`, `Product.attributes/compatibleModels/content`, `User.preferredLocale`, `identity.brandVoice` Zod block.
- Vitest: 208/208 passing (+ 6 skipped). Lint+typecheck+build limpios.
- ADRs 0020-0025 (provider+model split, attrs JSON, ProductContent multilingual, chatbot tool-use, recommendations pgvector, i18n cookie). Runbooks: ai-content, ai-chat, ai-recommendations.
- Flags `ai.content`, `ai.chat`, `ai.recommendations` activos por default en `store.config.ts` (inertes sin `ANTHROPIC_API_KEY`).

**Fase 5 entregado (v5.0.0, 2026-06-01):**
- **Corte 0 — Bus de eventos:** `DomainEvent` + `EventDelivery` (transactional outbox + FOR UPDATE SKIP LOCKED). Registro tipado boot-time (`registerSubscriber` idempotente por name). `dispatchPending` con MAX_ATTEMPTS=5 + EventDelivery por suscriptor. Contrato v1 congelado: 11 tipos. Scripts `process-domain-events`/`cleanup-domain-events`.
- **Corte 1 — Verificación B2B:** `Organization.{verificationStatus, country, taxExempt, verifiedAt}` + `TaxDocument` + 3 enums. `modules/verification` con auto-aprobación al cargar certificado (transaccional: upload R2 → TaxDocument APPROVED → Organization VERIFIED + taxExempt → emit `customer.verified`). Gate en `checkout.confirm()` bloquea orgs no verificadas. Seed RepairHub Co migrado a PREPAID + pre-verificado para demo. `lib/storage` con `FakeStorage` in-memory (R2/Hetzner-ready interface).
- **Corte 2 — Pagos PSDD:** Stripe Checkout + wire/ACH. `Payment` + `PaymentEvent` (append-only) + `SensitiveActionToken` + 3 enums. `FakeStripe` con HMAC sha256 verify. `handleStripeWebhook` = única fuente de verdad: dedup por eventId UNIQUE → mismatch detection → NEEDS_REVIEW + auto-refund + audit | happy: tx con row lock + atomic stock decrement + CAPTURED + emit `payment.captured`. `reconcileWire` idempotente por `wire-${ref}` eventId. Refunds gated por step-up email-OTP (SHA-256 hashes + TTL 10min + single-use + scope userId+action+subjectId). `docs/psa-checklist.md` §1-§11.
- **Corte 3 — Contabilidad doble partida:** `LedgerAccount` + `AccountingPeriod` + `JournalEntry` (append-only, eventId UNIQUE) + `JournalLine` (BIGINT centavos) + 3 enums. Chart of accounts (12 cuentas, dominio-como-datos). `postEntry` valida débitos=créditos, XOR debit/credit por línea. `POSTING_RULES` para invoice.issued + payment.captured + payment.reconciled + payment.refunded. Property test 100 inputs × 4 reglas. `closePeriod` con guard (posteo en CLOSED → throw). `trialBalance` report. Append-only guard en `lib/db/client.ts` bloquea UPDATE/DELETE en JournalEntry/JournalLine/PaymentEvent (`APPEND_ONLY_GUARD=off` en tests). `accountingSubscriber` registrado boot-time. `docs/psa-checklist.md` §12.
- **Corte 4 — Envíos FedEx + Miami forwarder:** `Shipment` + 3 enums. `lib/fedex` `FakeFedex` (Ground-only, US-only, idempotent labels). `quoteShipment`: destino US → FedEx Ground; no-US → marca isExport (manual forwarder). HAZMAT_LIMITS (maxCells=100, maxWattHours=300). `dispatchShipment` compra etiqueta + emite `shipment.dispatched`.
- **Corte 5 — Email transaccional outbox-driven:** `NotificationType` extendido (5 nuevos: ORDER_PLACED, PAYMENT_CAPTURED, PAYMENT_RECONCILED, INVOICE_ISSUED, SHIPMENT_DISPATCHED). 5 plantillas react-email (CTA wrap sobre BaseTemplate). `emailSubscriber` mapea evento → NotificationType + recipients + dispatch(). Idempotente vía EventDelivery `(eventId, subscriber)`. Las 14 plantillas Fase 2 se conservan sin duplicar.
- **Corte 6 — Analytics PostHog + GA4 server-side:** `lib/analytics` `AnalyticsClient` interface + `FakeAnalytics` + `PosthogGa4Analytics`. Noop-safe sin `POSTHOG_API_KEY`/`GA4_MEASUREMENT_ID`. `analyticsSubscriber` captura 8 event types. `getInternalKpis` derivado del ledger (revenueCents, receivableCents cuenta 1100, topProducts).
- **Corte 7 — Webhooks salientes HMAC:** `WebhookEndpoint` + `WebhookDelivery` + `WebhookDeliveryStatus`. HMAC sha256 + timingSafeEqual. `enqueueDeliveries` idempotente por `(endpointId, eventId)`. `processPendingDeliveries` FOR UPDATE SKIP LOCKED + MAX_ATTEMPTS=5. `replayDelivery`. Subset público curado: 8 tipos (no payment.failed/authorized). `scripts/process-webhook-deliveries.ts`.
- Vitest: 270/270 passing (+ 6 skipped). Lint+typecheck+build limpios.
- ADRs 0026-0033: event bus outbox, payments PSDD, ledger BIGINT, doble partida append-only, R2 storage, multimoneda informativa, step-up auth, append-only enforcement.
- Runbooks: event-bus, payments, accounting, shipments, outbound-webhooks.
- Pendientes ops (Herney provisiona): Stripe live keys, FedEx API, Cloudflare R2, PostHog/GA4, rol Postgres `app_rw` (hardening append-only DB), staging Coolify con Stripe test-mode.

## Rediseño UI en curso (pre-launch)

**Dirección aprobada:** "Back to 100%" — oscuro, técnico, lima como acento único.  
**Spec maestro:** `docs/specs/2026-06-11-ui-redesign-design-system.md`  
**Mockup de referencia:** `docs/mockups/pipower-back-to-100.html` *(placeholder — Herney agrega el hi-fi)*

**Método de ejecución:** superficie por superficie — branch `redesign/<superficie>` + PR, review de Herney en localhost antes de merge. No mergear sin confirmación.

**Estado:**
- **Home — HECHO** (PR #30 mergeada). Reconciliada con el design system.  
  Componentes compartidos: `components/commerce/StatStrip.tsx`, `components/commerce/SpecReadout.tsx`.
- **Header — HECHO** (branch `redesign/header`, mergeada). Chrome único "Back to 100%" para storefront + account + home vía `Header.tsx` presentacional con `variant='home'|'inner'` + `HeaderContainer.tsx` (server, único punto de fetch). `StoreHeader` legacy borrado, namespaces i18n consolidados en `header.*`. `AccountMenu` (dropdown a11y) + `MobileNav` (drawer Vaul). Spec: `docs/superpowers/specs/2026-06-13-header-unification-design.md`.
- **Catálogo + ProductCard — HECHO** (branch `redesign/catalog`, mergeada). `ProductCard` dir. B (chips por atributo dirigidos por `attributes`/categoría, sello `0-cycle · 100%`, stepper `− [n] +`, 3 estados de stock punto+texto, Notify) = **card único** aplicado también a PDP-related + `/search` (helpers en `components/commerce/product-display.ts`, gating B2B en `lib/catalog/card-context.ts`). `ProductListRow` (Vista B densa) mismo sistema. Chrome `/catalog`: tabs `aria-current`, toggle lima, `catalog.loginForPrice`. Seed swap a catálogo Pi-Power real (15 productos, imágenes locales → cierra FU-011). Spec: `docs/superpowers/specs/2026-06-14-catalog-productcard-design.md`. **Nota:** el **home quedó intacto** (sus featured cards ya eran "Back to 100%" del PR #30, no usan el card del catálogo); `FeaturedGrid.tsx` legacy borrado (código muerto). Pendiente ops: precios Plug & Play (Herney), capacidad +X% (FU-010).

**Orden restante:**
1. **PDP** ← siguiente superficie (acá va el `SpecReadout` instrumento completo + galería)
2. Carrito + Checkout (Vaul drawer mobile)
3. Auth (sign-in / sign-up)
4. Cuenta / Admin
5. Barrido i18n storefront (claves pendientes — transversal)

**Nota DX importante:** vitest necesita `DATABASE_URL` explícito en el entorno.  
Sin él, ~239 tests fallan con `PrismaClientInitializationError` — **no son regresión**, es un problema de entorno.  
Correr siempre como: `DATABASE_URL="postgresql://postgres:postgres@localhost:5435/online_store_dev" STORE_ID=pipower pnpm test`

---

## Decisiones de stack (no abrir sin ADR nuevo)

- TypeScript estricto (`noUncheckedIndexedAccess: true`).
- Next.js 14 (App Router, single app — NO monorepo hasta Fase 6).
- Tailwind + shadcn/ui (instalar shadcn cuando se necesite).
- tRPC para API tipado end-to-end.
- Prisma + PostgreSQL 16 con extensión pgvector.
- Auth.js v5 con Resend para magic links. Modelo de organizaciones B2B propio (no Clerk).
- Hosting: Hetzner VPS CX22 ($6/mes, Ashburn USA East) + Coolify open-source.
- Email: Resend.
- Observabilidad: Sentry + Pino + (futuro) Uptime Kuma externo.
- Linting: Biome (NO ESLint+Prettier).
- Testing: Vitest (unit), Playwright (e2e).

Más detalle en `docs/adr/` cuando estén escritos.

## Convenciones de código

1. **TDD obligatorio** en módulos críticos: `modules/config`, `modules/customers`, futuros `modules/checkout`, `modules/pricing`, `modules/orders`. Test primero, ver fallar, implementar mínimo, ver pasar, commit.
2. **Módulos cerrados:** cada carpeta en `modules/` expone API sólo vía su `index.ts`. Otros módulos importan desde `modules/<name>` (no desde `modules/<name>/service.ts`). Esto facilita el refactor a packages en Fase 6.
3. **Imports:** usar alias `@/*` (root). Type-only imports con `import type`.
4. **Commits pequeños:** un commit por sub-task funcional. Conventional Commits (`feat:`, `chore:`, `fix:`, `docs:`, `test:`).
5. **No introducir alternativas al stack** (ej: Drizzle en lugar de Prisma) sin ADR.
6. **Sin warnings críticos** en `pnpm build`. CI bloquea el merge si lint, typecheck o tests fallan.
7. **WCAG 2.1 AA obligatorio** en cualquier pantalla nueva del storefront/admin.

## UI — dirección híbrida

Storefront tiene dos vistas:
- **Vista A — cards (default):** descubrimiento, mobile, compradores nuevos.
- **Vista B — lista densa (toggle):** re-orden, compras grandes, CSV upload.

El toggle persiste por usuario y por organización. Misma data, dos UX. NO hacer dos implementaciones separadas: un solo componente que renderiza según el modo activo.

## Cómo cerrar una fase

1. Verificar uno a uno los criterios de aceptación del spec.
2. Correr `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — todo verde.
3. Actualizar la tabla "Estado del proyecto" en `ROADMAP.md`.
4. Tag de release: `v0.<fase>.0`.
5. Notificar a Herney en Cowork: "Fase X cerrada, lista para revisión y brainstorming de Fase X+1".

## Cuando consultar a Herney en Cowork

- Decisión de arquitectura nueva no cubierta por ADRs existentes.
- Diseño visual de cualquier pantalla nueva (mockup antes de implementar).
- Cambios al stack o introducción de dependencias mayores.
- Cualquier ambigüedad en el spec actual.

## Memoria persistente del proyecto

La memoria Anthropic guarda contexto entre sesiones de Cowork. Para Claude Code CLI, este archivo (`CLAUDE.md`) es el reemplazo equivalente. Mantenerlo actualizado al cerrar cada fase y al introducir decisiones nuevas.
