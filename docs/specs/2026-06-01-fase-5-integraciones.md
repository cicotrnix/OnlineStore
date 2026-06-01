# Fase 5 — Integraciones externas y contabilidad propia

> Spec de diseño. Resultado del brainstorming en Cowork (2026-06-01).
> Estado: **rev 2 — diseño aprobado, hallazgos de code review (CC) incorporados. Pendiente de plan de implementación**.
> Enfoque elegido: **C — dos vías en paralelo conectadas por un bus de eventos**.

## 1. Contexto y objetivo

Las fases 0–4 dejaron la tienda PiPower viva en producción (catálogo, B2B, búsqueda, IA), pero **el checkout crea la orden y no procesa pago real**. Fase 5 convierte la tienda en transaccional de punta a punta y le da **contabilidad propia** dentro de la plataforma.

La fase se diseña como **un solo spec ejecutado en una pasada**, dividido en cortes internos. La tienda concreta (baterías) sigue siendo la prioridad; el dominio entra como datos/config, nunca hardcodeado (ver `[[online-store-strategy-concrete-first]]`).

## 2. Alcance

Siete piezas:

1. **Verificación / onboarding B2B** — solo negocios verificados compran.
2. **Pagos** — Stripe Checkout (tarjeta) + wire/ACH (conciliación).
3. **Envíos** — FedEx API doméstico (USA) + export entregado a forwarder en Miami.
4. **Email transaccional** — ampliado sobre Resend.
5. **Contabilidad doble partida (Nivel 2)** — el sistema es la contabilidad oficial.
6. **Analytics** — dashboards internos + PostHog + GA4.
7. **Webhooks salientes** — eventos firmados hacia integraciones externas.

### Enfoque arquitectónico (C)

Dos tracks que **no se tocan directamente**, conectados por un **bus de eventos** interno:

- **Track comercial** (produce eventos): verificación → pagos → envíos → email.
- **Track financiero** (consume eventos): contabilidad → analytics → webhooks.

Cambiar un track no rompe al otro mientras el contrato de eventos se respete.

## 3. Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Pago | Tarjeta (Stripe Checkout hosted) + transferencia/wire/ACH. **Sin** Net 30 por ahora. |
| Acceso | **Solo B2B verificado.** Nadie compra sin verificación. |
| Verificación | **Auto-aprobación** al cargar el certificado de reventa (USA) o documento equivalente (export). |
| Impuestos | **Reseller con certificado = exento.** No se cobra sales tax; export tampoco. Sin motor de impuestos. |
| Envío USA | **FedEx API**, solo servicios terrestres (hazmat clase 9 → ground-only). |
| Envío export | Cliente se hace cargo: **entregamos/enviamos a Miami** (forwarder o pickup). Sin transportista internacional. |
| Hazmat litio | v1: FedEx Ground + captura de flag + papeleo DG **manual** (sin declaración DG automatizada). |
| ERP | **Contabilidad propia** dentro de la plataforma (no QuickBooks/Xero). |
| Nivel contable | **Nivel 2 — doble partida completa** (libro mayor, balance, P&L). |
| Base contable | **Devengado (accrual)** — reconoce ingreso al facturar, lleva CxC. |
| Moneda | Pagos y libro mayor en **USD**. Multimoneda **solo informativa** (display, no afecta contabilidad). |
| Analytics | **PostHog + GA4** (producto + marketing). |
| Webhooks | Salientes, firmados (HMAC), con reintentos y replay. |
| Almacenamiento de certificados | **Object storage S3-compatible** (Cloudflare R2 o Hetzner), URL firmada, solo-admin, cifrado en reposo. |
| Net 30 (Fase 2) | **Inerte vía flag** (`payments.netTerms=false`): checkout fuerza prepaid/wire, demo baja a PREPAID. Re-activable sin rehacer. |
| 2FA acciones sensibles | **Email-OTP step-up** + token de acción sensible (el login sigue passwordless magic-link). |
| Entorno de pruebas | **Segunda instancia Coolify (staging)** para Stripe test-mode antes del cutover a live. |
| Validación de certificado | Auto-aprobación **sin verificación externa** (formatos varían por estado/país); decisión de negocio, admin puede revocar. |

## 4. Sección 1 — Bus de eventos (fundación, contrato compartido)

### Mecanismo: transactional outbox

Cada mutación del dominio relevante escribe una fila en `DomainEvent` **dentro de la misma transacción** que el cambio (elimina el dual-write problem). Un worker despachador (cron, `FOR UPDATE SKIP LOCKED`, mismo patrón que los workers de Fase 3/4) lee pendientes y los reparte a los suscriptores. Durabilidad + orden + replay **sin infraestructura nueva** (Postgres + Next.js; no Kafka/SQS, no rompe ADRs de stack).

### Contrato de eventos v1 (tipado, versionado, inmutable)

Cada evento lleva `eventId`, `type`, `aggregateType`, `aggregateId`, `payload`, `occurredAt`. Montos en centavos + moneda.

- `customer.verified`
- `order.placed`
- `payment.authorized` / `payment.captured`
- `payment.reconciled` (wire conciliado)
- `payment.refunded` / `payment.failed`
- `shipment.dispatched`
- `invoice.issued` / `invoice.paid` / `invoice.overdue`

### Suscriptores

Se registran por tipo de evento, **idempotentes** por `(suscriptor, eventId)`; si uno falla reintenta solo, sin bloquear a los demás (filas `EventDelivery` por suscriptor). Entrega *at-least-once*, orden por agregado.

- **Contabilidad** → asientos de doble partida.
- **Email** → plantillas Resend.
- **Webhooks** → entrega saliente firmada.
- **Analytics** → eventos server-side a PostHog/GA4.
- **Notification in-app (Fase 2)** → notifica al comprador (ej: `order.placed`, `shipment.dispatched`), para que su dashboard reaccione al nuevo flujo.

**Registro de suscriptores:** boot-time tipado (mismo patrón que el approval registry de Fase 2), no DB-driven — más simple y verificable.

**Retención:** `DomainEvent` se conserva 180 días (para replay) y `EventDelivery` 90 días; un cron de limpieza purga lo vencido.

## 5. Sección 2 — Track comercial (produce eventos)

### 5a. Verificación / onboarding B2B

- `Organization` gana `verificationStatus` (pending/verified/rejected), `country`, `taxExempt`.
- `TaxDocument`: `type` (US_RESALE_CERT | FOREIGN_EQUIV), `number`, `jurisdiction`, `fileKey` (R2), `status`, `uploadedAt`.
- Flujo: registro (magic-link existente) → formulario onboarding (razón social, dirección, país, número de certificado + **subida de archivo**) → **auto-aprueba** con certificado + campos requeridos → emite `customer.verified` → marca org `verified` + `taxExempt`.
- **Gate:** checkout bloqueado salvo `verified`. Admin conserva vista para revisar/revocar.
- **Limitación documentada:** la auto-aprobación **no valida** el certificado contra organismos estatales (los formatos varían por estado/país). Riesgo de compliance asumido como decisión de negocio; el admin puede revocar en cualquier momento.

### 5b. Pagos (rigor PSDD)

Invariante común: **el stock solo baja tras pago verificado.**

**Tarjeta — Stripe Checkout hosted:**
- Sesión con idempotency key. **El webhook firmado es la única fuente de verdad** (nunca confirmar desde la URL de retorno).
- `PaymentEvent.eventId` único como idempotencia primaria.
- Verificar monto + moneda + orderId + estado antes de marcar pagada.
- Decremento de stock + transición a pagada en **una transacción con row locks**.
- Mismatch → `needs_review` + auto-refund + audit + alerta.
- Refunds: permiso + **email-OTP step-up** + re-auth fresca + token de acción sensible + idempotency key. Ejecución solo vía Stripe API; nunca marcar reembolsado sin confirmación de webhook.

**Wire/ACH:**
- Orden colocada → `invoice.issued` con instrucciones de wire (email) → admin **concilia** el ingreso contra la factura → emite `payment.reconciled` → orden pagada.
- Lo no cobrado vive en cuentas por cobrar (Sección 3).

**Restock en refund/cancelación:** **antes** del envío → restaura stock (`restoreStock` de Fase 1) en la misma transacción del reverso; **después** del envío → no auto-restock (manual). `payment.refunded` dispara el asiento reversor en contabilidad.

### 5c. Envíos

- **USA — FedEx API:** cotización en checkout restringida a **servicios terrestres** (respeta `requires_ground_shipping` + hazmat clase 9), etiqueta + tracking, emite `shipment.dispatched`. Cliente Fake para tests.
- **Export:** captura dirección de **forwarder en Miami**; despacho doméstico a Miami o pickup; cliente gestiona lo internacional.
- **Hazmat:** v1 restringe a Ground + captura flag; papeleo DG manual. El cotizador aplica **límites configurables por paquete** (cantidad de celdas y watt-hours) y **rechaza** los que excedan el límite (valores exactos como config/dominio-como-datos, a fijar con ops).

### 5d. Email transaccional

Sobre Resend + react-email (ya existe). Todas las plantillas son **suscriptores de eventos** (no envíos inline), idempotentes:

- `order.placed` → confirmación
- `payment.captured` / `payment.reconciled` → recibo de pago
- `invoice.issued` → instrucciones de wire
- `shipment.dispatched` → tracking
- `invoice.overdue` → recordatorio de cobranza

Las **14 plantillas existentes de Fase 2** (`modules/notifications/email/templates`) se **migran** al patrón outbox-driven (disparadas por eventos), no se duplican.

## 6. Sección 3 — Track financiero (consume eventos)

### 6a. Contabilidad doble partida (Nivel 2, accrual, USD)

- **Plan de cuentas** configurable (dominio-como-datos: se siembra, es editable): activos, pasivos, patrimonio, ingresos, gastos, COGS.
- **Reglas de posteo** mapean evento → asiento balanceado (débitos = créditos). Ejemplos:
  - `invoice.issued` → Dr Cuentas por Cobrar / Cr Ingresos.
  - `payment.captured` (tarjeta) → Dr Stripe-clearing / Cr CxC; y Dr COGS / Cr Inventario.
  - `payment.reconciled` (wire) → Dr Banco / Cr CxC.
  - `payment.refunded` → asiento reversor.
- **Integridad:** libro diario **append-only** (sin grant UPDATE/DELETE al usuario de la app); correcciones vía **asientos reversores**; `AccountingPeriod` con cierre/bloqueo. Posteo **idempotente por `eventId`**.
- **Salidas:** Libro Mayor, Balance de Comprobación, Balance General, Estado de Resultados (P&L), aging de CxC, reportes COGS/margen (costo de proveedor ya en datos).

### 6b. Analytics

- **Dashboards internos** (admin): ventas, productos top, conversión, CxC, margen — alimentados por los mismos datos/eventos.
- **Externo:** suscriptor emite eventos server-side a **PostHog** (producto/embudos) y **GA4** (tráfico/marketing). Noop-safe sin claves.

### 6c. Webhooks salientes

- `WebhookEndpoint` (url, secreto, eventos suscritos) + `WebhookDelivery` (estado, intentos, replay).
- Payloads **firmados (HMAC)**, reintentos con backoff, log de entregas, UI admin para gestionar/replay.
- Se expone un **subconjunto curado** del contrato interno: `order.placed`, `payment.captured`/`reconciled`, `shipment.dispatched`, `invoice.*`.

## 7. Sección 4 — Transversal

### Modelo de datos (deltas Prisma)

`Organization` (+verificationStatus, country, taxExempt); `TaxDocument`; `DomainEvent` (outbox) + `EventDelivery`; `Payment` + `PaymentEvent` (ids Stripe, estado, monto, idempotencyKey, eventId único); `Shipment` (carrier, servicio, tracking, labelUrl, forwarder, hazmat); `Account`, `JournalEntry` (append-only) + `JournalLine` (cuenta, debitCents/creditCents), `AccountingPeriod`; `WebhookEndpoint` + `WebhookDelivery`. CxC se deriva de `Invoice` (Fase 2) + pagos.

### Convención de dinero

El resto de la app sigue con Decimal(12,2) (ADR 0008). El **libro mayor usa enteros en centavos (BIGINT)** para garantizar débitos = créditos exactos al centavo (principio PSDD), convirtiendo en el borde del evento. Multimoneda informativa: un display de equivalente local (tasa de referencia) que **no** se postea ni afecta la contabilidad; la tasa proviene de una **fuente gratuita cacheada a diario** (ECB/Frankfurter).

### Seguridad (ADR derivado del PSDD de PiPower)

- Webhook Stripe firmado y verificado vía SDK; idempotencia por `eventId`.
- Tablas **append-only** (payment_events, audit_logs, journal entries): **enforced a nivel app** (guard de Prisma que bloquea UPDATE/DELETE en esos modelos) desde ya, **más** un rol Postgres restringido (`app_rw` sin UPDATE/DELETE en esas tablas) como hardening — ver §13.
- Refunds: 2FA + re-auth fresca + token de acción sensible.
- Rate-limit en creación de checkout y endpoint de webhook.
- Secretos solo en env (Coolify). Certificados: URL firmada, solo-admin, cifrado en reposo (R2).

### Testing (TDD obligatorio en módulos críticos)

- **Pagos:** suite análoga al PSDD §16 — idempotencia de webhook, replay, doble-cargo, mismatch→needs_review, auth de refund.
- **Contabilidad:** **property test "débitos = créditos"** en cada regla de posteo, idempotencia, bloqueo de período, asientos reversores.
- **Envíos:** cotización ground-only, ruta export forwarder.
- **Webhooks:** firma HMAC, reintento, replay.
- **Bus:** outbox atómico, despacho idempotente, reintento por suscriptor.
- Clientes **Fake** (Stripe/FedEx) para tests deterministas.
- **E2e:** gate de verificación bloquea checkout; checkout tarjeta (Stripe test-mode) → pagada → asiento posteado → email → webhook entregado; flujo wire.

### Config / flags (`store.config.ts`)

Se **extiende** el bloque `payments` existente (Zod actualizado, no se reemplaza) con stripe/wire/`netTerms`, y se agregan `shipping` (fedex, export), `accounting` (basis=accrual, baseCurrency=USD), `analytics` (posthog, ga4), `webhooks`. Todos **noop-safe sin claves** (igual que el bloque `ai`).

## 8. Cortes y orden de ejecución

Contract-first. CC ejecuta secuencial; los tracks solo dependen del contrato, así que el financiero puede construirse/probarse contra eventos-fixture aunque sus productores aún no existan.

- **Corte 0 — Fundación de eventos:** `DomainEvent` outbox + dispatcher + `EventDelivery` + registro tipado + contrato v1 **congelado**. Desbloquea ambos tracks.
- **Corte 1 — Verificación B2B** (+ almacenamiento R2 de certificados, gate de checkout, exención).
- **Corte 2 — Pagos** (Stripe Checkout PSDD + wire/ACH). ADR + checklist PSA antes de merge.
- **Corte 3 — Contabilidad doble partida** (ya hay eventos de pago/factura que postear). ADR + checklist antes de merge.
- **Corte 4 — Envíos** (FedEx + export Miami).
- **Corte 5 — Email transaccional**.
- **Corte 6 — Analytics** (dashboards internos + PostHog + GA4).
- **Corte 7 — Webhooks salientes**.

Cada corte: TDD → tests verdes → `lint && typecheck && test && build` → commit. Pagos y contabilidad llevan checklist de aceptación tipo PSA.

## 9. Criterios de aceptación (alto nivel)

- Un negocio no verificado **no puede** llegar a pagar; al cargar certificado válido se auto-aprueba y queda exento.
- Una compra con tarjeta solo se marca pagada por **webhook verificado**; el stock baja en la misma transacción; un replay del webhook no duplica.
- Un wire conciliado emite `payment.reconciled` y salda la CxC correspondiente.
- Cada pago/factura/envío genera asientos **balanceados** (débitos = créditos), idempotentes, en USD.
- El Balance General y el P&L cuadran; el aging de CxC refleja lo no cobrado.
- Envíos USA cotizan solo servicios terrestres; export captura forwarder en Miami.
- Cada evento del subconjunto público se entrega firmado al webhook registrado, con replay disponible.
- PostHog y GA4 reciben los eventos server-side; sin claves, todo es noop.
- `lint && typecheck && test && build` + e2e verdes.

## 10. ADRs nuevos a escribir

- Bus de eventos: transactional outbox vs broker externo.
- Pagos: arquitectura PSDD adaptada a Next.js/Stripe (webhook como fuente de verdad).
- Dinero en el ledger: enteros en centavos (BIGINT) vs Decimal(12,2).
- Contabilidad: doble partida append-only + base devengado.
- Almacenamiento de documentos sensibles (R2, URL firmada).
- Multimoneda informativa (display only).
- Step-up auth (email-OTP) + token de acción sensible para refunds/cierre de período.
- Enforcement de append-only: guard de app + rol DB restringido.

## 11. Fuera de alcance (YAGNI)

- Net 30 / financiación de crédito en el flujo de pago (el modelo de Fase 2 queda inerte).
- Motor de impuestos / cálculo de nexo (todos exentos por certificado).
- Transportista internacional / declaración DG automatizada.
- Integración con ERP externo (QuickBooks/Xero).
- Multimoneda transaccional (FX en el ledger).

## 12. Riesgos

- **Contabilidad como sistema de registro:** un error de posteo es grave. Mitigación: append-only, property tests débitos=créditos, asientos reversores, bloqueo de período, checklist antes de merge.
- **Pagos:** superficie de ataque y dinero real. Mitigación: rigor PSDD, suite obligatoria, Stripe test-mode en staging antes de live.
- **Hazmat litio:** cumplimiento DG es legalmente sensible; v1 lo deja manual — documentar claramente la limitación.
- **Scope grande en una pasada:** mitigado por cortes independientes y el desacople por eventos.

## 13. Prerrequisitos operacionales

Gates para arrancar cortes específicos. **Crear las cuentas en paralelo al código** para no bloquear un corte al final.

**Cuentas externas:**
- Stripe account + webhook secret — antes de Corte 2.
- FedEx API credentials + cuenta business — antes de Corte 4.
- Cloudflare R2 (o Hetzner Object Storage) — antes de Corte 1.
- PostHog project + GA4 property — antes de Corte 6.

**Infra / ops:**
- Rol Postgres `app_rw` con grants restringidos (sin UPDATE/DELETE en tablas append-only) — hardening temprano, idealmente antes de Corte 0/2. (Hoy Coolify corre con un único user `postgres`; es un cambio de ops.)
- Infra de **email-OTP step-up** + token de acción sensible — antes de Corte 2 (Auth.js v5 hoy solo tiene magic-link; este es un sub-módulo nuevo, transversal).
- **Segunda instancia Coolify (staging)** con Stripe test-mode — antes de validar Corte 2.
- **Checklist PSA** (doc nuevo `docs/psa-checklist.md`) — antes de merge de Corte 2 y Corte 3.

## 14. Migración de Fase 2

- **Net 30:** `payments.netTerms=false`. El checkout deja de ofrecer NET_TERMS y fuerza prepaid/wire; el modelo de Fase 2 (`paymentTerms`, crédito, aprobaciones de crédito) queda **inerte y re-activable**. El demo seed (RepairHub Co, `NET_30`) baja a `PREPAID`. Facturas NET preexistentes en prod (si las hubiera) se respetan y se saldan vía wire.
- **Email:** migrar las 14 plantillas existentes (`modules/notifications/email/templates`) al patrón outbox-driven; no duplicar.
- **Notification in-app:** sumarla como suscriptor del bus para que el dashboard del comprador reaccione al nuevo flujo.
- **store.config `payments`:** extender el bloque existente (Zod actualizado), no reemplazar.
