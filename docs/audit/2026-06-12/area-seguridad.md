# Auditoría de área — Seguridad y dinero

**Semáforo:** 🔴 Rojo

## Veredicto

La arquitectura PSDD (webhook como única fuente de verdad, dedup por eventId, row locks, mismatch→NEEDS_REVIEW, step-up OTP) está bien construida y mayormente implementada como dice docs/psa-checklist.md. Sin embargo existe un P0 de dinero activo hoy: el stock se decrementa DOS veces por orden pagada (una en placeOrder y otra en la captura del webhook/reconcileWire) — los tests no lo detectan porque crean las órdenes sin pasar por placeOrder. Además, el hardening del ledger (rol app_rw) está pendiente y el script SQL preparado tiene errores de sintaxis que lo harían fallar, y no hay headers de seguridad/CSP en ninguna parte. Stripe live solo necesita 3 env vars (el adaptador real ya existe), pero falta un fail-fast que impida que producción caiga silenciosamente al FakeStripe forjable.

## Fortalezas confirmadas

- **PSDD webhook hardening real: firma antes de tocar DB, dedup por eventId UNIQUE, row lock FOR UPDATE, re-check de status, stock atómico condicional, mismatch → NEEDS_REVIEW + AuditLog + auto-refund**
  - Evidencia: `modules/payments/service.ts:122-136 (verifyWebhook + dedup), :266-273 (FOR UPDATE + status check), :292-299 (UPDATE ... WHERE stockQuantity >= $1), :227-257 (mismatch tx + auditLog + auto-refund); prisma/schema.prisma:836 (eventId @unique)`
- **Adaptador RealStripe ya implementado (checklist §11 está desactualizado): SDK oficial con constructEvent (timing-safe), idempotency keys estables, refund solo marca REFUND_PENDING hasta charge.refunded firmado**
  - Evidencia: `lib/stripe/index.ts:118-178 (RealStripe + webhooks.constructEvent), :185-195 (selector por STRIPE_SECRET_KEY+STRIPE_WEBHOOK_SECRET); modules/payments/refund.ts:25-64 (REFUND_PENDING, key estable refund-${paymentId})`
- **Step-up OTP sólido: crypto.randomInt, solo hashes SHA-256 en DB, TTL 10min, scope (userId, action, subjectId), single-use vía status USED, lockout tras 5 intentos**
  - Evidencia: `modules/payments/step-up.ts:19-20 (TTL+MAX_OTP_ATTEMPTS), :37-48 (randomBytes/randomInt + hashes), :65-91 (single-use, scope, lockout)`
- **Las 3 tools del chatbot AI aplican filterForOrg (visibilidad B2B) y pricing resuelto por org; search tiene defense-in-depth con filterAccessibleIds post-RRF**
  - Evidencia: `modules/ai/chat/tools.ts:78,103,126 (filterForOrg en searchProducts/getProductDetail/checkCompatibility) y :53-63 (resolveForOrgSafe); modules/search/access.ts:32-48`
- **Impersonation gateada a isPlatformAdmin, con ImpersonationLog START/STOP y auto-expiración 30min server-side**
  - Evidencia: `lib/auth/actions.ts:40-65 (gate + log START), lib/auth/maintain.ts:5,30-48 (timeout 30min + log STOP auto-expired)`
- **Login con password: bcrypt cost 12, DUMMY_HASH anti-timing cuando el usuario no existe, email normalizado, rate limit por ip+email**
  - Evidencia: `lib/auth/password.ts:3-27; app/(auth)/sign-in/password-actions.ts:29-40`
- **Sin secretos hardcodeados ni .env trackeado en git; acciones de dinero admin (reconcileWire) gateadas por requirePlatformAdmin con verificación en DB**
  - Evidencia: `grep -rE 'sk_live|whsec_|AKIA...' → solo lib/stripe/__tests__/selector.test.ts; git ls-files solo .env.example y git check-ignore .env.local → IGNORED; app/admin/_actions-fase2.ts:32-40,77-95`

## Hallazgos

### PAY-1 · [P0] P0 DINERO: doble decremento de stock por cada orden pagada (placeOrder + captura)  *(esfuerzo M)*

**Evidencia:** `modules/orders/service.ts:64-69 (placeOrder decrementa stock y deja status PENDING_PAYMENT en :77); modules/payments/service.ts:282-300 (webhook checkout.session.completed decrementa OTRA vez si order.status === 'PENDING_PAYMENT') y :376-390 (reconcileWire idem). Los tests no lo ven porque crean la orden directamente sin placeOrder: modules/payments/__tests__/service.test.ts:42-67. Flujo real confirmado: checkout.confirm → placeOrder (modules/checkout/service.ts:74-89) → startCardCheckoutAction (app/(account)/orders/_actions.ts:34-43) → webhook.`

**Detalle:** Cada orden pagada (wire hoy, tarjeta cuando se active Stripe) descuenta el inventario dos veces. Peor: si el stock restante es menor que la cantidad al momento de la captura, el webhook lanza 'insufficient stock at capture' → rollback de toda la tx (incluido el PaymentEvent) → 500 → Stripe reintenta para siempre: dinero capturado en Stripe pero Payment queda PENDING y la orden nunca se confirma. En el flujo wire activo hoy, markInvoicePaidAction falla o descuenta doble. Es un bug de integridad de dinero/inventario activo en producción.

**Recomendación:** Decidir el punto único de reserva de stock (recomendado: reservar en placeOrder y ELIMINAR el decremento en handleStripeWebhook/reconcileWire, que solo deben validar y confirmar). Agregar un test E2E que recorra placeOrder→webhook con el flujo real y verifique stock decrementado exactamente una vez. Agregar cron que cancele PENDING_PAYMENT viejas restaurando stock.

### PAY-2 · [P1] FakeStripe forjable puede quedar activo en producción sin fail-fast (fallback silencioso si falta una env var)  *(esfuerzo S)*

**Evidencia:** `lib/stripe/index.ts:52 (signingSecret = STRIPE_WEBHOOK_SECRET ?? 'whsec_fake'), :85-93 (verifyWebhook HMAC con ese default y comparación !== no timing-safe), :185-195 (selector cae a FakeStripe si falta CUALQUIERA de las dos claves); el endpoint es público y exento de maintenance mode: middleware.ts:25 y app/api/webhooks/stripe/route.ts:24-30. Mitigante actual: stores/pipower/store.config.ts:43 stripe.enabled=false.`

**Detalle:** Si producción arranca con las env vars Stripe incompletas (typo en Coolify, rotación fallida), el selector degrada silenciosamente a FakeStripe cuyo secreto HMAC por defecto ('whsec_fake') es público en el repo: cualquiera podría forjar un webhook firmado y marcar pagos CAPTURED / órdenes CONFIRMED sin pagar, o forzar REFUNDED. Hoy está dormido porque no existen Payments con stripeSessionId, pero es una mina pre-launch. Para Stripe live faltan exactamente: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY (no usada aún en código), STRIPE_WEBHOOK_SECRET, endpoint en el Dashboard con checkout.session.completed + payment_intent.payment_failed + charge.refunded (ojo: psa-checklist.md:113 omite charge.refunded, que el código sí procesa en modules/payments/service.ts:129), y flag payments.stripe.enabled=true.

**Recomendación:** En getStripeClient(): si NODE_ENV==='production' (o si getStoreConfig().payments.stripe.enabled) y no hay claves → throw al boot, nunca FakeStripe. Agregar STRIPE_* a .env.example (hoy no están). Corregir psa-checklist §10 para incluir charge.refunded y §11 que dice que solo existe FakeStripe.

### LED-1 · [P1] Append-only burlable: guard Prisma no intercepta $executeRaw/$queryRaw, APPEND_ONLY_GUARD=off sin guard de prod, y el script SQL de app_rw (la 'última línea de defensa') tiene errores que lo hacen fallar  *(esfuerzo S)*

**Evidencia:** `lib/db/client.ts:19 (APPEND_ONLY_GUARD==='off' desactiva todo sin chequear NODE_ENV), :20-37 (extensión solo sobre $allModels — las operaciones raw no pasan por model ops); ops/sql/2026-06-01-create-app-rw-role.sql:28-34 (:'app_rw_password' dentro de DO $$...$$ — psql NO interpola variables dentro de literales dollar-quoted) y :37 (GRANT CONNECT ON DATABASE current_database() — sintaxis inválida, GRANT exige identificador) — ambos abortan la transacción; docs/psa-checklist.md:132 confirma que el rol sigue pendiente de ejecutar.`

**Detalle:** El enforcement append-only del ledger (JournalEntry/JournalLine/PaymentEvent/AuditLog) depende 100% del guard en el cliente Prisma: cualquier código (o dependencia comprometida) puede hacer prisma.$executeRawUnsafe('UPDATE "JournalEntry" ...') sin que el guard lo vea — de hecho el propio módulo de pagos ya usa $executeRawUnsafe para otras tablas (modules/payments/service.ts:266). La defensa a nivel DB (rol app_rw) no existe aún, y cuando Herney intente correr el script preparado va a fallar por los dos errores de sintaxis: nunca fue probado contra un Postgres real. Además, si APPEND_ONLY_GUARD=off se copia por accidente al entorno de prod (está en tests/setup.ts), el guard desaparece en silencio.

**Recomendación:** 1) Corregir el SQL: crear el rol fuera del DO block (psql \set + CREATE ROLE plano) y usar GRANT CONNECT con el nombre de DB literal o \gexec; probarlo contra el Postgres local. 2) Ejecutarlo en prod antes del launch y cambiar DATABASE_URL a app_rw. 3) En lib/db/client.ts: ignorar (o throw) APPEND_ONLY_GUARD=off cuando NODE_ENV==='production'.

### PAY-3 · [P1] reconcileWire: colisión de eventId con referencia vacía/repetida → segunda conciliación se descarta en silencio con toast de éxito  *(esfuerzo S)*

**Evidencia:** `app/admin/_actions-fase2.ts:80-92 (wireReference viene de paidNote opcional, puede ser '' tras trim) → modules/payments/service.ts:346-348 (eventId = `wire-${wireReference}`, dup → return silencioso); prisma/schema.prisma:836 (PaymentEvent.eventId @unique GLOBAL, no por orden).`

**Detalle:** Si el admin marca pagadas dos facturas distintas con la nota vacía (o reutiliza la misma referencia bancaria), la primera genera eventId 'wire-' y la segunda hace match con el dup-check y retorna sin hacer NADA: la orden no se confirma, el stock no se mueve, la invoice no se liquida, no se postea al ledger — pero el admin ve 'admin.toast.invoicePaid'. Estado financiero silenciosamente inconsistente en el único flujo de cobro activo hoy.

**Recomendación:** Hacer la idempotencia por orden: eventId = `wire-${orderId}-${wireReference}`; validar wireReference no vacío en el server action (y en reconcileWire); si el dup-check matchea pero el orderId difiere → throw en vez de no-op.

### SEC-1 · [P1] Cero headers de seguridad: sin CSP, HSTS, X-Frame-Options ni Referrer-Policy en toda la app  *(esfuerzo S)*

**Evidencia:** `next.config.mjs:1-12 (sin headers()); grep -rn 'Content-Security-Policy|X-Frame-Options|Strict-Transport' sobre *.ts/*.tsx/*.mjs → 0 resultados (solo se setea Cache-Control puntual).`

**Detalle:** Storefront B2B con sesiones de cookie, panel /admin con acciones de dinero (reconcileWire, credit limits) y un chat widget que renderiza output de LLM: sin X-Frame-Options/frame-ancestors el admin es enmarcable (clickjacking sobre server actions), sin CSP cualquier XSS tiene vía libre de exfiltración, sin HSTS se permite downgrade. Es de las brechas más baratas de cerrar antes del launch.

**Recomendación:** Agregar async headers() en next.config.mjs: CSP (al menos default-src 'self' + ajustes para Next/Stripe), X-Frame-Options: DENY (o frame-ancestors 'none'), HSTS, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy mínima. Validar contra el redesign en curso.

### PAY-4 · [P2] payment_intent.payment_failed sin guard de estado: un evento tardío/out-of-order pisa CAPTURED → FAILED  *(esfuerzo S)*

**Evidencia:** `modules/payments/service.ts:204-218 — update a FAILED sin row lock ni chequeo de status actual (a diferencia del happy path :266-273 y del refund :180-185); charge.refunded tampoco verifica que el payment estuviera CAPTURED (:174-200).`

**Detalle:** Stripe entrega eventos at-least-once y sin orden garantizado. Un payment_failed de un intento previo que llegue (con eventId distinto) después del checkout.session.completed marca el Payment como FAILED aunque el dinero esté capturado y la orden CONFIRMED — estado contable/operativo contradictorio. Análogamente, un charge.refunded forjado/anómalo sobre un payment PENDING lo marcaría REFUNDED y emitiría payment.refunded al ledger sin captura previa.

**Recomendación:** En el branch payment_failed: tomar el mismo row lock y solo transicionar PENDING→FAILED (ignorar si CAPTURED/REFUNDED). En charge.refunded: exigir status CAPTURED o REFUND_PENDING antes de marcar REFUNDED.

### SEC-2 · [P2] Rate limiting in-memory: se resetea en cada deploy/restart, no se comparte entre instancias y la clave por IP es spoofeable vía X-Forwarded-For  *(esfuerzo M)*

**Evidencia:** `lib/rate-limit.ts:6 (Map en memoria del proceso), :27-29 (evicción FIFO de la mitad de buckets, no LRU real); claves derivadas del primer hop de x-forwarded-for controlable por el cliente: app/(auth)/sign-in/password-actions.ts:29, app/api/ai/chat/route.ts:24-25, app/(storefront)/search/page.tsx:34-35.`

**Detalle:** Para brute-force de password (pwlogin:${ip}:${email}) un atacante rota el primer valor de XFF (Traefik por defecto appendea, no reemplaza el header entrante) y obtiene intentos ilimitados; cada restart de Coolify también borra los contadores. El costo de AI chat (Anthropic tokens) y Voyage queda igualmente sub-protegido. Aceptable como single-VPS de launch, pero la decisión debe ser consciente y el XFF debería al menos tomarse del último hop confiable.

**Recomendación:** Corto plazo: configurar el proxy para sobrescribir XFF y/o usar el header del proxy de confianza; añadir lockout por email persistido en DB para login. Mediano plazo (multi-tenant Fase 6): mover a un backend compartido (Redis/Postgres) detrás de la misma interfaz checkRateLimit.

### SEC-3 · [P2] consumeSensitiveActionToken no es atómico (TOCTOU): doble consumo concurrente posible; comparación de hashes no timing-safe  *(esfuerzo S)*

**Evidencia:** `modules/payments/step-up.ts:61-97 — lee el row, valida status ISSUED y luego hace update a USED en una operación separada sin condición de status (no usa updateMany({where:{id, status:'ISSUED'}})); :80-91 incremento de otpAttempts read-modify-write no atómico; :80 comparación de hash con !== (no crypto.timingSafeEqual).`

**Detalle:** Dos requests concurrentes con el mismo token+OTP válidos pueden ambas leer status=ISSUED y ambas retornar true → el 'single-use' se vuelve doble-use bajo carrera. El impacto real está amortiguado porque refundPayment es idempotente por idempotency key, pero el token se usa también para password change (app/(account)/account/password-actions.ts:145) y futuras acciones sensibles (closePeriod). El compare no-timing-safe sobre digests SHA-256 es de riesgo práctico bajísimo pero gratis de arreglar.

**Recomendación:** Consumir con updateMany({ where: { id, status: 'ISSUED' }, data: { status: 'USED', usedAt } }) y exigir count===1; incrementar otpAttempts con { increment: 1 } atómico; usar timingSafeEqual sobre los buffers de hash.

### PAY-5 · [P2] Webhook para Payment desconocido responde HTTP 200 → Stripe no reintenta y el evento se pierde  *(esfuerzo S)*

**Evidencia:** `modules/payments/service.ts:169-172 retorna { ok:false, reason:'unknown payment' } sin throw; app/api/webhooks/stripe/route.ts:29-30 responde ese resultado con status 200.`

**Detalle:** Existe una ventana real: createCardCheckout crea la sesión en Stripe ANTES de upsertear el Payment (modules/payments/service.ts:83-106); si el webhook llega antes del commit (o hay lag de réplica/fallo transitorio), Stripe recibe 200 y nunca reintenta → pago capturado en Stripe sin captura local, sin PaymentEvent persistido y sin alerta. Recuperable solo con resend manual desde el Dashboard.

**Recomendación:** Responder 404/500 para 'unknown payment' (Stripe reintenta con backoff hasta 3 días) o encolar el evento crudo para reproceso. Loguear a Sentry con nivel error, no warn.

### PAY-6 · [P2] NEEDS_REVIEW sin superficie de admin ni cola de revisión; auto-refund del mismatch no se reintenta si la llamada a Stripe falla  *(esfuerzo M)*

**Evidencia:** `grep NEEDS_REVIEW en app/ → solo comentarios en app/api/webhooks/stripe/route.ts:20,37 (ninguna página/listado admin); modules/payments/service.ts:251-254 — el auto-refund corre DESPUÉS de la tx que ya persistió el PaymentEvent, así que el retry de Stripe cae en el dedup de :135-136 ('duplicate') y el refund jamás se reintenta.`

**Detalle:** Si client.refund() falla (red, API down), queda dinero del cliente capturado en Stripe con Payment en NEEDS_REVIEW y ningún mecanismo automático ni humano lo resuelve: no hay vista admin que liste NEEDS_REVIEW/FAILED, y refundPayment ni siquiera está cableado a ninguna UI (grep refundPayment en app/ → 0 callers). El runbook de payments depende de intervención por consola.

**Recomendación:** Agregar a /admin una vista de Payments filtrable por NEEDS_REVIEW/FAILED/REFUND_PENDING con acción de refund (con step-up, ya implementado). Mover el auto-refund a un job reintentable (outbox ya existente) o marcar un flag refundPending que un cron procese.

### OPS-1 · [P2] Sin cron que cancele órdenes PENDING_PAYMENT viejas: el stock reservado en placeOrder queda secuestrado indefinidamente  *(esfuerzo S)*

**Evidencia:** `modules/orders/service.ts:64-69,77 (placeOrder decrementa stock y deja PENDING_PAYMENT); ls scripts/ → existen cleanup-stale-quote-drafts, mark-invoices-overdue, etc., pero grep PENDING_PAYMENT en scripts/ → 0 resultados.`

**Detalle:** Cualquier comprador (u org verificada maliciosa) puede vaciar el inventario visible colocando órdenes wire que nunca paga: el stock se decrementa al placement y nada lo libera. En B2B mayorista con SKUs de alto valor esto es un DoS de inventario barato y también ensucia el forecast.

**Recomendación:** Script cron cancel-stale-pending-orders.ts (patrón ya establecido en scripts/) que cancele PENDING_PAYMENT > N días vía ordersService.cancel (ya restaura stock) y emita notificación. Definir N según términos wire (ej. 7 días).

### AUTHZ-1 · [P3] Impersonation: las acciones ejecutadas durante la sesión impersonada no quedan en ImpersonationLog y el admin puede colocar órdenes reales por la org  *(esfuerzo M)*

**Evidencia:** `lib/auth/customer.ts:32 (orgId efectivo = impersonatingOrgId ?? activeOrgId — todo el flujo de carrito/checkout funciona impersonando); lib/auth/actions.ts:54-61 y lib/auth/maintain.ts:40-47 (solo se loguea START/STOP, nunca qué se hizo); Order solo guarda placedByUserId (modules/orders/service.ts:76) sin marca de impersonation.`

**Detalle:** Un platform admin impersonando puede colocar una orden (pasivo financiero real para la org cliente) y la orden resultante es indistinguible de una colocada por el cliente: placedByUserId será el del admin, pero no hay flag 'vía impersonation' ni correlación con el ImpersonationLog. Para disputas B2B ('yo no ordené esto') la trazabilidad es débil. Refunds no son alcanzables vía impersonation (requieren step-up del propio admin y no hay UI), lo cual está bien.

**Recomendación:** Marcar las órdenes/acciones de escritura creadas bajo impersonation (campo o AuditLog con sessionId + ImpersonationLog correlacionado) y mostrar el badge en /admin/orders. Considerar bloquear checkout.confirm bajo impersonation salvo razón explícita.

### ARQ-1 · [P3] Violación de frontera de módulo: password-actions importa modules/payments/step-up directamente (no vía index) y acopla auth a payments  *(esfuerzo S)*

**Evidencia:** `app/(account)/account/password-actions.ts:9 — import { consumeSensitiveActionToken, issueSensitiveActionToken } from '@/modules/payments/step-up' (la convención de CLAUDE.md exige importar solo desde modules/<name>; además step-up es un mecanismo genérico viviendo dentro de payments)`

**Detalle:** El mecanismo de step-up auth ya se usa para cambio de password y está previsto para closePeriod; tenerlo dentro de modules/payments con import profundo rompe la regla de módulos cerrados y complicará el split a packages en Fase 6.

**Recomendación:** Mover step-up a modules/security (o lib/auth/step-up) y reexportar desde payments para compatibilidad; corregir el import profundo.

## Tensiones estratégicas (decide el owner)

- Semántica de reserva de stock (decisión de negocio detrás del P0 PAY-1): ¿reservar inventario al colocar la orden (protege al comprador, permite DoS de inventario por órdenes wire impagas) o decrementar solo a la captura del pago (riesgo de oversell entre placement y pago)? La elección define dónde se elimina el decremento duplicado y si hace falta TTL de reserva.
- Fricción vs control en acciones de dinero del admin: reconcileWire/markInvoicePaid mueven estado financiero solo con isPlatformAdmin, sin step-up OTP (que sí se exige para refunds y closePeriod). ¿Se acepta el riesgo por velocidad operativa del único admin actual, o se uniformiza step-up para toda mutación de dinero antes de delegar el rol?
- Impersonation con poder transaccional: hoy un admin impersonando puede colocar órdenes reales (pasivo financiero) por la org cliente. ¿Es una herramienta de soporte deseada (ordenar por teléfono en nombre del cliente) que solo necesita mejor auditoría, o debe ser read-only + carrito sin confirm?
- Estrategia de rate limiting pre-Fase 6: in-memory es razonable para un solo VPS, pero la plantilla multi-tenant con múltiples instancias lo invalida. ¿Invertir ya en backend compartido (Redis) o aceptar la deuda y documentar el límite?
- Kill-switches por env var (APPEND_ONLY_GUARD=off, fallback FakeStripe/FakeStorage sin claves): la convención noop-safe es excelente para DX/demo, pero en producción cada fallback silencioso es una degradación de seguridad invisible. ¿Se adopta una política de fail-fast en NODE_ENV=production para todos los fakes, sacrificando la facilidad de levantar un prod 'demo'?
- Orden de ejecución pre-launch del hardening DB: correr el script app_rw exige ventana de mantenimiento y cambiar DATABASE_URL; hacerlo antes del launch es más barato que después, pero compite con el rediseño UI en el roadmap. El script además debe arreglarse y probarse primero (LED-1).
