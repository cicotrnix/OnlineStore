# Auditoría de área — Testing y CI

**Semáforo:** 🔴 Rojo

## Veredicto

La suite (438 tests) es genuinamente buena en invariantes de dinero a nivel unitario/integración: doble partida con property test, idempotencia de webhook por eventId, replay, reconcile wire idempotente y step-up OTP exhaustivo. Pero los fixtures de todos los tests de pago crean órdenes vía prisma.order.create saltándose placeOrder, lo que oculta un doble decremento de stock en el flujo real placeOrder→pago (card y wire) — un P0 que la suite verde no puede ver. Además ningún e2e completa una compra: el flujo de cobro nunca se ha ejecutado end-to-end, y CI no corre coverage ni audit de dependencias. El semáforo es rojo por el bug activo de inventario/dinero no detectado, no por falta de cultura de testing.

## Fortalezas confirmadas

- **Invariantes contables y de pago probadas de verdad, no solo happy paths**
  - Evidencia: `modules/accounting/__tests__/posting.test.ts:92-113 (property test 100 iteraciones debitos=creditos en las 4 POSTING_RULES), posting.test.ts:46-64 (idempotencia por eventId), posting.test.ts:66-89 (bloqueo de posteo en período CLOSED), modules/payments/__tests__/service.test.ts:120-136 (replay de webhook no duplica stock ni payment.captured), service.test.ts:153-176 (reconcileWire idempotente por wireReference), modules/accounting/__tests__/integrity.test.ts:98-270 (trial balance end-to-end vía bus: card, wire, refund card y refund wire todos netean a 0)`
- **Step-up OTP para refunds probado en profundidad (negativos incluidos)**
  - Evidencia: `modules/payments/__tests__/step-up.test.ts:32-120 (OTP incorrecto, subject mismatch, token single-use, 5 intentos fallidos → BLOCKED y el OTP válido ya no funciona)`
- **Selector tests prueban los adaptadores REALES contra SDK/fetch mockeado, no solo los fakes**
  - Evidencia: `lib/stripe/__tests__/selector.test.ts:40-96 (RealStripe pasa idempotencyKey al SDK, verifyWebhook delega a constructEvent, fallback a Fake si falta una env var), lib/fedex/__tests__/selector.test.ts:38-142 (OAuth + idempotency header + rechazo export), lib/storage/__tests__/r2.test.ts:46-94, lib/analytics/__tests__/selector.test.ts:24-80, tests/inert-without-keys.test.ts:46-75 (deploy inerte sin claves)`
- **Tests de integración contra Postgres real (SQL crudo, locks y transacciones de verdad) y CI completo con pgvector + migraciones + seed + Playwright**
  - Evidencia: `.github/workflows/ci.yml:13-135 (postgres pgvector service, prisma migrate deploy, lint+typecheck+test+build, job e2e con seed y artifacts), vitest.config.ts:13 (fileParallelism:false sobre una DB compartida)`
- **Existe al menos un test de concurrencia real en generación de orderNumber**
  - Evidencia: `modules/orders/orderNumber.test.ts:27-31 (50 llamadas concurrentes sin colisión vía Promise.all)`

## Hallazgos

### TST-1 · [P0] Doble decremento de stock en el flujo real placeOrder→pago (card y wire); invisible para los 438 tests porque todos los fixtures de pago se saltan placeOrder  *(esfuerzo M)*

**Evidencia:** `modules/orders/service.ts:64-69 (placeOrder decrementa stock) + :77 (crea orden PENDING_PAYMENT); modules/payments/service.ts:282-300 (webhook capture decrementa OTRA VEZ si order.status === 'PENDING_PAYMENT') y :376-389 (reconcileWire ídem); app/(account)/orders/_actions.ts:34-43 (el botón de pago con tarjeta exige exactamente PENDING_PAYMENT); modules/payments/__tests__/service.test.ts:42-67, app/api/webhooks/stripe/__tests__/route.test.ts:38-63 y app/admin/__tests__/mark-invoice-paid-action.test.ts:83-91 crean la orden con prisma.order.create directo, nunca vía placeOrder`

**Detalle:** El flujo real del comprador es: checkout → placeOrder (decrementa stock, status PENDING_PAYMENT) → paga con tarjeta o wire → handleStripeWebhook/reconcileWire ve PENDING_PAYMENT y vuelve a decrementar. Cada orden pagada descuenta el inventario dos veces. Peor: si el stock restante es menor que la cantidad al momento de la captura, la tx del webhook lanza 'insufficient stock at capture' → el webhook devuelve error → Stripe reintenta y falla siempre → dinero capturado en Stripe con Payment en PENDING y orden sin confirmar. La suite entera está verde porque ningún test de dinero ejercita la cadena placeOrder→webhook; el comentario en payments/service.ts:283 ('Re-usamos la convención de Fase 1') sugiere que el autor del webhook asumió que el stock no se descontaba al placement.

**Recomendación:** 1) Reproducir con un test de integración que encadene checkoutService.confirm → createCardCheckout → webhook firmado y aserte stockQuantity (caerá en rojo). 2) Decidir la semántica (reservar al colocar vs descontar al capturar) y eliminar uno de los dos decrementos. 3) Regla de suite: todo test de pago debe construir la orden por el camino productivo (placeOrder), no por prisma crudo.

### TST-2 · [P1] stripeIntentId solo se guarda al crear la sesión; con Stripe real puede venir vacío y el flujo de refund queda roto — el fake y el mock del selector ocultan el caso  *(esfuerzo S)*

**Evidencia:** `lib/stripe/index.ts:155-159 (fallback paymentIntentId ?? '' en RealStripe.createCheckoutSession); modules/payments/service.ts:101-105 (stripeIntentId se persiste al crear y el handler de checkout.session.completed nunca lo backfillea desde el evento); :148-155 (charge.refunded busca Payment por stripeIntentId); :252-254 (auto-refund se salta si stripeIntentId es falsy); lib/stripe/index.ts:64 (FakeStripe siempre genera pi_...); lib/stripe/__tests__/selector.test.ts:43-47 (el mock asume payment_intent presente en la creación)`

**Detalle:** En Stripe real con mode:'payment', session.payment_intent es típicamente null al crear la Checkout Session (se crea cuando el cliente paga); el propio código lo admite con el fallback a ''. Si eso ocurre: charge.refunded no encuentra el Payment ('unknown payment'), refundPayment lanza 'payment has no stripe intent', y el auto-refund por mismatch se salta silenciosamente. Ningún test cubre el path stripeIntentId='' porque tanto FakeStripe como el mock del selector garantizan un pi_ no vacío — es el caso de libro de 'el fake hace algo que el real no garantiza'. Nota: el evento checkout.session.completed real SÍ incluye payment_intent, así que el fix es backfillear ahí.

**Recomendación:** Backfillear stripeIntentId desde obj.payment_intent en el happy path del webhook (modules/payments/service.ts:~277) y agregar un test donde createCheckoutSession devuelve paymentIntentId='' y el ciclo capture→refund sigue funcionando. Hacer que FakeStripe pueda simular payment_intent null en la creación.

### TST-3 · [P1] Ningún e2e completa una compra: checkout de comprador, pago Stripe, verificación B2B (upload de certificado) y refund con OTP no tienen cobertura end-to-end  *(esfuerzo M)*

**Evidencia:** `Output de grep sobre tests/e2e/*.spec.ts (38 tests): los títulos son navegación anónima, gates de auth, búsqueda, SEO y visibilidad; el único e2e de dinero es tests/e2e/wire-payment.spec.ts:141-223 (admin mark-paid), que seedea la orden vía prisma.order.create (:89-114) y no aserta stock; tests/e2e/buyer-flow.spec.ts es solo navegación de /cart y /orders`

**Detalle:** Para un negocio cuyo core es que compradores B2B paguen pedidos, ningún e2e ejecuta: (a) cart → checkout wizard → placeOrder por la UI; (b) startCardCheckoutAction → redirect a Stripe → webhook → orden CONFIRMED; (c) onboarding de verificación: subir tax doc → org VERIFIED → gate de checkout se abre (solo unit: modules/verification/__tests__/gate.test.ts:59-82); (d) refund con step-up OTP (además refundPayment no tiene call-site en app/ — grep solo encontró password-actions.ts usando step-up). El e2e de wire es el mejor del repo (idempotencia + creditUsed) pero al seedear por Prisma no habría detectado TST-1.

**Recomendación:** Antes del launch, agregar como mínimo: e2e de compra completa con FakeStripe (la firma HMAC del fake permite simular el webhook con un POST desde el test), y e2e del gate de verificación vía UI. El refund queda condicionado a que exista UI de refund (decisión de owner, ver tensions).

**Verificación adversarial:** ✅ CONFIRMADO — prioridad ajustada: **P1**
> Intenté refutar el hallazgo y no pude: cada pieza de evidencia es exacta. (1) El conteo es correcto: 38 test() en 11 specs bajo tests/e2e/, y los títulos son navegación anónima, gates de auth, búsqueda, SEO y visibilidad de catálogo privado. (2) tests/e2e/wire-payment.spec.ts es el único e2e de dinero: el test está en :141-223, seedea org/orden/invoice vía prisma.order.create exactamente en :89-114 (bypaseando cart→checkout→placeOrder), y no hay ninguna aserción de stock (solo seedea stockQuantity: 10, nunca lo re-verifica). (3) tests/e2e/buyer-flow.spec.ts es solo navegación: visita /cart y /orders y aserta visibilidad de header/link — cero add-to-cart, cero checkout. (4) Grep de checkout|stripe|webhook|refund|otp|tax|verif en tests/e2e/ no encuentra ningún e2e de los 4 flujos citados; los hits de "verif" son solo seeding de emailVerified/verificationStatus. (5) El gate solo tiene test de integración en modules/verification/__tests__/gate.test.ts:59-82, tal como se cita. (6) refundPayment efectivamente no tiene call-site en app/ ni components/ (solo exportado en modules/payments/index.ts), y el step-up en app/ solo lo consume app/(account)/account/password-actions.ts — confirmado literal. Esto incluso agrava el punto: el flujo refund+OTP no puede tener e2e porque ni siquiera está cableado a UI. Las superficies sí existen y están shippeadas (app/(storefront)/checkout, app/api/webhooks/stripe/route.ts), así que no es cobertura de código muerto. Prioridad P1 correcta, no inflada: proyecto en launch-hardening pre-lanzamiento, el flujo core de revenue nunca se ejecuta end-to-end, y la capa UI/sesión tiene historial demostrado de bugs (buyer-flow.spec.ts es en sí un test de regresión de un bug de wiring activeOrgId que rompió /cart — clase de bug que los tests de módulo no detectan). No es P0 porque no hay defecto vivo conocido y la cobertura de integración inferior es sólida.
>
> Evidencia extra: `Matiz que el auditor subestimó (no cambia el veredicto): la mitigación por debajo del e2e es más fuerte que "solo unit". Son tests de integración contra Postgres real: modules/checkout/service.test.ts, modules/payments/__tests__/service.test.ts (handleStripeWebhook con FakeStripe HMAC: firma inválida, happy path, dedup), modules/payments/__tests__/refund.test.ts y step-up.test.ts, modules/verification/__tests__/service.test.ts (upload), y además app/api/webhooks/stripe/__tests__/route.test.ts cubre el route handler HTTP del webhook — capa que el hallazgo da por descubierta a nivel ruta. Lo que falta es estrictamente la capa browser/UI/server-action/sesión. Dato adicional que refuerza el hallazgo: el propio wire-payment.spec.ts documenta en su comentario de cabecera (:20-22) "Known limitation: the test seeds its own invoice/order via Prisma directly" — el equipo ya era consciente del bypass. Y la referencia cruzada a TST-1 no es verificable desde aquí, pero el punto estructural se sostiene: seedear por Prisma hace invisible cualquier regresión en cart→checkout→creación de orden. Hallazgo accionable concreto extra: refundPayment sin call-site significa que el refund por UI es un gap de producto, no solo de testing — conviene separarlo como ítem propio.`

### TST-7 · [P1] FakeStripe queda activo en producción si faltan claves: el endpoint público de webhook aceptaría payloads firmados con 'whsec_fake' y marcaría pagos CAPTURED; la suite consagra ese fallback como correcto  *(esfuerzo S)*

**Evidencia:** `lib/stripe/index.ts:52 (signingSecret default 'whsec_fake' conocido en el código fuente), :85-93 (verifyWebhook con comparación !== no constant-time), :185-195 (selector cae al fake si falta STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET); tests/inert-without-keys.test.ts:58-62 asegura el fallback pero ningún test verifica que /api/webhooks/stripe quede deshabilitado cuando el adaptador real no está configurado`

**Detalle:** Un deploy 'inerte sin claves' no es inerte para el webhook: cualquiera puede firmar un checkout.session.completed con HMAC-sha256 y el secret default público, y el handler ejecuta la máquina de captura completa (CAPTURED + CONFIRMED + stock + eventos contables). El riesgo concreto requiere además un Payment PENDING existente (creado vía startCardCheckoutAction, gated por flag payments.stripe.enabled), pero es exactamente el tipo de invariante de seguridad-de-dinero que la suite debería fijar: 'sin claves reales, el endpoint de webhook responde 503/404'. Hoy los tests prueban lo contrario (que el fake procesa webhooks correctamente). Solapa con el área de seguridad — aquí se reporta el hueco de testing.

**Recomendación:** Decidir el comportamiento (deshabilitar la ruta cuando getStripeClient() es el fake fuera de NODE_ENV test/development) y fijarlo con un test del route handler. Mientras tanto, usar timingSafeEqual en el fake.

### TST-4 · [P2] El guard append-only (control de integridad financiera, ADR 0033) tiene cero cobertura: todos los tests lo apagan globalmente  *(esfuerzo S)*

**Evidencia:** `tests/setup.ts:4 (process.env.APPEND_ONLY_GUARD = 'off' para toda la suite); lib/db/client.ts:12-34 (guard sobre JournalEntry/JournalLine/PaymentEvent/AuditLog); grep de APPEND_ONLY_GUARD en el repo solo devuelve esos 2 archivos — ningún test lo ejercita`

**Detalle:** El mecanismo que impide UPDATE/DELETE sobre el ledger y los PaymentEvent — la garantía de que la contabilidad es append-only — nunca corre en tests. Una regresión (typo en la lista de modelos, cambio en la extensión de Prisma, una operación nueva como upsert variant) pasaría CI en verde. Es un control de dinero protegido solo por lectura de código.

**Recomendación:** Test dedicado que construya un PrismaClient con el guard activo (sin tocar el global de cleanDb) y aserte que update/delete/upsert sobre los 4 modelos lanzan APPEND_ONLY_VIOLATION y que create sigue funcionando.

### TST-5 · [P2] CI sin coverage threshold ni audit de dependencias; el claim 'coverage >80% en módulos críticos' no se verifica en ninguna parte  *(esfuerzo S)*

**Evidencia:** `.github/workflows/ci.yml:58-70 (steps: lint, typecheck, test, build — nunca test:coverage); vitest.config.ts:14-17 (coverage configura reporters pero sin thresholds); ls .github/ muestra solo workflows/ci.yml (no hay dependabot.yml); ningún step de pnpm audit en ci.yml`

**Detalle:** CLAUDE.md afirma 'Coverage en módulos críticos > 80%' pero nada lo mide ni lo bloquea: el coverage puede degradarse indefinidamente sin que CI se entere. Tampoco hay escaneo de vulnerabilidades de dependencias (pnpm audit, Dependabot o Renovate) en un stack con Stripe, Auth.js beta (next-auth 5.0.0-beta.31) y SDKs de pago — relevante pre-launch.

**Recomendación:** Agregar thresholds por-módulo en vitest.config.ts (al menos modules/payments, accounting, orders, checkout) + step 'pnpm test:coverage' en CI, y un dependabot.yml o step 'pnpm audit --prod --audit-level=high'.

### TST-6 · [P2] Los e2e corren contra 'pnpm dev', nunca contra el build de producción  *(esfuerzo S)*

**Evidencia:** `playwright.config.ts:33-38 (webServer: command 'pnpm dev'); .github/workflows/ci.yml:69-70 compila el build en el job test pero el job e2e (:126-127) levanta dev server vía la config de Playwright`

**Detalle:** El artefacto que se despliega (next build + next start) jamás se ejecuta en testing: caching de RSC/fetch en prod, headers, comportamiento de middleware compilado y errores de runtime solo-producción son invisibles. El build se compila en CI pero nunca se arranca ni recibe una request.

**Recomendación:** En CI, cambiar el webServer de Playwright a 'pnpm build && pnpm start' (o un script ci-only), manteniendo dev para local con reuseExistingServer.

### TST-8 · [P2] Idempotencia y locks de dinero probados solo en secuencial: no hay tests de concurrencia para webhook doble, placeOrder paralelo agotando stock, ni workers FOR UPDATE SKIP LOCKED  *(esfuerzo M)*

**Evidencia:** `modules/payments/__tests__/service.test.ts:120-136 (replay secuencial await→await, no Promise.all); modules/orders/service.test.ts:115-132 (stock insuficiente solo secuencial); único test concurrente del repo: modules/orders/orderNumber.test.ts:27-31; el dedup pre-tx de handleStripeWebhook (modules/payments/service.ts:135-136) + row lock (:266-273) protege la carrera post-dup-check pero nadie lo ejercita con dos webhooks simultáneos`

**Detalle:** Las defensas concurrentes existen en el código (FOR UPDATE en Payment, SQL atómico con stockQuantity >= qty, FOR UPDATE SKIP LOCKED en dispatcher/colas) pero los tests solo validan replays secuenciales. La ventana entre el findUnique de dedup y la tx es real bajo dos requests simultáneas de Stripe (que sí reintenta en paralelo); hoy la protección depende del row lock que ningún test toca en condición de carrera.

**Recomendación:** Tests con Promise.all: 2 handleStripeWebhook simultáneos con el mismo eventId → stock baja una vez y un solo payment.captured; N placeOrder paralelos sobre stock=1 → exactamente 1 éxito; 2 processIndexQueue/dispatchPending paralelos → sin doble entrega.

### TST-9 · [P3] Los 6 tests skipped son customers/service.test.ts gated por RUN_INTEGRATION: corren en CI pero se saltan silenciosamente en local (incluida la corrida de gates de hoy)  *(esfuerzo S)*

**Evidencia:** `modules/customers/service.test.ts:5 (const runIntegration = process.env.RUN_INTEGRATION === '1'), :11 y :110 (describe.skipIf con 4 + 2 its = 6 tests: crear org con owner, invitar con token único, aceptar invitación, rechazar invitación expirada, crear address, listar addresses); .github/workflows/ci.yml:65-67 (RUN_INTEGRATION: '1' solo en CI); docs/audit/2026-06-12/gate-test.txt:75-76 ('100 passed | 1 skipped', '438 passed | 6 skipped')`

**Detalle:** Cubren tenancy/membership/invitaciones (incluido el caso negativo de invitación expirada) — riesgo bajo porque CI sí los corre. Pero el gate es un vestigio de Fase 0: hoy TODOS los demás tests pegan a la DB sin condición, así que la única función del flag es que las corridas locales (como los gates de esta auditoría) reporten verde sin ejecutar 6 tests de auth/tenancy. 'Verde local' y 'verde CI' no son la misma suite.

**Recomendación:** Eliminar el gate RUN_INTEGRATION (los tests ya no tienen nada de especial frente al resto de la suite) o documentar en CLAUDE.md que el comando de test local debe incluir RUN_INTEGRATION=1.

## Tensiones estratégicas (decide el owner)

- Semántica de inventario a decidir por el owner antes de arreglar TST-1: ¿el stock se RESERVA al colocar la orden (decrement en placeOrder, el webhook no toca stock) o se descuenta solo al capturar el pago (riesgo de oversell durante los días que tarda un wire)? Para B2B con wire/NET terms la reserva al placement parece correcta, pero entonces órdenes PENDING_PAYMENT abandonadas retienen stock indefinidamente y hoy no existe job de expiración que lo libere.
- El flujo de refund existe en modules/payments (step-up OTP completo y testeado) pero refundPayment no tiene ningún call-site en app/ — no hay UI de refund. Decidir si el launch incluye refunds operables desde admin o se manejan desde el dashboard de Stripe; en el segundo caso el webhook charge.refunded se vuelve el único camino y TST-2 (stripeIntentId vacío) pasa de P1 a bloqueante.
- Costo/beneficio del e2e de pago real: mantener un e2e con Stripe test-mode (stripe-cli listen en CI) es fricción permanente, pero lanzar sin haber ejecutado jamás el flujo de cobro end-to-end (hoy es el caso) es un riesgo que ya materializó un P0. Mínimo viable: e2e contra FakeStripe simulando el webhook con POST firmado.
- Política 'deploy inerte sin claves' (filosofía multi-tenant de la plantilla, Fase 6): definir si rutas que mueven dinero (webhook Stripe) deben quedar deshabilitadas cuando el adaptador real no está configurado, o si el fake-en-producción es aceptable. Hoy los tests consagran el fallback al fake como comportamiento deseado sin esa distinción.
- El gate de coverage: imponer thresholds ahora (fricción en el rediseño UI en curso, donde componentes nuevos bajan el porcentaje global) vs thresholds por-directorio solo en modules/ de dinero (payments, accounting, orders, checkout) — la segunda opción protege lo crítico sin frenar el rediseño.
