# Auditoría de área — Arquitectura y dominio

**Semáforo:** 🟡 Amarillo

## Veredicto

El monolito modular es genuinamente sólido en los caminos de dinero: outbox transaccional, doble partida idempotente, webhook-como-fuente-de-verdad y append-only guard cumplen sus ADRs (0026-0029, 0033, 0035) verificados línea a línea. Sin embargo, hay una violación activa del ADR 0034 (el chatbot expone precios mayoristas a anónimos), el contrato de eventos v1 declara 3 tipos que nada emite (incluyendo el subset público de webhooks), y la preparación Fase 6 es real solo en config/theme — copy, branding y reglas de dominio (hazmat) siguen hardcodeados como código. Nada de esto es estructuralmente grave, pero el leak de precios y la erosión de fronteras de módulos merecen cierre pre-launch.

## Fortalezas confirmadas

- **Bus de eventos outbox implementa ADR 0026 fielmente: emit same-tx, FOR UPDATE SKIP LOCKED, idempotencia por (eventId, subscriber) con constraint en DB, MAX_ATTEMPTS=5 y re-encolado parcial**
  - Evidencia: `modules/events/outbox.ts:10-22, modules/events/dispatcher.ts:25-110, prisma/schema.prisma:754 (@@unique([eventId, subscriber]))`
- **Pagos PSDD cumplen ADR 0027: verificación de firma HMAC, dedup por eventId UNIQUE, mismatch → NEEDS_REVIEW + auto-refund, row lock FOR UPDATE para idempotencia de refund, y reconcileWire unificado (markInvoicePaidAction ya rutea por reconcileWire, no por markPaid legacy)**
  - Evidencia: `modules/payments/service.ts:117-230, prisma/schema.prisma:836 (eventId String @unique), app/admin/_actions-fase2.ts:87`
- **Contabilidad doble partida cumple ADR 0028/0029: BIGINT centavos, débitos=créditos validado, XOR debit/credit por línea, idempotencia por eventId UNIQUE, guard de período cerrado, y append-only guard app-level (ADR 0033) bloqueando update/delete/upsert en JournalEntry/JournalLine/PaymentEvent/AuditLog**
  - Evidencia: `modules/accounting/posting.ts:46-110, prisma/schema.prisma:937, lib/db/client.ts:12-38`
- **Fase 6 corte 0 cumple ADR 0035: registry estático stores/index.ts con fail-fast de STORE_ID en producción (sin fallback silencioso), cache 1-proceso-1-tienda, y migración completa — cero imports residuales de store.config raíz, 38 archivos consumen getStoreConfig()**
  - Evidencia: `stores/index.ts:27-47; output de grep: 0 hits de '@/store.config', 38 archivos con getStoreConfig, 'no root store.config.ts'`
- **Defensa en profundidad de visibilidad B2B (ADR 0013) consistente en las 3 superficies de descubrimiento: search filtra con filterAccessibleIds, recommendations re-filtra vecinos pgvector, y los tools del chatbot filtran con filterForOrg antes de devolver resultados**
  - Evidencia: `modules/search/query.ts:74,151,176; modules/ai/recommendations/service.ts:36; modules/ai/chat/tools.ts:79,103`
- **Patrón de workers homogéneo y verificado: claim con FOR UPDATE SKIP LOCKED + MAX_ATTEMPTS=5 replicado en eventos de dominio, search index queue y webhook deliveries, con idempotencia por constraint UNIQUE en cada cola**
  - Evidencia: `modules/events/dispatcher.ts:27-33; prisma/schema.prisma:1032 (@@unique([endpointId, eventId])); scripts/process-domain-events.ts:1-16`

## Hallazgos

### ARQ-1 · [P1] El chatbot AI filtra precios mayoristas a usuarios anónimos y orgs no verificadas, violando ADR 0034  *(esfuerzo S)*

**Evidencia:** `modules/ai/chat/tools.ts:54-63 (resolveForOrgSafe devuelve basePrice cuando orgId===null), app/api/ai/chat/route.ts:19-21 (acepta session null), app/(storefront)/layout.tsx:34 (ChatWidget montado para anónimos)`

**Detalle:** ADR 0034 decide explícitamente: 'no muestran precio para anónimos ni para orgs pending/rejected. Sólo orgs VERIFIED ven precio'. La PDP y el catálogo lo cumplen (landing.featured.loginForPrice), pero los tools searchProducts y getProductDetail devuelven priceResolved siempre: basePrice para anónimos y precio resuelto vía pricingService.resolveForOrg para cualquier org con sesión, sin chequear verificationStatus. El widget se monta en el layout público y el endpoint POST /api/ai/chat solo exige rate-limit por IP. Un competidor anónimo puede extraer la lista de precios mayorista completa preguntando al bot.

**Recomendación:** Gatear priceResolved en los tools con la misma lógica que la PDP: solo devolver precio si la org está VERIFIED (reusar isVerified de modules/verification); para anónimos/pending responder con el equivalente a loginForPrice. Agregar test que pruebe que runChat con orgId=null no incluye precios en tool results.

### ARQ-2 · [P2] Contrato de eventos v1 declara 3 tipos que nada emite (payment.authorized, invoice.paid, invoice.overdue) y el subset público de webhooks los anuncia  *(esfuerzo M)*

**Evidencia:** `modules/events/contract.ts:6,13,14; modules/webhooks/subscriber.ts:14-17 (expone invoice.paid/invoice.overdue); modules/accounts/scheduled.ts:4-36 (markInvoicesOverdue muta status y notifica directo, sin emitEvent); grep de emitEvent: solo shipments/verification/payments/orders, ninguno emite esos 3 tipos`

**Detalle:** El contrato v1 'congelado' (ADR 0026) incluye tipos sin productor: payment.authorized nunca se emite; invoice.paid quedó huérfano cuando el flujo se unificó en reconcileWire (que emite payment.reconciled); markInvoicesOverdue marca OVERDUE y despacha notificaciones directamente saltándose el bus, así que invoice.overdue jamás llega a analytics ni a los webhooks salientes que lo anuncian como parte del subset público. Consumidores externos que se suscriban a invoice.paid/invoice.overdue esperarán eventos que nunca llegan, y el handler de email para invoice.overdue (modules/notifications/email-subscriber.ts:118) es código muerto.

**Recomendación:** Decidir por tipo: (a) emitir invoice.overdue desde markInvoicesOverdue vía emitEvent en tx (alineando con el patrón outbox-driven de Fase 5), (b) retirar payment.authorized e invoice.paid del subset público de webhooks y documentar en el ADR/runbook que están reservados, o emitirlos donde corresponde. No dejar el contrato público anunciando eventos imposibles.

### ARQ-3 · [P2] Violaciones de la regla de módulos cerrados (imports profundos saltando index.ts) sin enforcement automatizado  *(esfuerzo S)*

**Evidencia:** `app/(account)/account/password-actions.ts:9 (import '@/modules/payments/step-up'), scripts/process-search-index-queue.ts:3 (import '@/modules/search/index-queue'), modules/quotes/conversion.ts:7 (import '@/modules/orders/orderNumber')`

**Detalle:** Las 3 violaciones importan símbolos que SÍ están exportados por el index.ts del módulo (verificado en modules/payments/index.ts, modules/search/index.ts, modules/orders/index.ts), así que son triviales de corregir — pero demuestran que la convención #2 de CLAUDE.md no tiene guardia: ni Biome ni ningún lint rule valida fronteras de módulos, y la erosión ya empezó. Esto importa porque la regla existe explícitamente para habilitar el refactor a packages en Fase 6.

**Recomendación:** Corregir los 3 imports para usar el barrel del módulo, y agregar enforcement: un test de arquitectura (script que grep-ea imports '@/modules/x/...' desde fuera de modules/x y falla CI) o dependency-cruiser. Sin guardia automática la regla seguirá erosionándose.

### ARQ-4 · [P2] Ciclos de dependencia entre módulos de dinero enmascarados con 6 dynamic imports, sin ADR que documente el patrón  *(esfuerzo M)*

**Evidencia:** `modules/payments/service.ts:39,398 (await import('@/modules/accounts')), modules/orders/service.ts:114-116 (await import accounts + events), modules/cart/service.ts:19 y modules/checkout/service.ts:77 (await import('@/modules/verification')); mapa de acoplamiento: orders depende de 6 módulos (customers, catalog, cart, approvals, accounts, events)`

**Detalle:** El grafo estático muestra que payments→orders y orders→accounts→notifications→events forman casi-ciclos que se rompen con `await import()` en caliente dentro de transacciones de dinero. El patrón funciona pero es frágil: no hay documentación de por qué cada dynamic import existe, un import estático accidental (que typecheck no detecta como problema) puede introducir un ciclo real de inicialización, y el barrel events/subscribers.ts crea un ciclo estático intencional (events↔notifications/webhooks/accounting/analytics) que solo es seguro porque únicamente los scripts worker lo importan. Además orders/ se está convirtiendo en hub god-module.

**Recomendación:** Documentar el patrón en un ADR corto (qué ciclos existen, por qué dynamic import y no inversión). Mediano plazo: invertir las dependencias payments/orders→accounts vía el bus de eventos (invoice.issued ya viaja por ahí) en lugar de llamadas síncronas lazy, que es la dirección que la propia Fase 5 instaló.

### ARQ-5 · [P2] Eventos de dominio atascados en PROCESSING no tienen recuperación automática — el camino contable/email depende de que un humano corra SQL manual  *(esfuerzo S)*

**Evidencia:** `modules/events/dispatcher.ts:36 (marca PROCESSING al claim); scripts/cleanup-domain-events.ts (solo borra DONE/FAILED viejos, no resetea PROCESSING); docs/runbooks/event-bus.md:15-16 (recuperación = UPDATE manual); contraste: scripts/cleanup-stale-search-queue.ts:7 SÍ resetea PROCESSING stale para la cola de search`

**Detalle:** Si el worker process-domain-events muere entre el claim (status=PROCESSING) y el update final, esos eventos quedan huérfanos para siempre: ningún tick posterior los retoma (el claim filtra WHERE status='PENDING'). Como payment.captured/payment.reconciled alimentan el ledger, los emails y los webhooks salientes, un crash silencioso congela asientos contables sin alerta — el runbook dice 'alarma si PROCESSING > 100' pero no existe ninguna alarma implementada, solo una query sugerida. La asimetría con la cola de search (que sí tiene cleanup de stale PROCESSING semanal) indica que es un olvido, no una decisión.

**Recomendación:** Clonar el patrón de cleanup-stale-search-queue: agregar al inicio de dispatchPending (o como script cron) un reset de DomainEvent PROCESSING con occurredAt > N minutos a PENDING. Es seguro porque las entregas son idempotentes por (eventId, subscriber).

### ARQ-6 · [P2] Preparación Fase 6 incompleta: marca, copy de dominio y reglas de negocio Pi-Power hardcodeadas fuera de stores/  *(esfuerzo M)*

**Evidencia:** `lib/maintenance/page-html.ts:13-58 (título 'PiPower', logo-pipower.png y verde #88D810 hardcodeados); middleware.ts:30,72 (asset /logo-pipower.png en el matcher); lib/i18n/messages.ts:428-433,812-833 (copy de landing batería/iPhone en el diccionario global compartido); modules/shipments/service.ts:32-35 (HAZMAT_LIMITS maxCells=8/maxWattHours=80 específicos de baterías iPhone como constante de código); components/commerce/ChatWidget.tsx:94 (placeholder EN hardcodeado con ejemplo iPhone, sin i18n)`

**Detalle:** ADR 0035 promete 'tienda nueva = otra paleta sin rebuild de código', y eso es cierto para config+theme, pero una segunda tienda hoy heredaría: la página de mantenimiento de PiPower, el matcher de middleware con su logo, todo el copy de landing sobre baterías/iPhone (el diccionario i18n es global, no por tienda), los límites hazmat de litio aplicados a cualquier producto, y el placeholder del chat. El principio 'dominio-como-datos' (citado en ADR 0020/CLAUDE.md) está cumplido en attributes/compatibleModels de Product, pero no en estas superficies.

**Recomendación:** Antes de la segunda tienda: mover branding de maintenance/middleware a identity del store.config (logo ya existe en el schema), namespacing del copy de landing por tienda (bloque marketing en store.config o stores/<id>/messages.ts), y llevar HAZMAT_LIMITS a un bloque shipping.hazmat opcional del config. No hace falta hacerlo ya — pero presupuestarlo como parte real del costo de la tienda #2.

### ARQ-7 · [P3] markPaid en accounts es código muerto que, si se reusa, salta el ledger y el bus de eventos  *(esfuerzo S)*

**Evidencia:** `modules/accounts/invoices.ts:115-160 (markPaid: muta Invoice + creditUsed + notifica, sin emitEvent ni postEntry); grep de callers: solo el export en modules/accounts/index.ts:1 y labels i18n — el flujo real usa reconcileWire (app/admin/_actions-fase2.ts:87)`

**Detalle:** Tras el plan unify-wire-payment, markInvoicePaidAction rutea por reconcileWire (que emite payment.reconciled → asiento contable + settlement idempotente). markPaid quedó exportado pero sin caller, y su semántica es peligrosa: marca PAID y decrementa creditUsed sin generar evento ni asiento — si un dev futuro lo reusa creyendo que es el camino canónico, la cuenta 1100 (receivable) queda sin limpiar en el ledger y analytics/webhooks no se enteran.

**Recomendación:** Eliminar markPaid (y su export) o reescribirlo como wrapper de reconcileWire. Dejar comentario en accounts/index.ts apuntando a reconcileWire como único camino de settlement.

### ARQ-8 · [P3] SQL crudo con interpolación de strings en dispatcher y generadores de números — valores internos hoy, patrón riesgoso mañana  *(esfuerzo S)*

**Evidencia:** `modules/events/dispatcher.ts:27-33 (LIMIT ${batchSize} interpolado en $queryRawUnsafe), modules/orders/orderNumber.ts:14-19 (seqName interpolado en $executeRawUnsafe y $queryRawUnsafe)`

**Detalle:** batchSize viene de opts programáticos y seqName se deriva de Date.getFullYear(), así que no hay inyección explotable hoy. Pero el patrón $queryRawUnsafe-con-template-literal en módulos críticos es exactamente el que un cambio futuro (ej: batchSize desde query param de un endpoint admin) convierte en inyección SQL. Prisma soporta parámetros posicionales en los mismos métodos.

**Recomendación:** Pasar batchSize como parámetro posicional ($1) y validar/clampear como entero; para seqName, validar con regex ^[a-z_0-9]+$ antes de interpolar. Costo trivial, elimina la clase de bug.

## Tensiones estratégicas (decide el owner)

- Chatbot público vs precio gated: el bot anónimo tiene valor de discovery/SEO conversacional, pero ADR 0034 dice que el precio mayorista es solo para orgs VERIFIED. Herney debe decidir el comportamiento: chat anónimo sin precios (recomendado, espejo de la PDP), o chat solo para logueados verificados.
- Costo real de la tienda #2 (Fase 6): ADR 0035 vende 'otra paleta sin rebuild', pero copy de landing, página de mantenimiento, middleware y reglas hazmat son código Pi-Power. Decidir si extraer eso a dominio-como-datos AHORA (inversión sin segunda tienda a la vista — riesgo de abstracción prematura que el propio ADR 0035 rechazó) o aceptar que la tienda #2 cuesta días de refactor y documentarlo.
- Contrato de eventos v1 'congelado' con tipos muertos: mantener payment.authorized/invoice.paid/invoice.overdue declarados como forward-compat (y retirarlos del subset público de webhooks) vs cablearlos de verdad (markInvoicesOverdue por el bus). Afecta qué pueden prometer los webhooks salientes a integradores externos.
- Append-only enforcement sigue siendo solo app-level: el rol Postgres app_rw del ADR 0033 está en pendientes ops, y el guard se bypasea con APPEND_ONLY_GUARD=off o psql directo. Decidir si provisionar app_rw es bloqueante de launch o post-launch aceptado (el ledger es la fuente de KPIs financieros).
- El bus de eventos solo corre en cron de 1 min sin alerting real: aceptable hoy (emails/asientos con latencia de minutos), pero el runbook promete alarmas que no existen. Decidir umbral de observabilidad mínima pre-launch (ej: health check que cuente PROCESSING/FAILED) vs confiar en revisión manual.
